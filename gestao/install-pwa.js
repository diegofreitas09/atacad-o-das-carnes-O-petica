/* Instalação PWA separada - O Peitica Gestão */
(function(){
  let deferredPrompt=null;
  const qs=new URLSearchParams(location.search);
  const isDisplayStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isGestaoStandalone=()=>isDisplayStandalone()&&qs.get('app')==='gestao';
  const isInsideClientApp=()=>isDisplayStandalone()&&!isGestaoStandalone();
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=()=>/android/i.test(navigator.userAgent);

  function installPageUrl(){return location.origin+location.pathname.replace(/[^/]*$/,'')+'instalar.html?v=10'}
  function openInstallPage(){
    const clean=installPageUrl();
    if(isAndroid()){
      const noScheme=clean.replace(/^https?:\/\//,'');
      location.href='intent://'+noScheme+'#Intent;scheme=https;package=com.android.chrome;end';
      return;
    }
    window.open(clean,'_blank','noopener');
  }

  function ensureUi(){
    if(document.getElementById('installAppBtn'))return;
    const style=document.createElement('style');
    style.textContent=`#installAppBtn{display:none;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.35);background:#fff;color:#7f1010;font-weight:900;border-radius:12px;padding:10px 14px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.12)}#installAppBtn.show{display:inline-flex}#installAppStatus{display:none;align-items:center;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;background:#19783c;color:#fff}#installAppStatus.show{display:inline-flex}#installAppBanner{position:fixed;left:14px;right:14px;bottom:18px;z-index:99999;display:none;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid #ead7d1;border-left:5px solid #991010;border-radius:16px;padding:14px 16px;box-shadow:0 18px 50px rgba(39,13,8,.24);color:#29120d}#installAppBanner.show{display:flex}#installAppBanner strong{display:block;font-size:16px}#installAppBanner small{display:block;color:#745e58;margin-top:2px}#installAppBanner .install-actions{display:flex;gap:8px;flex-shrink:0}#installAppBanner button{border:0;border-radius:10px;padding:10px 13px;font-weight:900;cursor:pointer}#installConfirm{background:#a91414;color:#fff}#installLater{background:#f2e9e6;color:#3c211b}@media(max-width:640px){#installAppBanner{align-items:flex-start;flex-direction:column}#installAppBanner .install-actions{width:100%}#installAppBanner button{flex:1}}`;
    document.head.appendChild(style);
    const header=document.querySelector('.admin-top');
    if(header){const btn=document.createElement('button');btn.id='installAppBtn';btn.type='button';btn.innerHTML='⬇️ Instalar Gestão';btn.onclick=install;const status=document.createElement('span');status.id='installAppStatus';status.textContent='✓ Gestão instalado';const link=header.querySelector('a');if(link){header.insertBefore(status,link);header.insertBefore(btn,link)}else{header.append(status,btn)}}
    const banner=document.createElement('div');banner.id='installAppBanner';banner.innerHTML=`<div><strong>📲 Instalar O Peitica Gestão</strong><small id="installHelpText">Instale como um aplicativo separado do app do cliente.</small></div><div class="install-actions"><button id="installLater" type="button">Agora não</button><button id="installConfirm" type="button">Instalar Gestão</button></div>`;document.body.appendChild(banner);document.getElementById('installConfirm').onclick=install;document.getElementById('installLater').onclick=()=>{banner.classList.remove('show');sessionStorage.setItem('opeitica_gestao_install_later','1')};
  }

  async function install(){
    if(isGestaoStandalone())return;
    if(isInsideClientApp()){openInstallPage();return;}
    if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch(e){}deferredPrompt=null;document.getElementById('installAppBanner')?.classList.remove('show');return;}
    openInstallPage();
  }

  function refreshUi(){
    ensureUi();const btn=document.getElementById('installAppBtn'),status=document.getElementById('installAppStatus'),banner=document.getElementById('installAppBanner'),help=document.getElementById('installHelpText');
    if(isGestaoStandalone()){status?.classList.add('show');btn?.classList.remove('show');banner?.classList.remove('show');return;}
    status?.classList.remove('show');btn?.classList.add('show');if(help)help.textContent=isInsideClientApp()?'Você abriu a Gestão dentro do app do cliente. Toque em instalar para abrir a tela própria de instalação no Chrome.':'Toque em instalar para criar o aplicativo “Peitica Gestão” separado.';if(!sessionStorage.getItem('opeitica_gestao_install_later'))banner?.classList.add('show');
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;refreshUi()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;document.getElementById('installAppBanner')?.classList.remove('show')});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshUi,500),{once:true});else setTimeout(refreshUi,500);
})();