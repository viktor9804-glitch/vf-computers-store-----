import {ApiError,createServerSupabase,enforceRateLimit,publicApiError,sendJson,validateRequestSize} from './_serverSecurity.js';
import {buildTrustedOrder,validateOrderBody} from './_orderCore.js';
import {quoteOrder} from './_loyalty.js';
import mobileHandler from './_mobile.js';
const fields='id,order_number,user_id,customer_email,items,subtotal,vat,shipping,total,payment_method,payment_label,status,payment_status,created_at,loyalty_discount,loyalty_spent_points';
export function customerOrderResponse(order,userId){
  if(order.user_id!==userId) throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Идентификаторът на поръчката не е валиден за този профил.');
  return Object.fromEntries(fields.split(',').filter(key=>key!=='user_id').map(key=>[key,order[key]]));
}
export function createOrdersHandler(createDb=createServerSupabase){return async function handler(req,res){
  if(req.method!=='POST')return sendJson(res,405,{error:'Method not allowed'});
  try{
    enforceRateLimit(req,{scope:'create-order',limit:5});validateRequestSize(req,16*1024);
    const {points_to_spend=0,expected_total_cents,...raw}=req.body||{};
    const points=Number(points_to_spend);
    if(!Number.isSafeInteger(points)||points<0||points>2147483647)throw new ApiError(400,'INVALID_POINTS','Невалиден брой точки.');
    const input=validateOrderBody(raw),db=createDb();
    const token=/^Bearer (.+)$/.exec(req.headers?.authorization||'')?.[1];
    let userId=null;
    if(token){const {data,error}=await db.auth.getUser(token);if(error||!data?.user)throw new ApiError(401,'INVALID_SESSION','Влез отново в профила си.');if(!data.user.is_anonymous)userId=data.user.id;}
    if(points>0&&!userId)throw new ApiError(401,'LOGIN_REQUIRED','За използване на точки влез в регистриран профил.');
    async function previous(){const {data,error}=await db.from('orders').select(fields).eq('idempotency_key',input.idempotency_key).maybeSingle();if(error)throw error;return data?customerOrderResponse(data,userId):null;}
    const prior=await previous();if(prior)return sendJson(res,200,{order:prior,idempotent:true});
    if(input.payment_method==='tbi'&&(!process.env.TBI_RESELLER_CODE||!process.env.TBI_RESELLER_KEY||!process.env.TBI_ENCRYPTION_KEY))throw new ApiError(409,'TBI_UNAVAILABLE','TBI финансирането временно не е налично.');
    const trusted=await buildTrustedOrder(db,input,userId);trusted.order_source='website';
    let result;
    if(points>0){
      if(!['cod','bank'].includes(input.payment_method)||input.items.some(item=>item.parts))throw new ApiError(400,'POINTS_PAYMENT_UNAVAILABLE','Точки могат да се използват за стандартни поръчки с наложен платеж или банков превод.');
      const [settings,account]=await Promise.all([db.from('vf_loyalty_settings').select('*').eq('id',true).single(),db.from('vf_loyalty_accounts').select('balance').eq('user_id',userId).maybeSingle()]);
      if(settings.error||account.error)throw new ApiError(503,'LOYALTY_UNAVAILABLE','Точките временно не са достъпни.');
      const quote=quoteOrder(trusted,settings.data,Number(account.data?.balance||0),points);
      if(!Number.isSafeInteger(expected_total_cents)||expected_total_cents!==Math.round(quote.total*100))throw new ApiError(409,'PRICE_CHANGED','Сумата е променена. Провери количката и потвърди отново.');
      result=await db.rpc('vf_mobile_create_order',{p_order:trusted,p_user:userId,p_points:points,p_expected_total_cents:expected_total_cents});
    }else result=await db.from('orders').insert(trusted).select(fields).single();
    if(result.error?.code==='23505'){const duplicate=await previous();if(duplicate)return sendJson(res,200,{order:duplicate,idempotent:true});}
    if(result.error)throw result.error;
    return sendJson(res,201,{order:customerOrderResponse(result.data,userId),idempotent:false});
  }catch(error){const response=publicApiError(error,'Поръчката не може да бъде създадена в момента.');return sendJson(res,response.status,response.body);}
};}
const ordersHandler=createOrdersHandler();
export default function routeOrdersRequest(req,res){
  if(req.query?.vf_mobile==='1'){
    const {vf_mobile,...query}=req.query;
    return mobileHandler({...req,method:req.method,headers:req.headers,body:req.body,query},res);
  }
  return ordersHandler(req,res);
}
