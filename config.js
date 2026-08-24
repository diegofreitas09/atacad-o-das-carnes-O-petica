window.APP_CONFIG = {
  BUSINESS_NAME: 'Atacadão da Carne O Peitica',
  WHATSAPP: '5585989626829',
  WHATSAPP_BUSINESS_URL: 'https://wa.me/message/NW4MC6V5OVEIK1',
  ADDRESS: 'Rua Edison Martins, 530, Fortaleza - CE',
  MAPS_URL: 'https://www.google.com/maps/search/?api=1&query=Rua%20Edison%20Martins%2C%20530%2C%20Fortaleza%20-%20CE',
  INSTAGRAM_URL: 'https://www.instagram.com/atacadaodacarneopeitica?igsi=cDUyODF0ZTl5OGdv',
  SHEET_CSV_URL: '',
  ORDER_WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbzD7yCVWL49ZNla13uAzNboyXQMSXHx01PLP0spp6niv_usPK-Fkx_lZjnlvvT4e1muVg/exec',
  DELIVERY_FEE: 0,
  DATA_TIMEOUT_MS: 7000
};

/* Auditoria funcional 2026-08-23
   1) preserva a cesta durante a inicialização;
   2) reduz a sincronização automática de 3s para 30s;
   3) devolve os métodos nativos logo após o carregamento. */
(function(){
  const CART_KEY='opeitica:carrinho-v1';
  const originalRemoveItem=Storage.prototype.removeItem;
  const originalSetInterval=window.setInterval;
  let booting=true;

  Storage.prototype.removeItem=function(key){
    if(booting && key===CART_KEY) return;
    return originalRemoveItem.call(this,key);
  };

  window.setInterval=function(fn,delay,...args){
    const adjusted=Number(delay)===3000 ? 30000 : delay;
    return originalSetInterval.call(window,fn,adjusted,...args);
  };

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{
      booting=false;
      Storage.prototype.removeItem=originalRemoveItem;
      window.setInterval=originalSetInterval;
    },0);
  },{once:true});
})();
