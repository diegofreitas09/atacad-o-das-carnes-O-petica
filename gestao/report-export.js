/* Relatório / balanço de vendas por período - O Peitica Gestão */
(function(){
  const fmtMoney=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const fmtDate=v=>{if(!v)return'—';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('pt-BR')};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let lastReport=null;

  function periodText(){
    const a=document.getElementById('fromDate')?.value||'';
    const b=document.getElementById('toDate')?.value||'';
    const br=x=>x?x.split('-').reverse().join('/'):'início';
    return `${br(a)} a ${br(b)||'hoje'}`;
  }
  function officialLogo(){
    const img=document.getElementById('adminBrandLogo');
    return img?.src||'';
  }

  async function generateBalance(){
    if(typeof apiGet!=='function'||typeof adminPin==='undefined'||!adminPin){alert('Entre no painel administrativo primeiro.');return;}
    const from=document.getElementById('fromDate')?.value||'';
    const to=document.getElementById('toDate')?.value||'';
    const btn=document.getElementById('reportBtn');
    const old=btn?.innerHTML;
    if(btn){btn.disabled=true;btn.innerHTML='⏳ Gerando balanço...';}
    try{
      const d=await apiGet('report',{pin:adminPin,from,to});
      if(!d?.ok)throw new Error(d?.error||'Não foi possível gerar o relatório');
      lastReport=d;
      if(typeof renderReport==='function')renderReport(d);
      const status=document.getElementById('reportStatus');
      if(status)status.textContent=`Balanço atualizado: ${periodText()}`;
      const pdfBtn=document.getElementById('printReportBtn');if(pdfBtn)pdfBtn.disabled=false;
    }catch(e){alert('Erro ao gerar balanço: '+e.message);}
    finally{if(btn){btn.disabled=false;btn.innerHTML=old||'📊 Gerar balanço';}}
  }

  function buildReportHtml(d){
    const k=d.kpis||{}, orders=d.pedidos||[], top=d.top_produtos||[], bairros=d.bairros||[];
    const logo=officialLogo();
    const rows=orders.map(o=>`<tr><td>${esc(o.id)}</td><td>${esc(fmtDate(o.data))}</td><td>${esc(o.cliente)}<br><small>${esc(o.telefone)}</small></td><td>${esc(o.recebimento||'')}</td><td>${esc(o.bairro||'—')}</td><td>${fmtMoney(o.total)}</td><td>${esc(o.status||'')}</td></tr>`).join('');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Balanço O Peitica</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#24130f;margin:0;padding:24px;background:#fff}.head{display:flex;align-items:center;gap:16px;background:#2a0d08;color:#fff;padding:18px 22px;border-bottom:6px solid #a81414}.head-logo{width:72px;height:72px;object-fit:contain;border-radius:50%;background:#fff;flex:0 0 72px}.head-copy h1{margin:0 0 4px;font-size:24px}.head-copy p{margin:3px 0}.period{margin:18px 0;font-size:15px;font-weight:700}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:14px 0}.kpi{border:1px solid #e4d5d0;border-radius:10px;padding:12px}.kpi small{display:block;color:#765b52;margin-bottom:5px}.kpi strong{font-size:19px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.box{border:1px solid #e4d5d0;border-radius:10px;padding:14px}.box h3{margin-top:0}.line{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:7px 0}table{width:100%;border-collapse:collapse;margin-top:15px;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f3ece9}.footer{margin-top:20px;font-size:10px;color:#777}@media print{body{padding:0}.head{-webkit-print-color-adjust:exact;print-color-adjust:exact}.head-logo{-webkit-print-color-adjust:exact;print-color-adjust:exact}.kpis{grid-template-columns:repeat(5,1fr)}}
    </style></head><body><div class="head">${logo?`<img class="head-logo" src="${esc(logo)}" alt="Logo oficial O Peitica">`:''}<div class="head-copy"><h1>ATACADÃO DA CARNE O PEITICA</h1><p>Balanço de vendas do aplicativo</p><p>Rua Edison Martins, 530 • Fortaleza</p></div></div><div class="period">Período: ${esc(periodText())}</div><div class="kpis"><div class="kpi"><small>Pedidos</small><strong>${k.pedidos||0}</strong></div><div class="kpi"><small>Faturamento</small><strong>${fmtMoney(k.faturamento)}</strong></div><div class="kpi"><small>Ticket médio</small><strong>${fmtMoney(k.ticket_medio)}</strong></div><div class="kpi"><small>Entregas</small><strong>${k.entregas||0}</strong></div><div class="kpi"><small>Retiradas</small><strong>${k.retiradas||0}</strong></div></div><div class="grid"><div class="box"><h3>Produtos mais vendidos</h3>${top.map((x,i)=>`<div class="line"><span>${i+1}. ${esc(x.nome)}</span><strong>${fmtMoney(x.faturamento)}</strong></div>`).join('')||'<p>Sem vendas.</p>'}</div><div class="box"><h3>Faturamento por bairro</h3>${bairros.map(x=>`<div class="line"><span>${esc(x.bairro)}</span><strong>${fmtMoney(x.faturamento)}</strong></div>`).join('')||'<p>Sem entregas.</p>'}</div></div><h3>Pedidos do período</h3><table><thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Tipo</th><th>Bairro</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Nenhum pedido no período.</td></tr>'}</tbody></table><div class="footer">Relatório gerado em ${new Date().toLocaleString('pt-BR')} • O Peitica Gestão</div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`;
  }

  async function printBalance(){
    if(!lastReport)await generateBalance();
    if(!lastReport)return;
    const w=window.open('','_blank');
    if(!w){alert('O navegador bloqueou a janela do relatório. Libere pop-ups e tente novamente.');return;}
    w.document.open();w.document.write(buildReportHtml(lastReport));w.document.close();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.getElementById('reportBtn');if(btn){btn.innerHTML='📊 Gerar balanço';btn.onclick=generateBalance;}
    const p=document.getElementById('printReportBtn');if(p){p.onclick=printBalance;p.disabled=true;}
  });
})();