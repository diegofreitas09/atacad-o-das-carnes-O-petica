(function(){
  const LOCAL_KEY='opeitica:orcamentos';
  function makeOrderId(){return 'OP-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.floor(Math.random()*900+100);}
  function getPayload(){
    const c=customerData();
    const delivery=c.type==='entrega'?c.area.fee:0;
    const id=makeOrderId();
    return {
      id,
      criado_em:new Date().toISOString(),
      cliente:c.name,
      telefone:c.phone,
      recebimento:c.type,
      bairro:c.type==='entrega'?c.area.name:'',
      taxa_entrega:delivery,
      endereco:c.type==='entrega'?c.address:'',
      referencia:c.type==='entrega'?c.reference:'',
      localizacao:mapsClientLink(),
      subtotal:cartSubtotal(),
      total:cartSubtotal()+delivery,
      itens:state.cart.map(i=>({
        id:i.id,
        nome:i.nome,
        categoria:i.categoria||'',
        quantidade:i.unidade==='kit'?i.qty:i.grams,
        unidade:i.unidade==='kit'?'kit':'g',
        preco_unitario:i.preco,
        subtotal:i.total,
        observacao:i.note||''
      }))
    };
  }
  function saveLocal(payload){
    try{
      const all=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');
      all.unshift(payload);
      localStorage.setItem(LOCAL_KEY,JSON.stringify(all.slice(0,50)));
    }catch(e){}
  }
  async function saveBudget(){
    if(!validateOrder())return;
    const payload=getPayload();
    saveLocal(payload);
    if(!cfg.ORDER_WEBAPP_URL){
      alert(`Orçamento ${payload.id} salvo neste aparelho. Falta apenas conectar a URL do Google Sheets para gravar também na planilha.`);
      return;
    }
    const btn=document.getElementById('saveBudgetBtn');
    const old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Salvando orçamento...';}
    try{
      const body=new URLSearchParams();
      body.set('payload',JSON.stringify(payload));
      const res=await fetch(cfg.ORDER_WEBAPP_URL,{method:'POST',body,mode:'no-cors'});
      alert(`Orçamento ${payload.id} salvo. O pedido completo foi enviado para a planilha.`);
    }catch(e){
      alert(`O orçamento ${payload.id} ficou salvo neste aparelho, mas não foi possível enviar para a planilha agora.`);
    }finally{
      if(btn){btn.disabled=false;btn.textContent=old;}
    }
  }
  async function forwardBudget(){
    if(!validateOrder())return;
    const payload=getPayload();
    saveLocal(payload);
    const blob=makePdfBlob();
    if(!blob){alert('Não foi possível gerar o PDF neste navegador.');return;}
    const file=new File([blob],`orcamento-${payload.id}.pdf`,{type:'application/pdf'});
    if(navigator.canShare?.({files:[file]})){
      try{
        await navigator.share({title:`Orçamento ${payload.id} - O Peitica`,text:`Orçamento ${payload.id} com todos os itens da cesta.`,files:[file]});
        return;
      }catch(e){if(e.name==='AbortError')return;}
    }
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`orcamento-${payload.id}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    setTimeout(()=>window.open(cfg.WHATSAPP_BUSINESS_URL||`https://wa.me/${cfg.WHATSAPP||''}`,'_blank','noopener'),250);
    alert('O PDF completo foi salvo. O WhatsApp será aberto para você anexar o orçamento.');
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('saveBudgetBtn')?.addEventListener('click',saveBudget);
    document.getElementById('forwardBudgetBtn')?.addEventListener('click',forwardBudget);
  });
})();
