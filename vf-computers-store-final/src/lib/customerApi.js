import { supabase } from '../supabaseClient';
const base=(import.meta.env.VITE_CUSTOMER_API_URL||'').replace(/\/$/,'');
export async function customerApi(action) {
  const {data}=await supabase.auth.getSession();
  const response=await fetch(`${base}/api/mobile?action=${action}`,{headers:data?.session?.access_token?{Authorization:`Bearer ${data.session.access_token}`}:{},signal:AbortSignal.timeout(20000),cache:'no-store'});
  const result=await response.json().catch(()=>null);
  if(!response.ok || !result) throw new Error(result?.error||'Клиентската секция още не е активирана или временно няма връзка.');
  return result;
}
