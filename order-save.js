(function(){
  const LOCAL_KEY='opeitica:orcamentos';
  let currentId='';
  let currentSignature='';

  function makeOrderId(){return 'OP-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.floor(Math.random()*900+100);}
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
  function signature(){const c=customerData();return JSON.stringify({cart:state.cart.map(i=>[i.id,i.grams,i.qty,i.note,i.total]),customer:c,location:deliveryMapLinkFromCustomer(c)});}
  function budgetId(){const s=signature();if(!currentId||s!==currentSignature){currentId=makeOrderId();currentSignature=s;}return currentId;}
  function getPayload(){
    const c=customerData(),delivery=c.type==='entrega'?c.area.fee:0;
    return {
      id:budgetId(),criado_em:new Date().toISOString(),cliente:c.name,telefone:c.phone,
      recebimento:c.type,bairro:c.type==='entrega'?c.area.name:'',taxa_entrega:delivery,
      endereco:c.type==='entrega'?c.address:'',referencia:c.type==='entrega'?c.reference:'',
      localizacao:deliveryMapLinkFromCustomer(c),subtotal:cartSubtotal(),total:cartSubtotal()+delivery,
      itens:state.cart.map(i=>({id:i.id,nome:i.nome,categoria:i.categoria||'',quantidade:i.unidade==='kit'?i.qty:i.grams,unidade:i.unidade==='kit'?'kit':'g',preco_unitario:i.preco,subtotal:i.total,observacao:i.note||''}))
    };
  }
  function saveLocal(payload){try{const all=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]').filter(x=>x.id!==payload.id);all.unshift(payload);localStorage.setItem(LOCAL_KEY,JSON.stringify(all.slice(0,50)));}catch(e){}}
  async function saveToSheet(payload){
    if(!cfg.ORDER_WEBAPP_URL)return {ok:false,offline:true};
    try{const body=new URLSearchParams();body.set('payload',JSON.stringify(payload));await fetch(cfg.ORDER_WEBAPP_URL,{method:'POST',body,mode:'no-cors'});return {ok:true};}catch(e){return {ok:false,error:e};}
  }
  function whatsappText(payload){
    const lines=[`*${cfg.BUSINESS_NAME||'ATACADÃO DA CARNE O PEITICA'}*`,cfg.ADDRESS||'Rua Edison Martins, 530 - Fortaleza/CE',`WhatsApp: ${cfg.WHATSAPP||'5585989626829'}`,'',`*ORÇAMENTO ${payload.id}*`,`Cliente: ${payload.cliente}`,`Telefone: ${payload.telefone}`,''];
    payload.itens.forEach((i,n)=>{lines.push(`${n+1}. *${i.nome}*`,`Quantidade: ${i.unidade==='kit'?i.quantidade+' kit(s)':i.quantidade+' g'}`,`Valor: ${money(i.subtotal)}`);if(i.observacao)lines.push(`Obs.: ${i.observacao}`);lines.push('');});
    lines.push(`Produtos: ${money(payload.subtotal)}`,`Recebimento: ${payload.recebimento==='entrega'?'ENTREGA':'RETIRADA NA LOJA'}`);
    if(payload.recebimento==='entrega'){
      lines.push(`Bairro: ${payload.bairro}`,`Taxa de entrega: ${money(payload.taxa_entrega)}`,`Endereço completo: ${payload.endereco}`);
      if(payload.referencia)lines.push(`Referência: ${payload.referencia}`);
      if(payload.localizacao)lines.push(`📍 *ABRIR ROTA DA ENTREGA:* ${payload.localizacao}`);
    }
    lines.push(`*TOTAL: ${money(payload.total)}*`);
    return lines.join('\n');
  }
  function makeBrandedPdf(payload){
    if(!window.jspdf?.jsPDF)return null;
    const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'});
    doc.setFillColor(159,16,16);doc.rect(0,0,210,36,'F');
    if(window.OPEITICA_LOGO_DATA){try{doc.addImage(window.OPEITICA_LOGO_DATA,'JPEG',12,5,26,26);}catch(e){}}
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('ATACADÃO DA CARNE O PEITICA',44,14);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(cfg.ADDRESS||'Rua Edison Martins, 530 - Fortaleza/CE',44,21);doc.text(`WhatsApp: ${cfg.WHATSAPP||'5585989626829'}`,44,27);
    doc.setTextColor(25,22,20);let y=46;doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(`ORÇAMENTO ${payload.id}`,14,y);y+=7;
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`Cliente: ${payload.cliente}`,14,y);y+=6;doc.text(`Telefone: ${payload.telefone}`,14,y);y+=6;doc.text(`Recebimento: ${payload.recebimento==='entrega'?'Entrega':'Retirada na loja'}`,14,y);y+=6;
    if(payload.recebimento==='entrega'){
      doc.text(`Bairro: ${payload.bairro} | Taxa: ${money(payload.taxa_entrega)}`,14,y);y+=6;
      const enderecoLinhas=doc.splitTextToSize(`Endereço: ${payload.endereco}`,180);doc.text(enderecoLinhas,14,y);y+=enderecoLinhas.length*5+3;
      if(payload.referencia){const refLinhas=doc.splitTextToSize(`Referência: ${payload.referencia}`,180);doc.text(refLinhas,14,y);y+=refLinhas.length*5+2;}
      if(payload.localizacao){doc.setFillColor(245,236,234);doc.roundedRect(14,y-4,182,10,2,2,'F');doc.setTextColor(159,16,16);doc.setFont('helvetica','bold');doc.textWithLink('CLIQUE AQUI PARA ABRIR A ROTA DA ENTREGA NO MAPA',18,y+2,{url:payload.localizacao});doc.setFont('helvetica','normal');doc.setTextColor(25,22,20);y+=13;}
    }
    doc.setDrawColor(220);doc.line(14,y,196,y);y+=8;doc.setFont('helvetica','bold');doc.text('ITENS DO ORÇAMENTO',14,y);y+=7;
    payload.itens.forEach((i,n)=>{if(y>258){doc.addPage();y=20;}doc.setFont('helvetica','bold');doc.text(`${n+1}. ${i.nome}`,14,y,{maxWidth:105});doc.setFont('helvetica','normal');doc.text(i.unidade==='kit'?`${i.quantidade} kit(s)`:`${i.quantidade} g`,134,y);doc.text(money(i.subtotal),196,y,{align:'right'});y+=5;doc.setTextColor(95);doc.text(`${i.categoria||''} • ${money(i.preco_unitario)} ${i.unidade==='kit'?'/ kit':'/ kg'}`,18,y);y+=5;if(i.observacao){doc.text(`Obs.: ${i.observacao}`,18,y,{maxWidth:170});y+=6;}doc.setTextColor(25,22,20);});
    y+=4;if(y>268){doc.addPage();y=20;}doc.line(14,y,196,y);y+=8;doc.text(`Produtos: ${money(payload.subtotal)}`,196,y,{align:'right'});y+=6;if(payload.recebimento==='entrega'){doc.text(`Entrega: ${money(payload.taxa_entrega)}`,196,y,{align:'right'});y+=6;}doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(159,16,16);doc.text(`TOTAL: ${money(payload.total)}`,196,y,{align:'right'});
    return doc.output('blob');
  }
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);}

  async function finalizeBudget(){
    if(!validateOrder())return;
    const btn=document.getElementById('finalizeBudgetBtn'),old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='⏳ Salvando e preparando...';}

    /* Abre a aba do WhatsApp imediatamente para evitar bloqueio de pop-up após operações assíncronas. */
    let whatsappWindow=null;
    try{whatsappWindow=window.open('about:blank','_blank');}catch(e){}

    const payload=getPayload();
    saveLocal(payload);
    const sheetResult=await saveToSheet(payload);
    const text=whatsappText(payload);
    const direct=`https://wa.me/${cfg.WHATSAPP||'5585989626829'}?text=${encodeURIComponent(text)}`;
    const blob=makeBrandedPdf(payload);
    const filename=`orcamento-${payload.id}.pdf`;

    try{
      if(blob){
        const file=new File([blob],filename,{type:'application/pdf'});
        if(navigator.canShare?.({files:[file]})){
          if(whatsappWindow&&!whatsappWindow.closed)whatsappWindow.close();
          await navigator.share({title:`Orçamento ${payload.id} - O Peitica`,text,files:[file]});
        }else{
          downloadBlob(blob,filename);
          if(whatsappWindow&&!whatsappWindow.closed)whatsappWindow.location.href=direct;else window.location.href=direct;
        }
      }else{
        if(whatsappWindow&&!whatsappWindow.closed)whatsappWindow.location.href=direct;else window.location.href=direct;
      }
      if(!sheetResult.ok&&sheetResult.offline){console.info('Google Sheets ainda não conectado: orçamento salvo localmente.');}
    }catch(e){
      if(e?.name!=='AbortError'){
        if(whatsappWindow&&!whatsappWindow.closed)whatsappWindow.location.href=direct;else window.location.href=direct;
      }
    }finally{
      if(btn){btn.disabled=false;btn.textContent=old;}
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const logo=document.getElementById('brandLogo');if(logo&&window.OPEITICA_LOGO_DATA)logo.src=window.OPEITICA_LOGO_DATA;
    document.getElementById('finalizeBudgetBtn')?.addEventListener('click',finalizeBudget);
  });
})();
