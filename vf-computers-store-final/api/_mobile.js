import { createClient } from '@supabase/supabase-js';
import { ApiError, assertAllowedKeys, createServerSupabase, enforceRateLimit, publicApiError, sendJson, validateRequestSize } from './_serverSecurity.js';
import { buildTrustedOrder } from './_orderCore.js';
import { mobileInput, quoteOrder, validateSettlement } from './_loyalty.js';
import { customerHistory, historyOffset } from './_customerAccount.js';

const orderFields='id,order_number,user_id,items,subtotal,vat,shipping,total,payment_method,payment_label,status,payment_status,created_at,loyalty_spent_points,loyalty_discount';
const publicOrder = order => Object.fromEntries(orderFields.split(',').filter(key=>key!=='user_id').map(key=>[key,order[key]]));
async function authenticated(supabase,req) {
  const token = /^Bearer (.+)$/.exec(req.headers?.authorization || '')?.[1];
  if (!token) throw new ApiError(401,'LOGIN_REQUIRED','Влез в профила си.');
  const {data,error}=await supabase.auth.getUser(token);
  if(error||!data?.user) throw new ApiError(401,'INVALID_SESSION','Сесията е изтекла. Влез отново.');
  if(data.user.is_anonymous) throw new ApiError(401,'REGISTERED_ACCOUNT_REQUIRED','Точките и личният профил изискват регистрация.');
  return {user:data.user,token};
}
function cors(req,res) {
  const allowed=new Set(['https://localhost','capacitor://localhost','https://vf-computers.com','https://www.vf-computers.com',...(process.env.MOBILE_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)]);
  const origin=req.headers?.origin;
  if(origin && !allowed.has(origin)) throw new ApiError(403,'ORIGIN_DENIED','Този адрес няма достъп до мобилния сървър.');
  if(origin) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
}
async function settings(supabase) {
  const {data,error}=await supabase.from('vf_loyalty_settings').select('*').eq('id',true).single();
  if(error) throw new ApiError(503,'LOYALTY_UNAVAILABLE','Системата за точки още не е инсталирана.');
  return data;
}
export default async function handler(req,res) {
  try {
    cors(req,res);
    if(req.method==='OPTIONS') return res.status(204).end();
    const action=String(req.query?.action||'');
    if(!['status','account','orders','warranties','quote','order','order-status','settle'].includes(action)) throw new ApiError(404,'NOT_FOUND','Непозната операция.');
    const expectedMethod=['status','account','orders','warranties'].includes(action)?'GET':'POST';
    if(req.method!==expectedMethod) throw new ApiError(405,'METHOD_NOT_ALLOWED','Невалиден метод.');
    enforceRateLimit(req,{scope:`mobile-${action}`,limit:action==='order'?5:60});
    validateRequestSize(req,16*1024);
    const supabase=createServerSupabase();
    if(action==='status') return sendJson(res,200,await settings(supabase));
    const {user,token}=await authenticated(supabase,req);
    if(['orders','warranties'].includes(action)) return sendJson(res,200,await customerHistory(supabase,user,action,historyOffset(req.query)));
    if(action==='order-status') {
      assertAllowedKeys(req.body,new Set(['idempotency_key']));
      if(!/^[A-Za-z0-9_-]{20,100}$/.test(req.body.idempotency_key||'')) throw new ApiError(400,'INVALID_KEY','Невалиден идентификатор.');
      const prior=await supabase.from('orders').select(orderFields).eq('idempotency_key',req.body.idempotency_key).eq('user_id',user.id).maybeSingle();
      if(prior.error) throw prior.error;
      return sendJson(res,200,{order:prior.data?publicOrder(prior.data):null});
    }
    if(action==='account') {
      const [account,ledger]=await Promise.all([
        supabase.from('vf_loyalty_accounts').select('balance').eq('user_id',user.id).maybeSingle(),
        supabase.from('vf_loyalty_ledger').select('id,points,kind,description,created_at,order_id').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
      ]);
      if(account.error||ledger.error) throw new ApiError(503,'ACCOUNT_UNAVAILABLE','Точките не могат да бъдат заредени.');
      return sendJson(res,200,{balance:Number(account.data?.balance||0),ledger:ledger.data||[]});
    }
    if(action==='settle') {
      // is_admin() runs with the caller's JWT, never an editable user_metadata claim.
      const authClient=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_GKoOE2NCrH26dUCOF5sPvg_KYgly3uc',{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
      const check=await authClient.rpc('is_admin');
      if(check.error||check.data!==true) throw new ApiError(403,'ADMIN_REQUIRED','Операцията е само за администратор.');
      const patch=validateSettlement(req.body);
      const result=await supabase.from('orders').update(patch).eq('id',req.body.order_id).select(orderFields).single();
      if(result.error) throw new ApiError(409,'SETTLEMENT_REJECTED','Провери статуса и общата вече възстановена сума.');
      return sendJson(res,200,{order:publicOrder(result.data)});
    }
    const input=mobileInput(req.body,action==='quote');
    // Authenticate BEFORE looking up any idempotent result. No cross-account leakage.
    if(action==='order') {
      const prior=await supabase.from('orders').select(orderFields).eq('idempotency_key',input.order.idempotency_key).maybeSingle();
      if(prior.error) throw prior.error;
      if(prior.data) {
        if(prior.data.user_id!==user.id) throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Невалиден идентификатор за тази поръчка.');
        return sendJson(res,200,{order:publicOrder(prior.data),idempotent:true});
      }
    }
    const trusted=await buildTrustedOrder(supabase,input.order,user.id);
    trusted.order_source='mobile';
    const config=await settings(supabase);
    const account=await supabase.from('vf_loyalty_accounts').select('balance').eq('user_id',user.id).maybeSingle();
    if(account.error) throw account.error;
    const quote=quoteOrder(trusted,config,Number(account.data?.balance||0),input.points);
    if(action==='quote') return sendJson(res,200,quote);
    if(Math.round(quote.total*100)!==input.expectedTotal) throw new ApiError(409,'PRICE_CHANGED','Цената е променена. Провери и потвърди новата сума.');
    const result=await supabase.rpc('vf_mobile_create_order',{p_order:trusted,p_user:user.id,p_points:input.points,p_expected_total_cents:input.expectedTotal});
    if(result.error) {
      const msg=String(result.error.message||'');
      if(msg.includes('INSUFFICIENT_POINTS')) throw new ApiError(409,'INSUFFICIENT_POINTS','Точките вече не са достатъчни. Обнови профила си.');
      if(msg.includes('PRICE_CHANGED')) throw new ApiError(409,'PRICE_CHANGED','Цената е променена. Провери отново.');
      if(msg.includes('DISCOUNT_LIMIT')) throw new ApiError(409,'DISCOUNT_LIMIT','Отстъпката надвишава позволения лимит.');
      throw result.error;
    }
    return sendJson(res,201,{order:publicOrder(result.data),idempotent:false});
  } catch(error) { const response=publicApiError(error,'Заявката не може да се изпълни. Опитай отново.'); return sendJson(res,response.status,response.body); }
}
