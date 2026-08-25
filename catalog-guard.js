/* Proteção do catálogo: registros administrativos de entrega nunca viram produtos. */
(function(){
  const CFG=window.APP_CONFIG||{};
  const ENDPOINT=String(CFG.ORDER_WEBAPP_URL||'').trim();
  let lastAreasSignature='';

  function catKey(v){return String(v||'').trim().toUpperCase().replace(/[\s_-]+/g,'');}
  function isDeliveryRecord(p){
    const cat=catKey(p?.categoria||p?.category);
    const desc=String(p?.descricao||p?.description||'').toLowerCase();
    const id=String(p?.id||'').toLowerCase();
    return cat==='ENTREGA'||cat==='DELIVERY'||desc.includes('taxa de entrega por bairro')||id.startsWith('delivery-')||id.startsWith('entrega-');
  }
  function isActive(v){return !['false','0','não','nao','inativo','off','indisponível','indisponivel'].includes(String(v??'true').trim().toLowerCase());}
  function moneyBR(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);}

  function removeDeliveryFromCatalog(){
    try{
      if(typeof state!=='undefined'&&Array.isArray(state.products)){
        const clean=state.products.filter(p=>!isDeliveryRecord(p));
        if(clean.length!==state.products.length){
          state.products=clean;
          if(state.category&&catKey(state.category)==='ENTREGA')state.category='Todos';
          try{localStorage.setItem('opeitica:lastProducts',JSON.stringify(clean));}catch(e){}
          if(typeof buildTabs==='function')buildTabs();
          if(typeof renderProducts==='function')renderProducts();
        }
      }
    }catch(e){console.warn('[catalog-guard] limpeza de estado',e)}

    document.querySelectorAll('#categoryTabs button').forEach(btn=>{
      if(catKey(btn.textContent)==='ENTREGA'||String(btn.textContent||'').includes('_ENTREGA_'))btn.remove();
    });
    document.querySelectorAll('.product-card').forEach(card=>{
      const badge=card.querySelector('.category-badge')?.textContent||'';
      const desc=card.querySelector('.description')?.textContent||'';
      if(catKey(badge)==='ENTREGA'||String(desc).toLowerCase().includes('taxa de entrega por bairro'))card.remove();
    });
  }

  function applyAreas(rawProducts){
    const areas=(rawProducts||[]).filter(isDeliveryRecord).map(p=>({
      nome:String(p.nome||p.name||'').trim(),
      fee:Number(p.preco??p.price??0)||0,
      ativo:isActive(p.ativo)
    })).filter(a=>a.nome&&a.ativo).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    if(!areas.length)return;
    const sig=JSON.stringify(areas);
    if(sig===lastAreasSignature)return;
    lastAreasSignature=sig;
    const sel=document.getElementById('deliveryArea');
    if(!sel)return;
    const current=sel.value;
    sel.innerHTML='<option value="">Selecione o bairro da entrega *</option>';
    areas.forEach(a=>{
      const o=document.createElement('option');
      o.value=a.nome;
      o.dataset.fee=String(a.fee);
      o.textContent=`${a.nome} — ${moneyBR(a.fee)}`;
      sel.appendChild(o);
    });
    if([...sel.options].some(o=>o.value===current))sel.value=current;
    sel.onchange=()=>{if(typeof updateTotals==='function')updateTotals();if(typeof persistCustomer==='function')persistCustomer();};
    if(typeof updateTotals==='function')updateTotals();
  }

  async function syncAreas(){
    if(!ENDPOINT)return;
    try{
      const u=new URL(ENDPOINT);u.searchParams.set('action','products');u.searchParams.set('_guard',Date.now());
      const r=await fetch(u.toString(),{cache:'no-store'});
      if(!r.ok)return;
      const j=await r.json();
      if(j?.ok&&Array.isArray(j.products))applyAreas(j.products);
    }catch(e){console.warn('[catalog-guard] bairros',e)}
  }

  function start(){
    removeDeliveryFromCatalog();
    syncAreas();
    const observer=new MutationObserver(removeDeliveryFromCatalog);
    const target=document.getElementById('productGrid')||document.body;
    observer.observe(target,{childList:true,subtree:true});
    const tabs=document.getElementById('categoryTabs');if(tabs)observer.observe(tabs,{childList:true,subtree:true});
    setInterval(removeDeliveryFromCatalog,400);
    setInterval(()=>{if(!document.hidden)syncAreas()},4000);
    window.addEventListener('focus',()=>{removeDeliveryFromCatalog();syncAreas();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){removeDeliveryFromCatalog();syncAreas();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();