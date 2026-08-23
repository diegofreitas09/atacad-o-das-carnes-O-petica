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
  function makeBrandedPdf(payload){
    if(!window.jspdf?.jsPDF)return null;
    const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'});
    const created=new Date(payload.criado_em).toLocaleString('pt-BR');
    doc.setFillColor(159,16,16);doc.rect(0,0,210,40,'F');
    if(window.OPEITICA_LOGO_DATA){try{doc.addImage(window.OPEITICA_LOGO_DATA,'JPEG',10,5,30,30);}catch(e){}}
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('ATACADÃO DA CARNE O PEITICA',45,14);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Rua Edison Martins, 530 - Fortaleza/CE',45,21);doc.text('WhatsApp: (85) 98962-6829',45,27);doc.text(`Orçamento: ${payload.id} • ${created}`,45,33);

    doc.setTextColor(25,22,20);let y=50;
    doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('DADOS DO CLIENTE',14,y);y+=8;
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`Nome: ${payload.cliente}`,14,y);y+=6;doc.text(`Telefone: ${payload.telefone}`,14,y);y+=6;
    doc.text(`Forma de recebimento: ${payload.recebimento==='entrega'?'ENTREGA':'RETIRADA NA LOJA'}`,14,y);y+=7;

    if(payload.recebimento==='entrega'){
      doc.setFont('helvetica','bold');doc.text('DADOS DA ENTREGA',14,y);y+=7;doc.setFont('helvetica','normal');
      doc.text(`Bairro: ${payload.bairro}`,14,y);doc.text(`Taxa: ${money(payload.taxa_entrega)}`,120,y);y+=6;
      const enderecoLinhas=doc.splitTextToSize(`Endereço completo: ${payload.endereco}`,180);doc.text(enderecoLinhas,14,y);y+=enderecoLinhas.length*5+2;
      if(payload.referencia){const refLinhas=doc.splitTextToSize(`Referência: ${payload.referencia}`,180);doc.text(refLinhas,14,y);y+=refLinhas.length*5+2;}
      if(payload.localizacao){
        doc.setFillColor(245,236,234);doc.roundedRect(14,y-3,182,13,2,2,'F');
        doc.setTextColor(159,16,16);doc.setFont('helvetica','bold');doc.textWithLink('CLIQUE AQUI PARA ABRIR A ROTA DA ENTREGA',18,y+3,{url:payload.localizacao});
        doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(doc.splitTextToSize(payload.localizacao,165),18,y+8);doc.setFontSize(10);doc.setTextColor(25,22,20);y+=18;
      }
    }

    doc.setDrawColor(220);doc.line(14,y,196,y);y+=8;doc.setFont('helvetica','bold');doc.text('ITENS DO ORÇAMENTO',14,y);y+=7;
    payload.itens.forEach((i,n)=>{
      if(y>252){doc.addPage();y=20;}
      doc.setFont('helvetica','bold');doc.text(`${n+1}. ${i.nome}`,14,y,{maxWidth:98});
      doc.setFont('helvetica','normal');doc.text(i.unidade==='kit'?`${i.quantidade} kit(s)`:`${i.quantidade} g`,125,y);
      doc.text(money(i.subtotal),196,y,{align:'right'});y+=5;
      doc.setTextColor(95);doc.text(`${i.categoria||''} • ${money(i.preco_unitario)} ${i.unidade==='kit'?'/ kit':'/ kg'}`,18,y);y+=5;
      if(i.observacao){const obs=doc.splitTextToSize(`Observação: ${i.observacao}`,165);doc.text(obs,18,y);y+=obs.length*5+1;}
      doc.setTextColor(25,22,20);
    });
    y+=4;if(y>265){doc.addPage();y=20;}doc.line(14,y,196,y);y+=8;
    doc.setFont('helvetica','normal');doc.text(`Produtos: ${money(payload.subtotal)}`,196,y,{align:'right'});y+=6;
    if(payload.recebimento==='entrega'){doc.text(`Entrega: ${money(payload.taxa_entrega)}`,196,y,{align:'right'});y+=6;}
    doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(159,16,16);doc.text(`TOTAL: ${money(payload.total)}`,196,y,{align:'right'});y+=10;
    doc.setFontSize(8);doc.setTextColor(90);doc.setFont('helvetica','normal');doc.text('Documento gerado pelo catálogo digital do Atacadão da Carne O Peitica.',14,y);
    return doc.output('blob');
  }
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);}
  function openPdfForPrint(blob){try{const url=URL.createObjectURL(blob);const w=window.open(url,'_blank');if(w)setTimeout(()=>{try{w.focus();w.print();}catch(e){}},1200);setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){}}

  async function finalizeBudget(){
    if(!validateOrder())return;
    const btn=document.getElementById('finalizeBudgetBtn'),old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='⏳ GERANDO PDF...';}
    const payload=getPayload();
    saveLocal(payload);
    const sheetPromise=saveToSheet(payload);
    const blob=makeBrandedPdf(payload);
    const filename=`orcamento-${payload.id}.pdf`;
    if(!blob){alert('Não foi possível gerar o PDF neste navegador.');if(btn){btn.disabled=false;btn.textContent=old;}return;}

    try{
      const file=new File([blob],filename,{type:'application/pdf'});
      if(navigator.canShare?.({files:[file]})){
        await navigator.share({title:`Orçamento ${payload.id} - O Peitica`,text:`Orçamento ${payload.id} em PDF`,files:[file]});
      }else{
        downloadBlob(blob,filename);
        openPdfForPrint(blob);
        setTimeout(()=>{window.open(cfg.WHATSAPP_BUSINESS_URL||'https://wa.me/message/NW4MC6V5OVEIK1','_blank','noopener');},500);
        alert('PDF gerado e aberto para impressão. No computador, o WhatsApp Web não permite anexar automaticamente um arquivo; o PDF foi baixado para você anexar na conversa.');
      }
      await sheetPromise;
    }catch(e){
      if(e?.name!=='AbortError'){
        downloadBlob(blob,filename);
        openPdfForPrint(blob);
      }
    }finally{
      if(btn){btn.disabled=false;btn.textContent=old;}
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('finalizeBudgetBtn')?.addEventListener('click',finalizeBudget);
  });
})();
