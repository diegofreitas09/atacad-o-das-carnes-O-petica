(function(){
  function enhanceImages(){
    document.querySelectorAll('#productsTable .product-thumb').forEach(img=>{
      if(img.dataset.photoReady==='1') return;
      img.dataset.photoReady='1';
      img.title='Clique para trocar a imagem';
      img.setAttribute('role','button');
      img.setAttribute('tabindex','0');
      img.style.cursor='pointer';
      img.style.outline='2px solid transparent';
      img.style.transition='transform .15s ease, box-shadow .15s ease, outline-color .15s ease';
      const openPhotoEditor=()=>{
        const row=img.closest('tr');
        const edit=row?.querySelector('[data-edit]');
        if(!edit) return;
        edit.click();
        setTimeout(()=>{
          const box=document.querySelector('#productModal .image-box');
          if(box){box.scrollIntoView({behavior:'smooth',block:'center'});box.classList.add('photo-focus');setTimeout(()=>box.classList.remove('photo-focus'),1600);}
        },80);
      };
      img.addEventListener('click',openPhotoEditor);
      img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPhotoEditor();}});
      img.addEventListener('mouseenter',()=>{img.style.transform='scale(1.06)';img.style.boxShadow='0 6px 18px rgba(0,0,0,.18)';});
      img.addEventListener('mouseleave',()=>{img.style.transform='';img.style.boxShadow='';});
    });
  }

  function dateKey(v){if(!v)return'';const d=new Date(v);if(isNaN(d))return String(v).slice(0,10);try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}catch(e){return d.toISOString().slice(0,10)}}
  function todayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function promoIsActive(p){if(!p||!p.promocao||!Number(p.preco_promocional||0))return false;const t=todayKey(),a=dateKey(p.promo_inicio),b=dateKey(p.promo_fim);return(!a||t>=a)&&(!b||t<=b)}
  function phoneKey(v){return String(v||'').replace(/\D/g,'')}
  function customersFromOrders(rows){
    const map=new Map();
    (rows||[]).forEach(o=>{
      const phone=phoneKey(o.telefone);if(!phone)return;
      const old=map.get(phone)||{id:'PED-'+phone,cadastro:o.data||'',nome:o.cliente||'',telefone:phone,endereco:o.endereco||'',bairro:o.bairro||'',referencia:o.referencia||'',ultima_compra:o.data||'',pedidos:0,total:0,status:'ATIVO',_fromOrders:true};
      old.pedidos+=1;old.total+=Number(o.total||0);
      if(new Date(o.data||0)>=new Date(old.ultima_compra||0)){old.ultima_compra=o.data||old.ultima_compra;old.nome=o.cliente||old.nome;old.endereco=o.endereco||old.endereco;old.bairro=o.bairro||old.bairro;old.referencia=o.referencia||old.referencia;}
      map.set(phone,old);
    });
    return [...map.values()];
  }

  async function refreshManagement(){
    try{
      if(typeof adminPin==='undefined'||!adminPin||typeof apiGet!=='function')return;
      let rep=null,cus=null;
      try{rep=await apiGet('report',{pin:adminPin});}catch(e){}
      try{cus=await apiGet('customers',{pin:adminPin});}catch(e){}
      const derived=customersFromOrders(rep?.pedidos||[]);
      if(rep?.ok&&typeof renderReport==='function'){
        rep.clientes=rep.clientes||{};
        const apiCount=(cus?.ok&&Array.isArray(cus.customers))?cus.customers.length:0;
        rep.clientes.cadastrados=Math.max(Number(rep.clientes.cadastrados||0),apiCount,derived.length);
        renderReport(rep);
      }
      if(typeof customers!=='undefined'&&typeof renderCustomers==='function'){
        if(cus?.ok&&Array.isArray(cus.customers)&&cus.customers.length){customers=cus.customers;document.querySelector('.customer-fallback-note')?.remove();}
        else if(derived.length){
          customers=derived;
          const panel=document.getElementById('tab-customers');
          if(panel&&!panel.querySelector('.customer-fallback-note')){const n=document.createElement('div');n.className='customer-fallback-note';n.innerHTML='<strong>Cliente recuperado pelos pedidos.</strong> A aba CLIENTES da planilha ainda precisa da nova versão do Apps Script publicada.';panel.querySelector('.section-title')?.insertAdjacentElement('afterend',n);}
        }
        renderCustomers();
      }
    }catch(e){console.warn('[Gestão auto-refresh]',e)}
  }

  const style=document.createElement('style');
  style.textContent=`
    #productsTable td:first-child{position:relative}
    #productsTable .product-thumb{border:2px solid #fff;box-shadow:0 0 0 1px #e2d4cf}
    #productsTable .product-thumb:hover{outline-color:#a51414}
    #productModal .image-box.photo-focus{border-color:#a51414!important;box-shadow:0 0 0 4px rgba(165,20,20,.12);animation:photoPulse .7s ease 2}
    .customer-fallback-note{margin:0 0 16px;padding:12px 14px;border-radius:12px;background:#fff3cd;border:1px solid #efd27a;color:#684d00;font-size:14px}
    @keyframes photoPulse{50%{transform:scale(1.01)}}
    .period-dashboard article{position:relative;overflow:hidden}.period-dashboard article:after{content:'';position:absolute;right:-18px;bottom:-24px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.035)}
    .promo-pill{box-shadow:0 4px 14px rgba(213,143,0,.18)}
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded',()=>{
    try{if(typeof effectivePromo==='function'){effectivePromo=promoIsActive;setTimeout(()=>{if(typeof renderProducts==='function')renderProducts()},300)}}catch(e){}
    enhanceImages();
    const target=document.getElementById('productsTable');if(target){new MutationObserver(enhanceImages).observe(target,{childList:true,subtree:true});}
    setTimeout(refreshManagement,700);
    setInterval(()=>{if(!document.hidden)refreshManagement()},5000);
    window.addEventListener('focus',refreshManagement);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshManagement()});
  });
})();