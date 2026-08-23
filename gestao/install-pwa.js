/* Instalação PWA - O Peitica Gestão */
(function(){
  let deferredPrompt=null;
  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);

  function ensureUi(){
    if(isStandalone()||document.getElementById('installAppBtn'))return;
    const style=document.createElement('style');
    style.textContent=`
      #installAppBtn{display:none;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.35);background:#fff;color:#7f1010;font-weight:900;border-radius:12px;padding:10px 14px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.12)}
      #installAppBtn.show{display:inline-flex}
      #installAppBanner{position:fixed;left:14px;right:14px;bottom:18px;z-index:99999;display:none;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid #ead7d1;border-left:5px solid #991010;border-radius:16px;padding:14px 16px;box-shadow:0 18px 50px rgba(39,13,8,.24);color:#29120d}
      #installAppBanner.show{display:flex}#installAppBanner strong{display:block;font-size:16px}#installAppBanner small{display:block;color:#745e58;margin-top:2px}
      #installAppBanner .install-actions{display:flex;gap:8px;flex-shrink:0}#installAppBanner button{border:0;border-radius:10px;padding:10px 13px;font-weight:900;cursor:pointer}
      #installConfirm{background:#a91414;color:#fff}#installLater{background:#f2e9e6;color:#3c211b}
      @media(max-width:640px){#installAppBanner{align-items:flex-start;flex-direction:column}#installAppBanner .install-actions{width:100%}#installAppBanner button{flex:1}}
    `;
    document.head.appendChild(style);

    const header=document.querySelector('.admin-top');
    if(header){
      const btn=document.createElement('button');btn.id='installAppBtn';btn.type='button';btn.innerHTML='⬇️ Instalar app';btn.onclick=install;
      const link=header.querySelector('a'); if(link) header.insertBefore(btn,link); else header.appendChild(btn);
    }

    const banner=document.createElement('div');banner.id='installAppBanner';banner.innerHTML=`<div><strong>📲 Instalar O Peitica Gestão</strong><small>Use o painel como aplicativo no celular, com ícone na tela inicial.</small></div><div class="install-actions"><button id="installLater" type="button">Agora não</button><button id="installConfirm" type="button">Instalar app</button></div>`;
    document.body.appendChild(banner);
    document.getElementById('installConfirm').onclick=install;
    document.getElementById('installLater').onclick=()=>{banner.classList.remove('show');sessionStorage.setItem('opeitica_install_later','1')};
  }

  async function install(){
    if(isStandalone())return;
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch(e){}
      deferredPrompt=null;
      document.getElementById('installAppBanner')?.classList.remove('show');
      document.getElementById('installAppBtn')?.classList.remove('show');
      return;
    }
    if(isIOS()) alert('No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
    else alert('No Chrome, toque no menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”. Se essa opção ainda não aparecer, atualize a página uma vez.');
  }

  function showInstall(){
    if(isStandalone())return;
    ensureUi();
    document.getElementById('installAppBtn')?.classList.add('show');
    if(!sessionStorage.getItem('opeitica_install_later')) document.getElementById('installAppBanner')?.classList.add('show');
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;showInstall()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;document.getElementById('installAppBanner')?.remove();document.getElementById('installAppBtn')?.remove()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();setTimeout(showInstall,1200)},{once:true});else{ensureUi();setTimeout(showInstall,1200)}
})();