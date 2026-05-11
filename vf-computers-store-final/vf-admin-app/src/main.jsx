import React,{useEffect,useMemo,useState}from"react";import{createRoot}from"react-dom/client";import{LogIn,LogOut,PackagePlus,RefreshCw,Search,Trash2,Pencil,Save,ImagePlus,ShoppingBag,Wrench,ShieldCheck,X}from"lucide-react";import{supabase}from"./supabaseClient";import"./style.css";

const STORAGE_BUCKET="product-images";
const categories=["Gaming PC","Компютри","Рам Памет","Реновирана техника","Видеокарти","Процесори","SSD / HDD","Лаптопи","Монитори","Периферия"];
const formatPrice=(v)=>new Intl.NumberFormat("bg-BG",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v||0));

async function uploadImages(files){
  const uploaded=[];
  for(const file of files){
    const safe=file.name.replaceAll(" ","-").toLowerCase();
    const fileName=`${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
    const {error:uploadError}=await supabase.storage.from(STORAGE_BUCKET).upload(fileName,file,{upsert:false});
    if(uploadError)throw uploadError;
    const {data}=supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    uploaded.push(data.publicUrl);
  }
  return uploaded;
}

function App(){
  const[session,setSession]=useState(null),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[notice,setNotice]=useState(""),[tab,setTab]=useState("products"),[products,setProducts]=useState([]),[orders,setOrders]=useState([]),[tickets,setTickets]=useState([]),[query,setQuery]=useState(""),[saving,setSaving]=useState(false),[imageFiles,setImageFiles]=useState([]),[imagePreviews,setImagePreviews]=useState([]),[editingId,setEditingId]=useState(null),[form,setForm]=useState({title:"",category:"Gaming PC",price:"",stock:"1",description:""});

  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session||null));const{data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s||null));return()=>l.subscription.unsubscribe()},[]);
  useEffect(()=>{if(session)loadAll()},[session]);

  const login=async()=>{setNotice("");const{error}=await supabase.auth.signInWithPassword({email,password});if(error)setNotice("Грешен имейл или парола. Създай админ потребител в Supabase Auth.")};
  const logout=async()=>{await supabase.auth.signOut();setSession(null)};
  const loadAll=async()=>Promise.all([loadProducts(),loadOrders(),loadTickets()]);
  const loadProducts=async()=>{const{data,error}=await supabase.from("products").select("*").order("created_at",{ascending:false});if(error){console.error(error);setNotice("Не успях да заредя продуктите. Провери Supabase policies.");return}setProducts(data||[])};
  const loadOrders=async()=>{const{data}=await supabase.from("orders").select("*").order("created_at",{ascending:false});setOrders(data||[])};
  const loadTickets=async()=>{const{data}=await supabase.from("service_tickets").select("*").order("created_at",{ascending:false});setTickets(data||[])};
  const updateForm=(f,v)=>setForm(c=>({...c,[f]:v}));

  const handleProductImagesSelect=(e)=>{
    const selected=Array.from(e.target.files||[]);
    const limited=selected.slice(0,10);
    setImageFiles(limited);
    setImagePreviews(limited.map(file=>URL.createObjectURL(file)));
    if(selected.length>10)setNotice("Можеш да качиш максимум 10 снимки за един артикул.");
    else setNotice("");
  };

  const resetForm=()=>{
    setEditingId(null);
    setImageFiles([]);
    setImagePreviews([]);
    setForm({title:"",category:"Gaming PC",price:"",stock:"1",description:""});
  };

  const saveProduct=async()=>{
    if(!form.title.trim()||!form.price){setNotice("Попълни поне име и цена.");return}
    setSaving(true);setNotice("");
    try{
      let imgs=[];
      if(imageFiles.length>0){
        imgs=await uploadImages(imageFiles);
      }else if(editingId){
        const existing=products.find(p=>p.id===editingId);
        imgs=Array.isArray(existing?.images)&&existing.images.length>0?existing.images:(existing?.image?[existing.image]:[]);
      }
      const payload={title:form.title,description:form.description,price:Number(form.price),category:form.category,stock:Number(form.stock||0),image:imgs[0]||"",images:imgs};
      if(editingId){
        const{error}=await supabase.from("products").update(payload).eq("id",editingId);
        if(error)throw error;
        setNotice("Продуктът е редактиран успешно.");
      }else{
        const{error}=await supabase.from("products").insert(payload);
        if(error)throw error;
        setNotice("Продуктът е добавен успешно.");
      }
      resetForm();
      await loadProducts();
    }catch(e){
      console.error(e);
      setNotice("Грешка: "+(e.message||JSON.stringify(e)));
    }finally{
      setSaving(false);
    }
  };

  const startEdit=p=>{
    setEditingId(p.id);
    setImageFiles([]);
    setImagePreviews(Array.isArray(p.images)&&p.images.length>0?p.images:p.image?[p.image]:[]);
    setForm({title:p.title||"",category:p.category||"Компютри",price:p.price||"",stock:p.stock??"1",description:p.description||""});
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const deleteProduct=async p=>{
    if(!confirm(`Да изтрия ли "${p.title}"?`))return;
    const{error}=await supabase.from("products").delete().eq("id",p.id);
    if(error){setNotice("Не успях да изтрия продукта. Провери Supabase delete policy.");return}
    loadProducts();
  };

  const filtered=useMemo(()=>products.filter(p=>`${p.title||""} ${p.category||""} ${p.description||""}`.toLowerCase().includes(query.toLowerCase())),[products,query]);

  if(!session)return <div className="login-page"><div className="login-card"><div className="logo-box">VF</div><h1>VF Admin App</h1><p>Отделно приложение за управление на магазина.</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Админ имейл"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Парола"/>{notice&&<div className="notice">{notice}</div>}<button onClick={login}><LogIn size={18}/>Вход</button><small>Достъп само за потребители, създадени в Supabase Auth.</small></div></div>;

  return <div className="admin-app"><aside className="sidebar"><div className="brand"><div className="logo-box">VF</div><div><b>VF Admin</b><span>Control Center</span></div></div><button className={tab==="products"?"active":""} onClick={()=>setTab("products")}><PackagePlus/>Продукти</button><button className={tab==="orders"?"active":""} onClick={()=>setTab("orders")}><ShoppingBag/>Поръчки</button><button className={tab==="service"?"active":""} onClick={()=>setTab("service")}><Wrench/>Сервиз</button><button className={tab==="warranty"?"active":""} onClick={()=>setTab("warranty")}><ShieldCheck/>Гаранции</button><div className="spacer"/><button className="logout" onClick={logout}><LogOut/>Изход</button></aside><main className="main"><header className="topbar"><div><h1>Админ приложение</h1><p>Публичният сайт вече няма админ бутон.</p></div><button onClick={loadAll}><RefreshCw size={18}/>Обнови</button></header>{notice&&<div className="notice wide">{notice}</div>}
{tab==="products"&&<><section className="form-card"><div className="section-title"><h2>{editingId?"Редакция на продукт":"Нов продукт"}</h2>{editingId&&<button className="clear-btn" onClick={resetForm}><X size={16}/>Отказ</button>}</div><div className="form-grid"><label>Име на продукта<input value={form.title} onChange={e=>updateForm("title",e.target.value)} placeholder="Gaming PC Ryzen 5 RTX 4060"/></label><label>Категория<select value={form.category} onChange={e=>updateForm("category",e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Цена (€)<input type="number" value={form.price} onChange={e=>updateForm("price",e.target.value)}/></label><label>Наличност<input type="number" value={form.stock} onChange={e=>updateForm("stock",e.target.value)}/></label><label className="wide">Описание<textarea value={form.description} onChange={e=>updateForm("description",e.target.value)} placeholder="Ryzen 5, 16GB RAM, 1TB NVMe..."/></label><label className="wide file-label"><ImagePlus/>Снимки на продукта / максимум 10<input type="file" accept="image/*" multiple onChange={handleProductImagesSelect}/></label>{imagePreviews.length>0&&<div className="admin-image-preview-grid">{imagePreviews.map((preview,index)=><div className="admin-image-preview" key={`${preview}-${index}`}><img src={preview} alt={`Преглед ${index+1}`}/>{index===0&&<span>Основна</span>}</div>)}</div>}</div><button className="save-btn" onClick={saveProduct} disabled={saving}><Save size={18}/>{saving?"Записване...":editingId?"Запази промените":"Добави продукт"}</button></section><section className="list-card"><div className="list-head"><div><h2>Продукти</h2><p>{filtered.length} показани</p></div><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Търси продукт..."/></div></div><div className="product-list">{filtered.length===0?<p className="empty">Няма продукти.</p>:filtered.map(p=><div className="product-row" key={p.id}>{(Array.isArray(p.images)&&p.images.length>0?p.images[0]:p.image)?<img src={(Array.isArray(p.images)&&p.images.length>0?p.images[0]:p.image)} alt={p.title}/>:<div className="no-img">IMG</div>}<div className="info"><b>{p.title}</b><p>{p.category} • {formatPrice(p.price)} • наличност: {p.stock}</p><small>{p.description}</small></div><div className="row-actions"><button onClick={()=>startEdit(p)}><Pencil size={16}/>Редакция</button><button className="danger" onClick={()=>deleteProduct(p)}><Trash2 size={16}/>Изтрий</button></div></div>)}</div></section></>}
{tab==="orders"&&<section className="list-card"><h2>Поръчки</h2><div className="product-list">{orders.length===0?<p className="empty">Няма поръчки.</p>:orders.map(o=><div className="product-row" key={o.id}><div className="no-img">#{o.id}</div><div className="info"><b>{o.customer_name||"Клиент"}</b><p>{o.phone} • {formatPrice(o.total||0)}</p><small>{Array.isArray(o.items)?o.items.map(i=>`${i.name} x${i.quantity}`).join(", "):"Няма продукти"}</small></div></div>)}</div></section>}
{tab==="service"&&<section className="list-card"><h2>Сервизни заявки</h2><div className="product-list">{tickets.length===0?<p className="empty">Няма сервизни заявки.</p>:tickets.map(t=><div className="product-row" key={t.id}><div className="no-img">SV</div><div className="info"><b>{t.device}</b><p>{t.customer_name} • {t.phone} • {t.status}</p><small>{t.problem}</small></div></div>)}</div></section>}
{tab==="warranty"&&<section className="list-card"><h2>Гаранции</h2><p className="empty">Гаранциите се изчисляват от поръчките. В следваща версия може да добавим серийни номера и срокове.</p></section>}</main></div>
}

createRoot(document.getElementById("root")).render(<App/>);
