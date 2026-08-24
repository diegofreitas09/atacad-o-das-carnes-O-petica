/* Instalação PWA - O Peitica Gestão */
(function(){
  let deferredPrompt=null;
  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);

  function ensureInstalledBadge(){
    if(!isStandalone()||document.getElementById('installedAppBadge'))return;
    const header=document.querySelector('.admin-top');if(!header)return;
    const badge=document.createElement('span');badge.id='installedAppBadge';badge.textContent='✓ App instalado';
    badge.style.cssText='display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.35);background:#176b35;color:#fff;font-weight:800;border-radius:999px;padding:8px 12px;font-size:12px;white-space:nowrap';
    const link=header.querySelector('a');if(link)header.insertBefore(badge,link);else header.appendChild(badge);
  }

  function ensureUi(){
    if(isStandalone()){ensureInstalledBadge();return;}
    if(document.getElementById('installAppBtn'))return;
    const style=document.createElement('style');
    style.textContent=`
      #installAppBtn{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.35);background:#fff;color:#7f1010;font-weight:900;border-radius:12px;padding:10px 14px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.12)}
      #installAppBanner{position:fixed;left:14px;right:14px;bottom:18px;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid #ead7d1;border-left:5px solid #991010;border-radius:16px;padding:14px 16px;box-shadow:0 18px 50px rgba(39,13,8,.24);color:#29120d}
      #installAppBanner strong{display:block;font-size:16px}#installAppBanner small{display:block;color:#745e58;margin-top:2px}
      #installAppBanner .install-actions{display:flex;gap:8px;flex-shrink:0}#installAppBanner button{border:0;border-radius:10px;padding:10px 13px;font-weight:900;cursor:pointer}
      #installConfirm{background:#a91414;color:#fff}#installLater{background:#f2e9e6;color:#3c211b}
      @media(max-width:640px){#installAppBanner{align-items:flex-start;flex-direction:column}#installAppBanner .install-actions{width:100%}#installAppBanner button{flex:1}}
    `;document.head.appendChild(style);
    const header=document.querySelector('.admin-top');
    if(header){const btn=document.createElement('button');btn.id='installAppBtn';btn.type='button';btn.innerHTML='⬇️ Instalar app';btn.onclick=install;const link=header.querySelector('a');if(link)header.insertBefore(btn,link);else header.appendChild(btn)}
    const banner=document.createElement('div');banner.id='installAppBanner';banner.innerHTML=`<div><strong>📲 Instalar O Peitica Gestão</strong><small>Instale este painel no celular para abrir como aplicativo.</small></div><div class="install-actions"><button id="installLater" type="button">Agora não</button><button id="installConfirm" type="button">Instalar app</button></div>`;document.body.appendChild(banner);
    document.getElementById('installConfirm').onclick=install;document.getElementById('installLater').onclick=()=>banner.remove();
  }

  async function install(){
    if(isStandalone()){ensureInstalledBadge();return;}
    if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch(e){}deferredPrompt=null;return;}
    if(isIOS())alert('No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
    else alert('Neste navegador, abra o menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”. O botão desta página ficará disponível assim que o Chrome liberar a instalação.');
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;ensureUi()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;document.getElementById('installAppBanner')?.remove();document.getElementById('installAppBtn')?.remove();ensureInstalledBadge()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureUi,500),{once:true});else setTimeout(ensureUi,500);
})();