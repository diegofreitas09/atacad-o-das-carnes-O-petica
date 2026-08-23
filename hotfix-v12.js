/* Hotfix v12: inicia cada acesso com cesta nova e força atualização da PWA. */
(function(){
  const CART_KEY='opeitica:carrinho-v1';
  try{localStorage.removeItem(CART_KEY);sessionStorage.removeItem(CART_KEY);}catch(e){}

  function resetBudgetAfterSend(){
    setTimeout(()=>{
      try{localStorage.removeItem(CART_KEY);sessionStorage.removeItem(CART_KEY);}catch(e){}
      try{
        if(typeof state!=='undefined'){
          state.cart=[];
          state.location=null;
          if(typeof updateCart==='function')updateCart();
          if(typeof setFulfillment==='function')setFulfillment('retirada');
        }
      }catch(e){}
    },1200);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.getElementById('finalizeBudgetBtn');
    if(btn)btn.addEventListener('click',resetBudgetAfterSend);

    /* Ícones oficiais via SVG de marca, sem emojis. */
    const wa=document.getElementById('whatsappTop');
    if(wa)wa.innerHTML='<span class="brand-social-icon whatsapp-brand" aria-hidden="true"><svg viewBox="0 0 32 32"><path fill="#fff" d="M16 3C9.1 3 3.5 8.4 3.5 15.1c0 2.3.7 4.6 2 6.5L3 29l7.7-2.4c1.7.9 3.5 1.4 5.3 1.4 6.9 0 12.5-5.4 12.5-12.1S22.9 3 16 3zm0 22.8c-1.7 0-3.4-.5-4.9-1.3l-.4-.2-4.5 1.4 1.5-4.2-.3-.4c-1-1.7-1.6-3.7-1.6-5.8 0-5.5 4.6-10 10.2-10s10.2 4.5 10.2 10-4.6 10.5-10.2 10.5zm5.6-7.7c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.9-1.7.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.3 1.5 3.5c.2.2 2.5 3.7 6 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.8-.7 2.1-1.4.3-.7.3-1.3.2-1.4-.2-.1-.5-.2-.8-.4z"/></svg></span><span>WhatsApp</span>';
    const maps=document.getElementById('mapsLink');
    if(maps)maps.innerHTML='<span class="brand-social-icon maps-brand" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M12 2C8.1 2 5 5 5 8.8c0 5.1 7 13.2 7 13.2s7-8.1 7-13.2C19 5 15.9 2 12 2z"/><circle cx="12" cy="8.8" r="2.8" fill="#fff"/><path fill="#34A853" d="M12 22s7-8.1 7-13.2c0-.8-.1-1.5-.4-2.2L12 22z"/><path fill="#FBBC04" d="M5.4 6.5A6.8 6.8 0 0 0 5 8.8c0 2.1 1.2 4.8 2.7 7.2L12 10.5 5.4 6.5z"/><path fill="#EA4335" d="M12 2C9 2 6.5 3.8 5.4 6.5l4.3 3A2.8 2.8 0 0 1 12 6V2z"/></svg></span><span>Como chegar</span>';
    const ig=document.getElementById('instagramLink');
    if(ig)ig.innerHTML='<span class="brand-social-icon instagram-brand" aria-hidden="true"><svg viewBox="0 0 24 24"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FFDC80"/><stop offset=".35" stop-color="#FC3768"/><stop offset=".7" stop-color="#C13584"/><stop offset="1" stop-color="#405DE6"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/></svg></span><span>Instagram</span>';

    if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.update())).catch(()=>{});}
  });
})();
