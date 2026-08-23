/* Correção robusta do painel O Peitica Gestão: KPIs por data local e clientes derivados dos pedidos quando necessário. */
(function(){
  const moneyFix=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  let lastReportOrders=[];

  function parseOrderDate(v){
    if(!v)return null;
    if(v instanceof Date)return isNaN(v)?null:v;
    const s=String(v).trim();
    let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m){
      const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
      return isNaN(d)?null:d;
    }
    m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if(m){
      const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
      return isNaN(d)?null:d;
    }
    const d=new Date(s);
    return isNaN(d)?null:d;
  }
  function dayStart(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
  function sameOrAfter(d,a){return d&&d.getTime()>=a.getTime()}
  function before(d,b){return d&&d.getTime()<b.getTime()}
  function validOrder(o){return String(o?.status||'').toUpperCase()!=='CANCELADO'}
  function summarize(rows,start,end){
    const filtered=(rows||[]).filter(o=>{
      if(!validOrder(o))return false;
      const d=parseOrderDate(o.data||o.data_hora||o.criado_em);
      return d&&sameOrAfter(d,start)&&before(d,end);
    });
    return {pedidos:filtered.length,faturamento:filtered.reduce((s,o)=>s+(Number(o.total)||0),0)};
  }
  function localPeriods(rows){
    const now=new Date(),today=dayStart(now),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
    const week=new Date(today);const dow=(week.getDay()+6)%7;week.setDate(week.getDate()-dow);
    const month=new Date(today.getFullYear(),today.getMonth(),1);
    return {
      hoje:summarize(rows,today,tomorrow),
      semana:summarize(rows,week,tomorrow),
      mes:summarize(rows,month,tomorrow)
    };
  }
  function phoneKey(v){return String(v||'').replace(/\D/g,'')}
  function deriveCustomers(rows,existing){
    const map=new Map();
    (existing||[]).forEach(c=>{
      const k=phoneKey(c.telefone||c.phone)||String(c.id||'');
      if(!k)return;
      map.set(k,{...c,pedidos:Number(c.pedidos)||0,total:Number(c.total)||0});
    });
    (rows||[]).filter(validOrder).forEach(o=>{
      const k=phoneKey(o.telefone||o.phone);
      if(!k)return;
      const d=parseOrderDate(o.data||o.data_hora||o.criado_em);
      const cur=map.get(k)||{id:'CLI-'+k,nome:o.cliente||o.nome||'Cliente',telefone:o.telefone||o.phone||'',bairro:o.bairro||'',endereco:o.endereco||'',referencia:o.referencia||'',cadastro:d||'',ultima_compra:d||'',pedidos:0,total:0,status:'ATIVO'};
      if(!cur.nome||cur.nome==='Cliente')cur.nome=o.cliente||o.nome||cur.nome;
      cur.telefone=cur.telefone||o.telefone||o.phone||'';
      cur.bairro=cur.bairro||o.bairro||'';
      cur.endereco=cur.endereco||o.endereco||'';
      cur.referencia=cur.referencia||o.referencia||'';
      const oldLast=parseOrderDate(cur.ultima_compra),oldFirst=parseOrderDate(cur.cadastro);
      if(d&&(!oldLast||d>oldLast))cur.ultima_compra=d;
      if(d&&(!oldFirst||d<oldFirst))cur.cadastro=d;
      cur.pedidos=(Number(cur.__derivedPedidos)||0)+1;
      cur.__derivedPedidos=cur.pedidos;
      cur.total=(Number(cur.__derivedTotal)||0)+(Number(o.total)||0);
      cur.__derivedTotal=cur.total;
      map.set(k,cur);
    });
    return [...map.values()].map(c=>{delete c.__derivedPedidos;delete c.__derivedTotal;return c});
  }

  const oldRenderReport=window.renderReport;
  window.renderReport=function(d){
    const rows=Array.isArray(d?.pedidos)?d.pedidos:[];
    lastReportOrders=rows;
    const p=localPeriods(rows);
    const k=d?.kpis||{};
    const top=d?.top_produtos||[],bairros=d?.bairros||[];

    const kpis=document.querySelector('#kpis');
    if(kpis)kpis.innerHTML=[['Pedidos',k.pedidos||rows.filter(validOrder).length],['Faturamento',moneyFix(k.faturamento ?? rows.filter(validOrder).reduce((s,o)=>s+(Number(o.total)||0),0))],['Ticket médio',moneyFix(k.ticket_medio ?? 0)],['Entregas',k.entregas||0],['Retiradas',k.retiradas||0]].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');

    const put=(id,val)=>{const el=document.querySelector(id);if(el)el.textContent=val};
    put('#todayRevenue',moneyFix(p.hoje.faturamento));put('#todayOrders',`${p.hoje.pedidos} pedidos`);
    put('#weekRevenue',moneyFix(p.semana.faturamento));put('#weekOrders',`${p.semana.pedidos} pedidos`);
    put('#monthRevenue',moneyFix(p.mes.faturamento));put('#monthOrders',`${p.mes.pedidos} pedidos`);

    if(!Array.isArray(window.customers))window.customers=[];
    window.customers=deriveCustomers(rows,window.customers);
    customers=window.customers;
    put('#customerCount',String(customers.length));
    if(typeof renderCustomers==='function')renderCustomers();

    const tp=document.querySelector('#topProducts');if(tp)tp.innerHTML=top.map((x,i)=>`<div class="ranking-row"><span>${i+1}. ${esc(x.nome)}</span><strong>${moneyFix(x.faturamento)}</strong></div>`).join('')||'Sem vendas no período.';
    const nb=document.querySelector('#neighborhoods');if(nb)nb.innerHTML=bairros.map(x=>`<div class="ranking-row"><span>${esc(x.bairro)}</span><strong>${moneyFix(x.faturamento)}</strong></div>`).join('')||'Sem entregas no período.';
    if(typeof renderOrders==='function')renderOrders(rows);
  };

  const oldLoadCustomers=window.loadCustomers;
  window.loadCustomers=async function(){
    try{
      const d=await apiGet('customers',{pin:adminPin});
      if(d.ok&&Array.isArray(d.customers)&&d.customers.length){
        customers=deriveCustomers(lastReportOrders,d.customers);
        window.customers=customers;
        renderCustomers();
        const c=document.querySelector('#customerCount');if(c)c.textContent=String(customers.length);
        return;
      }
    }catch(e){console.warn('[Gestão clientes]',e)}
    if(!lastReportOrders.length){
      try{const r=await apiGet('report',{pin:adminPin});if(r.ok&&Array.isArray(r.pedidos)){lastReportOrders=r.pedidos;window.renderReport(r);return}}catch(e){console.warn('[Gestão fallback clientes]',e)}
    }
    customers=deriveCustomers(lastReportOrders,customers||[]);window.customers=customers;renderCustomers();
    const c=document.querySelector('#customerCount');if(c)c.textContent=String(customers.length);
  };

  const oldLoadReport=window.loadReport;
  window.loadReport=async function(){
    const d=await apiGet('report',{pin:adminPin,from:document.querySelector('#fromDate')?.value||'',to:document.querySelector('#toDate')?.value||''});
    if(!d.ok)throw new Error(d.error||'Erro');
    window.renderReport(d);
  };

  document.addEventListener('DOMContentLoaded',()=>{
    setInterval(()=>{
      if(document.hidden||!adminPin)return;
      apiGet('report',{pin:adminPin}).then(d=>{if(d.ok)window.renderReport(d)}).catch(()=>{});
    },10000);
  });
})();
