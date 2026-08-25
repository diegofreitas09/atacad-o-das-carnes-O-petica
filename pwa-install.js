(function(){
  let deferredPrompt=null;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMacSafari=/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1;
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

  function platform(){
    const ua=navigator.userAgent.toLowerCase();
    if(isIOS||isMacSafari)return 'ios';
    if(/android/.test(ua))return 'android';
    if(/windows/.test(ua))return 'windows';
    return 'desktop';
  }

  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register('./service-worker.js?v=37',{scope:'./'});
      registration.update().catch(()=>{});
    }catch(err){
      console.warn('Falha ao registrar o aplicativo para instalação:',err);
    }
  }

  function injectMeta(){
    const head=document.head;
    const metas=[
      ['meta',{name:'apple-mobile-web-app-capable',content:'yes'}],
      ['meta',{name:'apple-mobile-web-app-status-bar-style',content:'black-translucent'}],
      ['meta',{name:'apple-mobile-web-app-title',content:'O Peitica'}],
      ['link',{rel:'apple-touch-icon',href:'icon.svg?v=37'}]
    ];
    metas.forEach(([tag,attrs])=>{
      const selector=tag==='meta'?`meta[name="${attrs.name}"]`:`link[rel="${attrs.rel}"]`;
      if(head.querySelector(selector))return;
      const el=document.createElement(tag);
      Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
      head.appendChild(el);
    });
  }

  function createUI(){
    if(document.getElementById('pwaInstallCard'))return;
    const p=platform();
    const card=document.createElement('section');
    card.id='pwaInstallCard';
    card.className='pwa-install-card';
    card.innerHTML=`<div class="pwa-install-copy"><span class="pwa-install-icon">📲</span><div><strong>Instale o app O Peitica</strong><small id="pwaInstallHint">Tenha o catálogo na tela inicial do seu aparelho.</small></div></div><button id="pwaInstallBtn" type="button">Instalar app</button>`;
    const quick=document.querySelector('.quick-links');
    const login=document.querySelector('#loginCard');
    if(quick&&quick.parentNode)quick.parentNode.insertBefore(card,quick);
    else if(login&&login.parentNode)login.parentNode.insertBefore(card,login);
    else document.querySelector('main')?.prepend(card);

    const btn=document.getElementById('pwaInstallBtn');
    const hint=document.getElementById('pwaInstallHint');

    if(isStandalone){
      card.classList.add('installed');
      btn.textContent='✓ App instalado';
      btn.disabled=true;
      hint.textContent='O aplicativo já está instalado neste aparelho.';
      return;
    }
    if(p==='ios'){
      btn.textContent='Como instalar';
      hint.textContent='iPhone/iPad: abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.';
      btn.addEventListener('click',showIOSHelp);
      return;
    }
    if(p==='windows')hint.textContent='Windows: use Chrome ou Edge e toque em instalar.';
    if(p==='android')hint.textContent='Android/tablet: toque em instalar para adicionar à tela inicial.';
    btn.addEventListener('click',installPrompt);
  }

  async function installPrompt(){
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice;}catch(e){}
      deferredPrompt=null;
      return;
    }
    const p=platform();
    if(p==='android'){
      alert('No Chrome, toque no menu ⋮ e procure “Instalar app” ou “Adicionar à tela inicial”. Se acabou de atualizar a página, aguarde alguns segundos e tente novamente.');
    }else if(p==='windows'){
      alert('No Microsoft Edge ou Google Chrome, abra o menu do navegador e escolha “Aplicativos > Instalar O Peitica” ou use o ícone de instalação na barra de endereço.');
    }else{
      alert('Abra este site no Chrome ou Edge e use a opção “Instalar aplicativo”.');
    }
  }

  function showIOSHelp(){
    let modal=document.getElementById('iosInstallHelp');
    if(!modal){
      modal=document.createElement('div');
      modal.id='iosInstallHelp';
      modal.className='pwa-modal';
      modal.innerHTML=`<div class="pwa-modal-backdrop" data-close-pwa></div><div class="pwa-modal-box"><button class="pwa-modal-close" data-close-pwa>×</button><h3>Instalar no iPhone ou iPad</h3><ol><li>Abra esta página no <b>Safari</b>.</li><li>Toque no botão <b>Compartilhar</b> (quadrado com seta para cima).</li><li>Role as opções e toque em <b>Adicionar à Tela de Início</b>.</li><li>Confirme em <b>Adicionar</b>.</li></ol><p>Depois disso, o ícone “O Peitica” ficará junto com seus aplicativos.</p></div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-close-pwa]').forEach(x=>x.addEventListener('click',()=>modal.classList.remove('open')));
    }
    modal.classList.add('open');
  }

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    const btn=document.getElementById('pwaInstallBtn');
    const hint=document.getElementById('pwaInstallHint');
    if(btn){btn.disabled=false;btn.textContent='Instalar app';}
    if(hint)hint.textContent='Aplicativo pronto para instalar neste aparelho.';
  });

  window.addEventListener('appinstalled',()=>{
    const card=document.getElementById('pwaInstallCard');
    const btn=document.getElementById('pwaInstallBtn');
    const hint=document.getElementById('pwaInstallHint');
    if(card)card.classList.add('installed');
    if(btn){btn.textContent='✓ App instalado';btn.disabled=true;}
    if(hint)hint.textContent='O aplicativo foi instalado com sucesso.';
  });

  function loadCatalogGuard(){
    if(document.querySelector('script[data-catalog-guard]'))return;
    const s=document.createElement('script');
    s.src='catalog-guard.js?v=37';
    s.dataset.catalogGuard='1';
    document.body.appendChild(s);
  }

  injectMeta();
  registerServiceWorker();
  loadCatalogGuard();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createUI);else createUI();
})();