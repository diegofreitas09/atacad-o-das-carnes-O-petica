/* Correção robusta do seletor de datas de promoção no Android - O Peitica Gestão */
(function(){
  const TZ='America/Fortaleza';
  function todayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function validDateValue(v){
    const s=String(v||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const y=Number(s.slice(0,4));
    if(y<2020)return false; // elimina qualquer data-epoch (1970 etc.)
    const d=new Date(s+'T12:00:00-03:00');
    return !Number.isNaN(d.getTime());
  }
  function fields(){return {start:document.getElementById('pPromoStart'),end:document.getElementById('pPromoEnd'),promo:document.getElementById('pPromo')}}
  function sanitize(forceDefaults=false){
    const {start,end,promo}=fields();if(!start||!end)return;
    const today=todayKey();
    if(!validDateValue(start.value))start.value='';
    if(!validDateValue(end.value))end.value='';
    start.min=today;
    if(forceDefaults&&promo?.checked){
      if(!start.value)start.value=today;
      if(!end.value)end.value=start.value||today;
    }
    end.min=start.value||today;
    if(end.value&&start.value&&end.value<start.value)end.value=start.value;
  }
  function setBeforePicker(type){
    const {start,end,promo}=fields();if(!start||!end)return;
    const today=todayKey();
    // Mesmo que a promoção ainda não esteja marcada, nunca permita o picker abrir no epoch.
    if(type==='start'&&!validDateValue(start.value))start.value=today;
    if(type==='end'&&!validDateValue(end.value))end.value=validDateValue(start.value)?start.value:today;
    if(promo?.checked)sanitize(true);else sanitize(false);
  }
  function bindInput(el,type){
    if(!el||el.dataset.dateFixBound==='1')return;
    el.dataset.dateFixBound='1';
    ['pointerdown','touchstart','mousedown','focus','click'].forEach(evt=>el.addEventListener(evt,()=>setBeforePicker(type),{passive:true}));
  }
  function bind(){
    const {start,end,promo}=fields();if(!start||!end||!promo)return;
    sanitize(false);bindInput(start,'start');bindInput(end,'end');
    promo.addEventListener('change',()=>sanitize(promo.checked));
    start.addEventListener('change',()=>{sanitize(false);if(promo.checked&&!end.value)end.value=start.value||todayKey();sanitize(false)});
    end.addEventListener('change',()=>sanitize(false));
    const modal=document.getElementById('productModal');
    if(modal){new MutationObserver(()=>{if(!modal.hidden){setTimeout(()=>sanitize(false),0);setTimeout(()=>sanitize(false),80);setTimeout(()=>sanitize(false),250)}}).observe(modal,{attributes:true,attributeFilter:['hidden']})}
    // Defesa extra contra valores 1970 repostos pelo app após abrir o modal.
    setInterval(()=>{if(!document.getElementById('productModal')?.hidden)sanitize(false)},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();