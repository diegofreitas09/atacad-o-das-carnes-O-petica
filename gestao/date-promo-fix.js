/* Correção do seletor de datas de promoção no Android - O Peitica Gestão */
(function(){
  const TZ='America/Fortaleza';
  function todayKey(){
    return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }
  function validDateValue(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||'')) && !String(v).startsWith('1970-01-01')}
  function fields(){return {start:document.getElementById('pPromoStart'),end:document.getElementById('pPromoEnd'),promo:document.getElementById('pPromo')}}
  function normalizeFields(forceDefaults=false){
    const {start,end,promo}=fields(); if(!start||!end)return;
    const today=todayKey();
    start.min=today;
    if(!validDateValue(start.value)) start.value='';
    if(!validDateValue(end.value)) end.value='';
    if(forceDefaults && promo?.checked){
      if(!start.value) start.value=today;
      if(!end.value) end.value=start.value||today;
    }
    end.min=start.value||today;
    if(end.value && start.value && end.value<start.value) end.value=start.value;
  }
  function preparePicker(el,type){
    if(!el)return;
    const setDefault=()=>{
      const {start,end,promo}=fields();
      if(!promo?.checked)return;
      const today=todayKey();
      if(type==='start' && !validDateValue(start.value)) start.value=today;
      if(type==='end' && !validDateValue(end.value)) end.value=validDateValue(start.value)?start.value:today;
      normalizeFields(false);
    };
    el.addEventListener('pointerdown',setDefault,{passive:true});
    el.addEventListener('focus',setDefault);
    el.addEventListener('click',setDefault);
  }
  function bind(){
    const {start,end,promo}=fields(); if(!start||!end||!promo)return;
    normalizeFields(false);
    preparePicker(start,'start');
    preparePicker(end,'end');
    promo.addEventListener('change',()=>normalizeFields(promo.checked));
    start.addEventListener('change',()=>{
      normalizeFields(false);
      if(promo.checked && !end.value) end.value=start.value||todayKey();
      normalizeFields(false);
    });
    end.addEventListener('change',()=>normalizeFields(false));

    // O modal é reutilizado. Toda vez que ele abrir, eliminamos datas inválidas/epoch.
    const modal=document.getElementById('productModal');
    if(modal){
      new MutationObserver(()=>{
        if(!modal.hidden) setTimeout(()=>normalizeFields(false),0);
      }).observe(modal,{attributes:true,attributeFilter:['hidden']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();