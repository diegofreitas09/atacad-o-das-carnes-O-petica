(function(){
  const LOCAL_KEY='opeitica:orcamentos';
  const CART_KEY='opeitica:carrinho-v1';
  let currentId='',currentSignature='';
  function makeOrderId(){return 'OP-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.floor(Math.random()*900+100);}
  function loadScript(src){return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src===src);if(existing){if(window.jspdf?.jsPDF)return resolve(true);existing.addEventListener('load',()=>resolve(true),{once:true});existing.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.crossOrigin='anonymous';s.onload=()=>resolve(true);s.onerror=reject;document.head.appendChild(s);});}
  async function ensureJsPDF(){if(window.jspdf?.jsPDF)return true;for(const src of ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js']){try{await loadScript(src);if(window.jspdf?.jsPDF)return true;}catch(e){}}return false;}
  function paymentMethod(){return document.getElementById('paymentMethod')?.value||'PIX';}
  function setupPayment(){document.querySelectorAll('[data-payment-choice]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-payment-choice]').forEach(x=>x.classList.toggle('active',x===btn));const input=document.getElementById('paymentMethod');if(input)input.value=btn.dataset.paymentChoice||'PIX';}));}
  function deliveryMapLinkFromCustomer(c){if(typeof mapsClientLink==='function'){const gps=mapsClientLink();if(gps)return gps;}if(c?.type==='entrega'&&c.address){const query=[c.address,c.area?.name,'Fortaleza','CE'].filter(Boolean).join(', ');return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;}return '';}
  function signature(){const c=customerData();return JSON.stringify({cart:state.cart.map(i=>[i.id,i.grams,i.qty,i.note,i.total]),customer:c,pagamento:paymentMethod(),location:deliveryMapLinkFromCustomer(c)});}
  function budgetId(){const s=signature();if(!currentId||s!==currentSignature){currentId=makeOrderId();currentSignature=s;}return currentId;}
  function getPayload(){const c=customerData(),delivery=c.type==='entrega'?c.area.fee:0;return{id:budgetId(),criado_em:new Date().toISOString(),empresa:cfg.BUSINESS_NAME||'Atacadão da Carne O Peitica',empresa_endereco:cfg.ADDRESS||'Rua Edison Martins, 530 - Fortaleza/CE',empresa_whatsapp:cfg.WHATSAPP||'5585989626829',cliente:c.name,telefone:c.phone,recebimento:c.type,forma_pagamento:paymentMethod(),bairro:c.type==='entrega'?c.area.name:'',taxa_entrega:delivery,endereco:c.type==='entrega'?c.address:'',referencia:c.type==='entrega'?c.reference:'',localizacao:deliveryMapLinkFromCustomer(c),subtotal:cartSubtotal(),total:cartSubtotal()+delivery,itens:state.cart.map(i=>({id:i.id,nome:i.nome,categoria:i.categoria||'',quantidade:i.unidade==='kit'?i.qty:i.grams,unidade:i.unidade==='kit'?'kit':'g',preco_unitario:i.preco,subtotal:i.total,observacao:i.note||''}))};}
  function saveLocal(payload){try{const all=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]').filter(x=>x.id!==payload.id);all.unshift(payload);localStorage.setItem(LOCAL_KEY,JSON.stringify(all.slice(0,100)));}catch(e){}}
  async function saveToSheet(payload){if(!cfg.ORDER_WEBAPP_URL)return{ok:false,offline:true};try{const body=new URLSearchParams();body.set('payload',JSON.stringify(payload));await fetch(cfg.ORDER_WEBAPP_URL,{method:'POST',body,mode:'no-cors'});return{ok:true};}catch(e){return{ok:false,error:e};}}
  async function getLogoPng(){try{const src=document.getElementById('brandLogo')?.src||new URL('icon.svg',location.href).href;return await new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const size=512,c=document.createElement('canvas');c.width=size;c.height=size;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.drawImage(img,0,0,size,size);resolve(c.toDataURL('image/png'));}catch(e){reject(e)}};img.onerror=reject;img.src=src;});}catch(e){console.warn('Logo PDF:',e);return'';}}
  function sectionTitle(doc,title,y){doc.setFillColor(153,0,0);doc.circle(16,y-1.5,3.2,'F');doc.setTextColor(30);doc.setFont('helvetica','bold');doc.setFontSize(11.5);doc.text(title,23,y);doc.setDrawColor(173,0,0);doc.setLineWidth(.4);doc.line(14,y+3,196,y+3);return y+10;}
  function safeLines(doc,text,width){return doc.splitTextToSize(String(text||''),width);}
  async function makeBrandedPdf(payload){
    if(!window.jspdf?.jsPDF)return null;
    const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),created=new Date(payload.criado_em).toLocaleString('pt-BR');
    const red=[174,0,0],dark=[34,20,18],soft=[250,244,243],gray=[100,100,100];
    const logo=await getLogoPng();
    doc.setFillColor(...red);doc.rect(0,0,210,43,'F');
    if(logo){try{doc.addImage(logo,'PNG',10,4,34,34,undefined,'FAST');}catch(e){}}
    doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('ATACADÃO DA CARNE',50,13);doc.setFontSize(24);doc.text('O PEITICA',50,23);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text('Rua Edison Martins, 530 - Fortaleza/CE',50,30);doc.text('WhatsApp: (85) 98962-6829',50,35.5);
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(`ORÇAMENTO ${payload.id}`,50,40);
    doc.setFont('helvetica','normal');doc.text(created,198,39.5,{align:'right'});

    let y=53;
    y=sectionTitle(doc,'DADOS DO CLIENTE',y);
    doc.setTextColor(...dark);doc.setFontSize(10);doc.setFont('helvetica','bold');doc.text('Nome:',14,y);doc.setFont('helvetica','normal');doc.text(payload.cliente,29,y);y+=6;
    doc.setFont('helvetica','bold');doc.text('Telefone/WhatsApp:',14,y);doc.setFont('helvetica','normal');doc.text(payload.telefone,49,y);y+=6;
    doc.setFont('helvetica','bold');doc.text('Recebimento:',14,y);doc.setFont('helvetica','normal');doc.text(payload.recebimento==='entrega'?'ENTREGA':'RETIRADA NA LOJA',39,y);y+=6;
    doc.setFont('helvetica','bold');doc.text('Forma de pagamento:',14,y);doc.setTextColor(...red);doc.text(payload.forma_pagamento,51,y);doc.setTextColor(...dark);y+=10;

    if(payload.recebimento==='entrega'){
      y=sectionTitle(doc,'DADOS PARA ENTREGA',y);
      doc.setFontSize(10);doc.setFont('helvetica','bold');doc.text('Bairro:',14,y);doc.setFont('helvetica','normal');doc.text(payload.bairro||'-',29,y);doc.setFont('helvetica','bold');doc.text('Taxa de entrega:',145,y);doc.setFont('helvetica','normal');doc.text(money(payload.taxa_entrega),196,y,{align:'right'});y+=6;
      doc.setFont('helvetica','bold');doc.text('Endereço completo:',14,y);doc.setFont('helvetica','normal');const end=safeLines(doc,payload.endereco,135);doc.text(end,49,y);y+=Math.max(6,end.length*5);
      if(payload.referencia){doc.setFont('helvetica','bold');doc.text('Referência:',14,y);doc.setFont('helvetica','normal');const ref=safeLines(doc,payload.referencia,145);doc.text(ref,35,y);y+=Math.max(6,ref.length*5);}
      if(payload.localizacao){doc.setFillColor(...soft);doc.setDrawColor(225,190,186);doc.roundedRect(14,y,182,15,2,2,'FD');doc.setTextColor(...red);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.textWithLink('ABRIR ROTA DA ENTREGA NO GOOGLE MAPS',20,y+9,{url:payload.localizacao});doc.setTextColor(...dark);y+=21;}
    }else{
      y=sectionTitle(doc,'RETIRADA NA LOJA',y);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Rua Edison Martins, 530 - Fortaleza/CE',14,y);y+=11;
    }

    y=sectionTitle(doc,'PRODUTOS DO ORÇAMENTO',y);
    const drawTableHeader=()=>{doc.setFillColor(...red);doc.roundedRect(14,y,182,8,1,1,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('ITEM',17,y+5.5);doc.text('PRODUTO',29,y+5.5);doc.text('DETALHES',82,y+5.5);doc.text('QTD.',135,y+5.5);doc.text('PREÇO UNIT.',155,y+5.5);doc.text('TOTAL',193,y+5.5,{align:'right'});doc.setTextColor(...dark);y+=12;};
    drawTableHeader();
    payload.itens.forEach((i,n)=>{
      const detail=`${i.categoria||'-'} • ${money(i.preco_unitario)} ${i.unidade==='kit'?'/ kit':'/ kg'}`;
      const name=safeLines(doc,i.nome,48),det=safeLines(doc,detail,48),obs=i.observacao?safeLines(doc,'Obs.: '+i.observacao,48):[];
      const rowH=Math.max(12,(name.length+det.length+obs.length)*4.2+3);
      if(y+rowH>246){doc.addPage();y=20;drawTableHeader();}
      doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text(String(n+1),19,y+4,{align:'center'});doc.setFont('helvetica','bold');doc.text(name,29,y+4);doc.setFont('helvetica','normal');doc.setFontSize(7.7);doc.setTextColor(...gray);doc.text(det,82,y+4);if(obs.length)doc.text(obs,82,y+8);doc.setTextColor(...dark);doc.setFontSize(8.5);doc.text(i.unidade==='kit'?`${i.quantidade} kit`:`${i.quantidade} g`,143,y+4,{align:'right'});doc.text(money(i.preco_unitario),174,y+4,{align:'right'});doc.setFont('helvetica','bold');doc.text(money(i.subtotal),196,y+4,{align:'right'});doc.setDrawColor(225);doc.line(14,y+rowH-2,196,y+rowH-2);y+=rowH;
    });

    if(y>244){doc.addPage();y=20;}
    y+=3;doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...dark);doc.text(`Subtotal dos produtos: ${money(payload.subtotal)}`,196,y,{align:'right'});y+=6;
    if(payload.recebimento==='entrega'){doc.text(`Taxa de entrega: ${money(payload.taxa_entrega)}`,196,y,{align:'right'});y+=6;}
    doc.setDrawColor(...red);doc.line(145,y-2,196,y-2);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(...red);doc.text(`TOTAL: ${money(payload.total)}`,196,y+5,{align:'right'});y+=12;doc.setFontSize(10);doc.text(`PAGAMENTO: ${payload.forma_pagamento}`,196,y,{align:'right'});y+=12;

    if(y>257){doc.addPage();y=20;}
    doc.setFillColor(255,250,249);doc.setDrawColor(228,185,181);doc.roundedRect(14,y,182,23,2,2,'FD');doc.setTextColor(...red);doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.text('Obrigado pela preferência!',21,y+8);doc.setTextColor(...dark);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text('Seu orçamento foi salvo e será confirmado por nossa equipe.',21,y+14);doc.text('Qualidade, confiança e o melhor atendimento para você.',21,y+19);y+=29;

    if(y>282){doc.addPage();y=270;}
    doc.setFillColor(...red);doc.rect(0,285,210,12,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text('DÚVIDAS OU ALTERAÇÕES? FALE COM A GENTE NO WHATSAPP: (85) 98962-6829',105,292.5,{align:'center'});
    return doc.output('blob');
  }
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function openPdf(blob){const url=URL.createObjectURL(blob),w=window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),120000);return!!w;}
  function clearCurrentBudget(){try{localStorage.removeItem(CART_KEY);sessionStorage.removeItem(CART_KEY);}catch(e){}try{state.cart=[];state.location=null;if(typeof updateCart==='function')updateCart();if(typeof setFulfillment==='function')setFulfillment('retirada');}catch(e){}currentId='';currentSignature='';}
  async function finalizeBudget(){if(!validateOrder())return;const btn=document.getElementById('finalizeBudgetBtn'),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='⏳ PREPARANDO PDF...';}const okPdf=await ensureJsPDF();if(!okPdf){alert('Não foi possível carregar o gerador de PDF. Verifique a internet e tente novamente.');if(btn){btn.disabled=false;btn.textContent=old;}return;}const payload=getPayload(),blob=await makeBrandedPdf(payload),filename=`orcamento-${payload.id}.pdf`;if(!blob){alert('Não foi possível montar o PDF.');if(btn){btn.disabled=false;btn.textContent=old;}return;}saveLocal(payload);const sheetPromise=saveToSheet(payload);try{const file=new File([blob],filename,{type:'application/pdf'}),canShareFiles=!!(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}));if(canShareFiles){await navigator.share({title:`Orçamento ${payload.id} - O Peitica`,files:[file]});await sheetPromise;clearCurrentBudget();}else{downloadBlob(blob,filename);openPdf(blob);await sheetPromise;setTimeout(()=>window.open(cfg.WHATSAPP_BUSINESS_URL||'https://wa.me/message/NW4MC6V5OVEIK1','_blank','noopener'),700);clearCurrentBudget();alert('PDF completo gerado. A conversa do WhatsApp será aberta para anexar o arquivo.');}}catch(e){if(e?.name!=='AbortError'){downloadBlob(blob,filename);openPdf(blob);}}finally{if(btn){btn.disabled=false;btn.textContent=old;}}}
  document.addEventListener('DOMContentLoaded',()=>{setupPayment();document.getElementById('finalizeBudgetBtn')?.addEventListener('click',finalizeBudget);});
})();