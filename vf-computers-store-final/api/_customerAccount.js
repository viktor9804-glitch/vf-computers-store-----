import { ApiError, assertAllowedKeys } from './_serverSecurity.js';
export const HISTORY_PAGE_SIZE=25;
export const CUSTOMER_ORDER_FIELDS='id,order_number,items,subtotal,vat,shipping,total,payment_method,payment_label,status,payment_status,created_at,loyalty_spent_points,loyalty_discount,order_source';
export const CUSTOMER_WARRANTY_FIELDS='id,order_id,order_number,warranty_number,product_name,serial_number,warranty_months,starts_at,ends_at,status,created_at,items';
export function historyOffset(query) {
  assertAllowedKeys(query,new Set(['action','offset']));
  const text=String(query.offset??'0');
  if(!/^\d{1,7}$/.test(text)) throw new ApiError(400,'INVALID_PAGE','Невалидна страница.');
  return Number(text);
}
export async function customerHistory(db,user,action,offset=0){
  if(!user?.id || user.is_anonymous) throw new ApiError(401,'REGISTERED_ACCOUNT_REQUIRED','Влез в регистриран клиентски профил.');
  const warranties=action==='warranties';
  const {data,error}=await db.from(warranties?'vf_customer_warranties':'orders')
    .select(warranties?CUSTOMER_WARRANTY_FIELDS:CUSTOMER_ORDER_FIELDS)
    .eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false})
    .range(offset,offset+HISTORY_PAGE_SIZE);
  if(error) throw new ApiError(503,'HISTORY_UNAVAILABLE','Историята временно не е достъпна. Опитай отново.');
  const rows=data||[];
  return {items:rows.slice(0,HISTORY_PAGE_SIZE),nextOffset:rows.length>HISTORY_PAGE_SIZE?offset+HISTORY_PAGE_SIZE:null};
}
