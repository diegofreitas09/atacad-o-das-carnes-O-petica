const cfg = window.APP_CONFIG;
const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const state = { products: [], cart: [], category: 'Todos', query: '' };

const $ = s => document.querySelector(s);
const grid = $('#productGrid');
const tabs = $('#categoryTabs');
const syncLabel = $('#syncLabel');
const syncTime = $('#syncTime');
const syncDot = $('#syncDot');

function setSync(status, label, detail=''){
  syncDot.className = 'dot' + (status ? ` ${status}` : '');
  syncLabel.textContent = label;
  syncTime.textContent = detail;
}

function parseCSV(text){
  const rows=[]; let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"' && q && n==='"'){cell+='"';i++;continue;}
    if(c==='"'){q=!q;continue;}
    if(c===',' && !q){row.push(cell);cell='';continue;}
    if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';continue;}
    cell+=c;
  }
  row.push(cell); if(row.some(x=>x.trim())) rows.push(row);
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>h.trim().toLowerCase());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??'').trim()])));
}

function normalizeProduct(p, index){
  const rawPrice = String(p.preco ?? p.price ?? '0').replace(/\s/g,'').replace('R$','').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');
  return {
    id: p.id || `produto-${index}`,
    categoria: p.categoria || p.category || 'Outros',
    nome: p.nome || p.name || `Produto ${index+1}`,
    preco: Number(rawPrice) || 0,
    unidade: (p.unidade || p.unit || 'kg').toLowerCase(),
    ativo: !['não','nao','false','0','inativo'].includes(String(p.ativo ?? 'sim').toLowerCase()),
    descricao: p.descricao || p.description || '',
    imagem: p.imagem || p.image || ''
  };
}

async function fetchFreshProducts(){
  if(!cfg.SHEET_CSV_URL) throw new Error('sheet-not-configured');
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),cfg.DATA_TIMEOUT_MS||7000);
  try{
    const sep=cfg.SHEET_CSV_URL.includes('?')?'&':'?';
    const url=`${cfg.SHEET_CSV_URL}${sep}_t=${Date.now()}`;
    const res=await fetch(url,{cache:'no-store',signal:ctrl.signal,headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=parseCSV(await res.text()).map(normalizeProduct).filter(p=>p.ativo);
    if(!data.length) throw new Error('planilha-vazia');
    localStorage.setItem('opeitica:lastProducts',JSON.stringify(data));
    localStorage.setItem('opeitica:lastSync',new Date().toISOString());
    return data;
  } finally { clearTimeout(timer); }
}

async function loadProducts({manual=false}={}){
  setSync('',manual?'Atualizando preços...':'Buscando preços atuais...','Conectando à planilha');
  try{
    state.products=await fetchFreshProducts();
    const now=new Date();
    setSync('ok','Preços atualizados',`Agora, ${now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`);
  }catch(err){
    const cached=localStorage.getItem('opeitica:lastProducts');
    if(cached){
      state.products=JSON.parse(cached);
      const t=localStorage.getItem('opeitica:lastSync');
      setSync('error','Sem conexão com a planilha',t?`Mostrando última atualização: ${new Date(t).toLocaleString('pt-BR')}`:'Mostrando valores salvos');
    } else {
      state.products=(window.SEED_PRODUCTS||[]).filter(p=>p.ativo!==false);
      setSync(cfg.SHEET_CSV_URL?'error':'','Catálogo inicial',cfg.SHEET_CSV_URL?'Falha ao consultar a planilha':'Conecte a planilha no config.js');
    }
  }
  buildTabs(); renderProducts();
}

function buildTabs(){
  const cats=['Todos',...new Set(state.products.map(p=>p.categoria))];
  if(!cats.includes(state.category)) state.category='Todos';
  tabs.innerHTML='';
  cats.forEach(cat=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=cat; b.className=cat===state.category?'active':'';
    b.onclick=()=>{state.category=cat;buildTabs();renderProducts();}; tabs.appendChild(b);
  });
}

function renderProducts(){
  const term=state.query.trim().toLowerCase();
  const items=state.products.filter(p=>(state.category==='Todos'||p.categoria===state.category)&&(!term||`${p.nome} ${p.categoria} ${p.descricao||''}`.toLowerCase().includes(term)));
  grid.innerHTML='';
  if(!items.length){grid.innerHTML='<p class="empty">Nenhum produto encontrado.</p>';return;}
  items.forEach(p=>{
    const node=$('#productTemplate').content.cloneNode(true);
    const card=node.querySelector('.product-card');
    node.querySelector('h3').textContent=p.nome;
    node.querySelector('.category-badge').textContent=p.categoria;
    node.querySelector('.description').textContent=p.descricao||'';
    node.querySelector('.price').textContent=money(p.preco);
    node.querySelector('.unit-label').textContent=p.unidade==='kit'?'/ kit':'/ kg';
    const controls=node.querySelector('.weight-controls');
    let grams=p.unidade==='kit'?1000:1000;
    if(p.unidade==='kit') controls.style.display='none';
    controls?.querySelectorAll('button[data-weight]').forEach(b=>b.onclick=()=>{
      grams=Number(b.dataset.weight); controls.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); controls.querySelector('.custom-weight').value='';
    });
    const custom=controls?.querySelector('.custom-weight');
    if(custom) custom.oninput=()=>{if(custom.value){grams=Math.max(1,Number(custom.value));controls.querySelectorAll('button').forEach(x=>x.classList.remove('active'));}};
    node.querySelector('.add-btn').onclick=()=>{
      const note=node.querySelector('.note').value.trim();
      const qty=p.unidade==='kit'?1:grams/1000;
      const item={key:`${p.id}-${Date.now()}-${Math.random()}`,id:p.id,nome:p.nome,preco:p.preco,unidade:p.unidade,qty,grams:p.unidade==='kit'?null:grams,note,total:p.unidade==='kit'?p.preco:p.preco*qty};
      state.cart.push(item); updateCart(); openCart();
    };
    grid.appendChild(node);
  });
}

function updateCart(){
  $('#cartCount').textContent=state.cart.length;
  const wrap=$('#cartItems'); wrap.innerHTML='';
  if(!state.cart.length) wrap.innerHTML='<div class="empty">Sua cesta está vazia.</div>';
  state.cart.forEach(item=>{
    const el=document.createElement('div'); el.className='cart-item';
    el.innerHTML=`<div><strong>${item.nome}</strong><br><small>${item.unidade==='kit'?'1 kit':`${item.grams}g`} • ${money(item.total)}${item.note?`<br>Obs.: ${escapeHTML(item.note)}`:''}</small></div><button type="button">Remover</button>`;
    el.querySelector('button').onclick=()=>{state.cart=state.cart.filter(x=>x.key!==item.key);updateCart();}; wrap.appendChild(el);
  });
  updateTotals();
}

function escapeHTML(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function fulfillment(){return document.querySelector('input[name="fulfillment"]:checked')?.value||'retirada';}
function updateTotals(){
  const subtotal=state.cart.reduce((a,b)=>a+b.total,0);
  const delivery=fulfillment()==='entrega'?Number(cfg.DELIVERY_FEE||0):0;
  $('#subtotal').textContent=money(subtotal); $('#deliveryFee').textContent=money(delivery); $('#grandTotal').textContent=money(subtotal+delivery);
  $('#deliveryRow').classList.toggle('is-hidden',fulfillment()!=='entrega');
  $('#deliveryFields').classList.toggle('is-hidden',fulfillment()!=='entrega');
}

function openCart(){$('#cartSheet').classList.add('open');$('#cartSheet').setAttribute('aria-hidden','false');}
function closeCart(){$('#cartSheet').classList.remove('open');$('#cartSheet').setAttribute('aria-hidden','true');}

function buildOrderText(){
  if(!state.cart.length) return '';
  const type=fulfillment(); const subtotal=state.cart.reduce((a,b)=>a+b.total,0); const delivery=type==='entrega'?Number(cfg.DELIVERY_FEE||0):0;
  const lines=[`*PEDIDO - ${cfg.BUSINESS_NAME}*`,''];
  state.cart.forEach((i,n)=>{lines.push(`${n+1}. *${i.nome}*`,`Quantidade: ${i.unidade==='kit'?'1 kit':`${i.grams}g`}`,`Valor: ${money(i.total)}`);if(i.note)lines.push(`Obs.: ${i.note}`);lines.push('');});
  lines.push(`*Produtos:* ${money(subtotal)}`,`*Forma:* ${type==='entrega'?'ENTREGA':'RETIRADA'}`);
  if(type==='entrega'){
    const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim(),addr=$('#customerAddress').value.trim(),ref=$('#customerReference').value.trim();
    if(name)lines.push(`Cliente: ${name}`); if(phone)lines.push(`Telefone: ${phone}`); if(addr)lines.push(`Endereço: ${addr}`); if(ref)lines.push(`Referência: ${ref}`); if(delivery)lines.push(`Entrega: ${money(delivery)}`);
  }
  lines.push(`*TOTAL: ${money(subtotal+delivery)}*`); return lines.join('\n');
}

$('#refreshBtn').onclick=()=>loadProducts({manual:true});
$('#searchInput').oninput=e=>{state.query=e.target.value;renderProducts();};
$('#cartFab').onclick=openCart; document.querySelectorAll('[data-close-cart]').forEach(x=>x.onclick=closeCart);
document.querySelectorAll('input[name="fulfillment"]').forEach(x=>x.onchange=updateTotals);
$('#sendBtn').onclick=()=>{const text=buildOrderText();if(!text)return alert('Adicione produtos à cesta.');window.open(`https://wa.me/${cfg.WHATSAPP}?text=${encodeURIComponent(text)}`,'_blank','noopener');};
$('#pdfBtn').onclick=()=>{if(!state.cart.length)return alert('Adicione produtos à cesta.');window.print();};
$('#mapsLink').href=cfg.MAPS_URL; $('#whatsappTop').href=`https://wa.me/${cfg.WHATSAPP}`;
if(cfg.INSTAGRAM_URL){$('#instagramLink').href=cfg.INSTAGRAM_URL;$('#instagramLink').classList.remove('is-disabled');}

window.addEventListener('focus',()=>{const last=Number(localStorage.getItem('opeitica:lastFocusRefresh')||0);if(Date.now()-last>60000){localStorage.setItem('opeitica:lastFocusRefresh',Date.now());loadProducts();}});
window.addEventListener('online',()=>loadProducts());
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
loadProducts(); updateCart();
