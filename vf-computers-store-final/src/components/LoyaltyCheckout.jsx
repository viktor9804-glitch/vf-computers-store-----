import React,{useEffect,useState} from 'react';
import {customerApi} from '../lib/customerApi';
export default function LoyaltyCheckout({session,total,onChange}) {
  const [data,setData]=useState(null),[points,setPoints]=useState('0'),[error,setError]=useState('');
  const owner=session?.user?.id;
  useEffect(()=>{
    let active=true;setData(null);setPoints('0');setError('');onChange(0,0);
    if(!owner||session.user.is_anonymous)return;
    Promise.all([customerApi('status'),customerApi('account')]).then(([rules,wallet])=>{if(active)setData({owner,rules,wallet});}).catch(()=>{if(active)setError('Точките временно не са достъпни. Можеш да поръчаш без отстъпка с точки.');});
    return()=>{active=false;};
  },[owner,total]);
  if(!owner||session?.user?.is_anonymous)return <p className="vf-checkout-loyalty">Влез или се регистрирай преди поръчката, за да трупаш лични точки. Покупките като гост не носят точки.</p>;
  if(error)return <p className="vf-checkout-loyalty">{error}</p>;
  if(!data||data.owner!==owner)return <p className="vf-checkout-loyalty">Проверка на личните точки…</p>;
  if(!data.rules.active)return <p className="vf-checkout-loyalty">Програмата за точки още не е активирана.</p>;
  return <div className="vf-checkout-loyalty"><b>Моите точки: {Math.max(0,Number(data.wallet.balance))}</b><label>Използвай точки за отстъпка<input type="number" min="0" max={Math.max(0,Number(data.wallet.balance))} step="1" value={points} onChange={e=>{const value=e.target.value;setPoints(value);const n=Number(value);if(Number.isSafeInteger(n)&&n>=0&&n<=Math.max(0,Number(data.wallet.balance)))onChange(n,n*data.rules.point_value_cents/100);else onChange(-1,0);}}/></label><small>До {data.rules.max_discount_percent}% от продуктите. Сумата и балансът се проверяват на сървъра. Точките се начисляват след получаване и плащане.</small></div>;
}
