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
          if(box){
            box.scrollIntoView({behavior:'smooth',block:'center'});
            box.classList.add('photo-focus');
            setTimeout(()=>box.classList.remove('photo-focus'),1600);
          }
        },80);
      };
      img.addEventListener('click',openPhotoEditor);
      img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPhotoEditor();}});
      img.addEventListener('mouseenter',()=>{img.style.transform='scale(1.06)';img.style.boxShadow='0 6px 18px rgba(0,0,0,.18)';});
      img.addEventListener('mouseleave',()=>{img.style.transform='';img.style.boxShadow='';});
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    #productsTable td:first-child{position:relative}
    #productsTable .product-thumb{border:2px solid #fff;box-shadow:0 0 0 1px #e2d4cf}
    #productsTable .product-thumb:hover{outline-color:#a51414}
    #productModal .image-box.photo-focus{border-color:#a51414!important;box-shadow:0 0 0 4px rgba(165,20,20,.12);animation:photoPulse .7s ease 2}
    @keyframes photoPulse{50%{transform:scale(1.01)}}
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded',()=>{
    enhanceImages();
    const target=document.getElementById('productsTable');
    if(target){new MutationObserver(enhanceImages).observe(target,{childList:true,subtree:true});}
  });
})();