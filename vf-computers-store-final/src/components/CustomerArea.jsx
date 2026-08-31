import React, { useEffect, useState } from 'react';
import { Gift, Package, ShieldCheck, RefreshCw } from 'lucide-react';
import './customer-area.css';

const money=value=>new Intl.NumberFormat('bg-BG',{style:'currency',currency:'EUR'}).format(Number(value)||0);
const date=value=>value?new Date(value).toLocaleDateString('bg-BG'):'Не е посочена';
const warrantyStatus=w=>w.ends_at && new Date(`${String(w.ends_at).slice(0,10)}T23:59:59`) < new Date() && (!w.status||w.status==='Активна') ? 'Изтекла' : w.status || 'Издадена';

export default function CustomerArea({ session, request, initialTab='orders', refreshKey=0 }) {
  const userId=session?.user?.id;
  const [tab,setTab]=useState(initialTab),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
  const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const registered=!!userId && !session?.user?.is_anonymous;
  useEffect(()=>{setTab(initialTab);setOffset(0);},[initialTab,userId]);
  useEffect(()=>{
    if(!registered) return;
    let active=true;setBusy(true);setError('');
    const load=tab==='points' ? Promise.all([request('status'),request('account')]).then(([rules,wallet])=>({rules,wallet})) : request(`${tab}&offset=${offset}`);
    load.then(data=>{if(active)setResult(previous=>({owner:userId,tab,...data,items:offset && previous?.owner===userId && previous.tab===tab ? [...previous.items,...(data.items||[])] : data.items||[]}));})
      .catch(err=>{if(active)setError(err.message||'Няма връзка. Опитай отново.');}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[userId,registered,tab,offset,retry,refreshKey,request]);
  const data=result?.owner===userId && result.tab===tab ? result : null;
  function changeTab(value){setTab(value);setOffset(0);setResult(null);}
  if(!registered) return <div className="vf-customer-area"><h3>Личен клиентски профил</h3><p>Влез или се регистрирай, за да виждаш собствените си поръчки, точки и издадени гаранции. Поръчките като гост не се присвояват автоматично по имейл.</p></div>;
  return <section className="vf-customer-area" aria-label="Моят клиентски профил">
    <div className="vf-account-tabs" role="tablist" aria-label="Клиентски секции">{[['orders','Поръчки',Package],['points','Точки',Gift],['warranties','Гаранции',ShieldCheck]].map(([id,label,Icon])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>changeTab(id)}><Icon size={18}/>{label}</button>)}</div>
    <div className="vf-account-heading"><h3>{tab==='orders'?'Моите поръчки':tab==='points'?'Моите точки':'Моите гаранции'}</h3><button type="button" aria-label="Обнови клиентските данни" disabled={busy} onClick={()=>{setOffset(0);setResult(null);setRetry(x=>x+1);}}><RefreshCw size={17}/></button></div>
    {busy && <p role="status">Зареждане на личните данни…</p>}
    {error && <div className="vf-account-error" role="alert">{error}<button onClick={()=>setRetry(x=>x+1)}>Опитай отново</button></div>}
    {!busy && !error && data && tab!=='points' && !data.items.length && <p>{tab==='orders'?'Все още няма поръчки към този профил.':'Все още няма издадени гаранции, свързани с твоите поръчки. Гаранцията се появява след издаване от магазина.'}</p>}
    {tab==='orders' && data?.items?.map(order=><article className="vf-history-card" key={order.id}><div className="vf-card-heading"><b>Поръчка {order.order_number||order.id}</b><span>{order.status}</span></div><p>{date(order.created_at)} · {order.payment_label||order.payment_method}</p><details><summary>Продукти и суми</summary>{(order.items||[]).map((item,index)=><p key={index}>{item.name||item.title||'Продукт'} × {item.quantity}</p>)}<p>Доставка: {money(order.shipping)}</p>{Number(order.loyalty_discount)>0 && <p>Отстъпка с точки: −{money(order.loyalty_discount)}</p>}<p>Плащане: {order.payment_status==='paid'?'Платена':'Очаква потвърждение'}</p></details><strong>{money(order.total)}</strong></article>)}
    {tab==='warranties' && data?.items?.map(w=><article className="vf-history-card" key={w.id}><div className="vf-card-heading"><b>{w.warranty_number?`Гаранция ${w.warranty_number}`:'Издадена гаранция'}</b><span>{warrantyStatus(w)}</span></div><h4>{w.product_name||'Гаранционна карта'}</h4><p>Поръчка {w.order_number||w.order_id}</p>{w.serial_number && <p>Сериен номер: {w.serial_number}</p>}<dl><div><dt>Начална дата</dt><dd>{date(w.starts_at)}</dd></div><div><dt>Валидна до</dt><dd>{date(w.ends_at)}</dd></div>{w.warranty_months>0 && <div><dt>Срок</dt><dd>{w.warranty_months} месеца</dd></div>}</dl>{w.items?.length>0 && <details><summary>Гарантирани продукти ({w.items.length})</summary>{w.items.map(item=><div key={item.id}><h4>{item.product_name}</h4>{item.serial_number&&<p>Сериен номер: {item.serial_number}</p>}<p>Валидна до: {date(item.warranty_end)}</p></div>)}</details>}</article>)}
    {tab==='points' && data?.wallet && <><div className="vf-points-card"><Gift size={28}/><span>VF REWARDS</span><strong>{Number(data.wallet.balance).toLocaleString('bg-BG')}</strong><small>личен баланс точки</small></div>{data.rules.active?<p>За 1 € платени продукти получаваш {data.rules.earn_points_per_euro} точка/и след доставка. 1 точка = {money(data.rules.point_value_cents/100)}. До {data.rules.max_discount_percent}% от следваща покупка.</p>:<p>Програмата за точки още не е активирана.</p>}<p>Точки се трупат само за поръчки, направени с регистриран профил. Доставката не носи точки. Връщанията коригират баланса.</p>{Number(data.wallet.balance)<0 && <p>Балансът е коригиран за върнати продукти. Новите бонуси първо покриват тази разлика.</p>}{data.wallet.ledger?.map(row=><div className="vf-ledger" key={row.id}><div><b>{row.description}</b><small>{date(row.created_at)} · Поръчка {row.order_id}</small></div><strong>{row.points>0?'+':''}{row.points}</strong></div>)}</>}
    {data?.nextOffset!=null && !error && <button className="vf-history-more" disabled={busy} onClick={()=>setOffset(data.nextOffset)}>Зареди още</button>}
  </section>;
}
