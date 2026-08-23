(function(){
  const LOCAL_KEY='opeitica:orcamentos';
  const CART_KEY='opeitica:carrinho-v1';
  let currentId='';
  let currentSignature='';

  function makeOrderId(){return 'OP-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.floor(Math.random()*900+100);}

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        if(window.jspdf?.jsPDF)return resolve(true);
        existing.addEventListener('load',()=>resolve(true),{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=src;s.async=true;s.crossOrigin='anonymous';
      s.onload=()=>resolve(true);s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  async function ensureJsPDF(){
    if(window.jspdf?.jsPDF)return true;
    const sources=[
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
      'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
    ];
    for(const src of sources){
      try{
        await loadScript(src);
        if(window.jspdf?.jsPDF)return true;
      }catch(e){}
    }
    return false;
  }

  function deliveryMapLinkFromCustomer(c){
    if(typeof mapsClientLink==='function'){
      const gps=mapsClientLink();
      if(gps)return gps;
    }
    if(c?.type==='entrega'&&c.address){
      const query=[c.address,c.area?.name,'Fortaleza','CE'].filter(Boolean).join(', ');
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    return '';
  }

  function signature(){
    const c=customerData();
    return JSON.stringify({cart:state.cart.map(i=>[i.id,i.grams,i.qty,i.note,i.total]),customer:c,location:deliveryMapLinkFromCustomer(c)});
  }

  function budgetId(){
    const s=signature();
    if(!currentId||s!==currentSignature){currentId=makeOrderId();currentSignature=s;}
    return currentId;
  }

  function getPayload(){
    const c=customerData(),delivery=c.type==='entrega'?c.area.fee:0;
    return {
      id:budgetId(),criado_em:new Date().toISOString(),
      empresa:cfg.BUSINESS_NAME||'Atacadão da Carne O Peitica',
      empresa_endereco:cfg.ADDRESS||'Rua Edison Martins, 530 - Fortaleza/CE',
      empresa_whatsapp:cfg.WHATSAPP||'5585989626829',
      cliente:c.name,telefone:c.phone,recebimento:c.type,
      bairro:c.type==='entrega'?c.area.name:'',taxa_entrega:delivery,
      endereco:c.type==='entrega'?c.address:'',referencia:c.type==='entrega'?c.reference:'',
      localizacao:deliveryMapLinkFromCustomer(c),subtotal:cartSubtotal(),total:cartSubtotal()+delivery,
      itens:state.cart.map(i=>({id:i.id,nome:i.nome,categoria:i.categoria||'',quantidade:i.unidade==='kit'?i.qty:i.grams,unidade:i.unidade==='kit'?'kit':'g',preco_unitario:i.preco,subtotal:i.total,observacao:i.note||''}))
    };
  }

  function saveLocal(payload){try{const all=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]').filter(x=>x.id!==payload.id);all.unshift(payload);localStorage.setItem(LOCAL_KEY,JSON.stringify(all.slice(0,100)));}catch(e){}}

  async function saveToSheet(payload){
    if(!cfg.ORDER_WEBAPP_URL)return {ok:false,offline:true};
    try{const body=new URLSearchParams();body.set('payload',JSON.stringify(payload));await fetch(cfg.ORDER_WEBAPP_URL,{method:'POST',body,mode:'no-cors'});return {ok:true};}catch(e){return {ok:false,error:e};}
  }

  function getLogoSource(){
    const img=document.getElementById('brandLogo');
    if(img?.src?.startsWith('data:image/'))return img.src;
    if(window.OPEITICA_LOGO_DATA)return window.OPEITICA_LOGO_DATA;
    return '';
  }

  function makeBrandedPdf(payload){
    if(!window.jspdf?.jsPDF)return null;
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4'});
    const created=new Date(payload.criado_em).toLocaleString('pt-BR');
    doc.setFillColor(153,0,0);doc.rect(0,0,210,42,'F');
    const logo=getLogoSource();if(logo){try{doc.addImage(logo,'JPEG',9,5,32,32);}catch(e){}}
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('ATACADÃO DA CARNE O PEITICA',46,13);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Rua Edison Martins, 530 - Fortaleza/CE',46,20);doc.text('WhatsApp: (85) 98962-6829',46,26);doc.text(`ORÇAMENTO ${payload.id}`,46,32);doc.text(created,196,32,{align:'right'});

    let y=51;doc.setTextColor(20,20,20);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('DADOS DO CLIENTE',14,y);y+=7;
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`Nome: ${payload.cliente}`,14,y);y+=6;doc.text(`Telefone/WhatsApp: ${payload.telefone}`,14,y);y+=6;doc.text(`Recebimento: ${payload.recebimento==='entrega'?'ENTREGA':'RETIRADA NA LOJA'}`,14,y);y+=8;

    if(payload.recebimento==='entrega'){
      doc.setFont('helvetica','bold');doc.text('DADOS PARA ENTREGA',14,y);y+=7;doc.setFont('helvetica','normal');
      doc.text(`Bairro: ${payload.bairro}`,14,y);doc.text(`Taxa de entrega: ${money(payload.taxa_entrega)}`,115,y);y+=6;
      const end=doc.splitTextToSize(`Endereço completo: ${payload.endereco}`,180);doc.text(end,14,y);y+=end.length*5+2;
      if(payload.referencia){const ref=doc.splitTextToSize(`Referência: ${payload.referencia}`,180);doc.text(ref,14,y);y+=ref.length*5+2;}
      if(payload.localizacao){doc.setFillColor(246,238,237);doc.roundedRect(14,y-2,182,16,2,2,'F');doc.setTextColor(153,0,0);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.textWithLink('ABRIR ROTA DA ENTREGA NO GOOGLE MAPS',18,y+4,{url:payload.localizacao});doc.setFont('helvetica','normal');doc.setFontSize(7.5);const linkLines=doc.splitTextToSize(payload.localizacao,166);doc.text(linkLines,18,y+9);doc.setTextColor(20,20,20);doc.setFontSize(10);y+=19;}
    }else{doc.text('Retirada: Rua Edison Martins, 530 - Fortaleza/CE',14,y);y+=8;}

    doc.setDrawColor(210);doc.line(14,y,196,y);y+=8;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('PRODUTOS DO ORÇAMENTO',14,y);y+=7;
    payload.itens.forEach((i,n)=>{
      if(y>252){doc.addPage();y=20;}
      doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(`${n+1}. ${i.nome}`,14,y,{maxWidth:92});doc.setFont('helvetica','normal');
      const qtd=i.unidade==='kit'?`${i.quantidade} kit(s)`:`${i.quantidade} g`;doc.text(qtd,120,y);doc.text(money(i.subtotal),196,y,{align:'right'});y+=5;
      doc.setFontSize(8.5);doc.setTextColor(85);doc.text(`Categoria: ${i.categoria||'-'} | Preço: ${money(i.preco_unitario)} ${i.unidade==='kit'?'/ kit':'/ kg'}`,18,y,{maxWidth:170});y+=5;
      if(i.observacao){const obs=doc.splitTextToSize(`Observação: ${i.observacao}`,166);doc.text(obs,18,y);y+=obs.length*4.5+1;}
      doc.setTextColor(20,20,20);doc.setFontSize(10);
    });

    y+=4;if(y>265){doc.addPage();y=20;}doc.setDrawColor(210);doc.line(14,y,196,y);y+=8;
    doc.setFont('helvetica','normal');doc.text(`Subtotal dos produtos: ${money(payload.subtotal)}`,196,y,{align:'right'});y+=6;
    if(payload.recebimento==='entrega'){doc.text(`Taxa de entrega: ${money(payload.taxa_entrega)}`,196,y,{align:'right'});y+=6;}
    doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(153,0,0);doc.text(`TOTAL: ${money(payload.total)}`,196,y,{align:'right'});y+=12;
    doc.setTextColor(80);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Documento para separação, conferência, impressão e entrega.',14,y);doc.text(`Pedido: ${payload.id}`,196,y,{align:'right'});
    return doc.output('blob');
  }

  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function openPdf(blob){const url=URL.createObjectURL(blob);const w=window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),120000);return !!w;}
  function clearCurrentBudget(){try{localStorage.removeItem(CART_KEY);sessionStorage.removeItem(CART_KEY);}catch(e){}try{state.cart=[];state.location=null;if(typeof updateCart==='function')updateCart();if(typeof setFulfillment==='function')setFulfillment('retirada');}catch(e){}currentId='';currentSignature='';}

  async function finalizeBudget(){
    if(!validateOrder())return;
    const btn=document.getElementById('finalizeBudgetBtn'),old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='⏳ PREPARANDO PDF...';}

    const okPdf=await ensureJsPDF();
    if(!okPdf){
      alert('Não foi possível carregar o gerador de PDF. Verifique a internet e tente novamente.');
      if(btn){btn.disabled=false;btn.textContent=old;}
      return;
    }

    const payload=getPayload();
    const blob=makeBrandedPdf(payload);
    const filename=`orcamento-${payload.id}.pdf`;
    if(!blob){alert('O gerador de PDF carregou, mas não conseguiu montar o arquivo. Tente atualizar a página.');if(btn){btn.disabled=false;btn.textContent=old;}return;}

    saveLocal(payload);const sheetPromise=saveToSheet(payload);
    try{
      const file=new File([blob],filename,{type:'application/pdf'});
      const canShareFiles=!!(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}));
      if(canShareFiles){await navigator.share({title:`Orçamento ${payload.id} - O Peitica`,files:[file]});await sheetPromise;clearCurrentBudget();}
      else{downloadBlob(blob,filename);openPdf(blob);await sheetPromise;setTimeout(()=>window.open(cfg.WHATSAPP_BUSINESS_URL||'https://wa.me/message/NW4MC6V5OVEIK1','_blank','noopener'),700);clearCurrentBudget();alert('PDF completo gerado e aberto para impressão. A conversa do WhatsApp será aberta para anexar o arquivo PDF baixado.');}
    }catch(e){if(e?.name!=='AbortError'){downloadBlob(blob,filename);openPdf(blob);alert('O PDF foi gerado. O compartilhamento automático não foi permitido, então o arquivo foi aberto e baixado para impressão/encaminhamento.');}}
    finally{if(btn){btn.disabled=false;btn.textContent=old;}}
  }

  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('finalizeBudgetBtn')?.addEventListener('click',finalizeBudget);});
})();
