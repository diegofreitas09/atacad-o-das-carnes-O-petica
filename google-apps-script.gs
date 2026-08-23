var TZ = 'America/Fortaleza';

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_(){ return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSheets_(){
  var ss=ss_();
  var orders=ss.getSheetByName('ORCAMENTOS')||ss.insertSheet('ORCAMENTOS');
  var items=ss.getSheetByName('ITENS_ORCAMENTO')||ss.insertSheet('ITENS_ORCAMENTO');
  var products=ss.getSheetByName('PRODUTOS')||ss.insertSheet('PRODUTOS');

  if(orders.getLastRow()===0) orders.appendRow(['ID','Data/Hora','Cliente','Telefone','Recebimento','Bairro','Taxa Entrega','Endereço','Referência','Localização','Subtotal','Total','Status']);
  if(items.getLastRow()===0) items.appendRow(['ID Orçamento','Produto ID','Produto','Categoria','Quantidade','Unidade','Preço Unitário','Subtotal','Observação']);
  if(products.getLastRow()===0) products.appendRow(['ID','Categoria','Nome','Preço','Unidade','Ativo','Descrição','Imagem','Atualizado em']);
  return {orders:orders,items:items,products:products};
}

function adminOk_(pin){
  var expected=PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  return !!expected && String(pin||'')===String(expected);
}

function setAdminPinOnce(){
  PropertiesService.getScriptProperties().setProperty('ADMIN_PIN','TROQUE-AQUI-PELO-SEU-PIN');
}

function doGet(e){
  var sheets=ensureSheets_();
  var action=(e&&e.parameter&&e.parameter.action)||'products';
  if(action==='products') return json_({ok:true,products:readProducts_(sheets.products),updated_at:new Date().toISOString()});
  if(action==='report'){
    if(!adminOk_(e.parameter.pin)) return json_({ok:false,error:'não autorizado'});
    return json_(buildReport_(sheets,e.parameter));
  }
  return json_({ok:false,error:'ação inválida'});
}

function doPost(e){
  var sheets=ensureSheets_();
  var raw=e&&e.parameter?e.parameter.payload:'';
  if(!raw) return json_({ok:false,error:'payload ausente'});
  var p=JSON.parse(raw);
  var action=p.action||'order';

  if(action==='order') return saveOrder_(sheets,p);
  if(!adminOk_(p.pin)) return json_({ok:false,error:'não autorizado'});
  if(action==='updateProduct') return updateProduct_(sheets.products,p.product||{});
  if(action==='updateOrderStatus') return updateOrderStatus_(sheets.orders,p.id,p.status);
  if(action==='bulkProducts'){
    (p.products||[]).forEach(function(x){updateProduct_(sheets.products,x,true);});
    return json_({ok:true,count:(p.products||[]).length});
  }
  return json_({ok:false,error:'ação inválida'});
}

function saveOrder_(sheets,p){
  var orders=sheets.orders,items=sheets.items;
  var id=p.id||'';
  var existing=findRowByValue_(orders,1,id);
  if(!existing){
    orders.appendRow([
      id,p.criado_em?new Date(p.criado_em):new Date(),p.cliente||'',p.telefone||'',p.recebimento||'',p.bairro||'',
      Number(p.taxa_entrega||0),p.endereco||'',p.referencia||'',p.localizacao||'',Number(p.subtotal||0),Number(p.total||0),'NOVO'
    ]);
    (p.itens||[]).forEach(function(i){
      items.appendRow([id,i.id||'',i.nome||'',i.categoria||'',Number(i.quantidade||0),i.unidade||'',Number(i.preco_unitario||0),Number(i.subtotal||0),i.observacao||'']);
    });
  }
  return json_({ok:true,id:id});
}

function readProducts_(sheet){
  if(sheet.getLastRow()<2) return [];
  var v=sheet.getRange(2,1,sheet.getLastRow()-1,9).getValues();
  return v.filter(function(r){return r[0];}).map(function(r){return {id:String(r[0]),categoria:String(r[1]||''),nome:String(r[2]||''),preco:Number(r[3]||0),unidade:String(r[4]||'kg'),ativo:String(r[5]).toLowerCase()!=='false'&&String(r[5])!=='0'&&String(r[5]).toLowerCase()!=='não',descricao:String(r[6]||''),imagem:String(r[7]||''),atualizado_em:r[8] instanceof Date?r[8].toISOString():String(r[8]||'')};});
}

function updateProduct_(sheet,p,silent){
  if(!p.id) return silent?null:json_({ok:false,error:'produto sem id'});
  var row=findRowByValue_(sheet,1,String(p.id));
  var values=[[String(p.id),String(p.categoria||''),String(p.nome||''),Number(p.preco||0),String(p.unidade||'kg'),p.ativo!==false,String(p.descricao||''),String(p.imagem||''),new Date()]];
  if(row) sheet.getRange(row,1,1,9).setValues(values); else sheet.getRange(sheet.getLastRow()+1,1,1,9).setValues(values);
  SpreadsheetApp.flush();
  return silent?true:json_({ok:true,product:p,updated_at:new Date().toISOString()});
}

function updateOrderStatus_(sheet,id,status){
  var allowed=['NOVO','EM SEPARAÇÃO','PRONTO','SAIU PARA ENTREGA','CONCLUÍDO','CANCELADO'];
  if(allowed.indexOf(String(status))<0) return json_({ok:false,error:'status inválido'});
  var row=findRowByValue_(sheet,1,String(id));
  if(!row) return json_({ok:false,error:'pedido não encontrado'});
  sheet.getRange(row,13).setValue(status);
  return json_({ok:true,id:id,status:status});
}

function findRowByValue_(sheet,col,value){
  if(!value||sheet.getLastRow()<2) return 0;
  var vals=sheet.getRange(2,col,sheet.getLastRow()-1,1).getDisplayValues();
  for(var i=0;i<vals.length;i++) if(String(vals[i][0])===String(value)) return i+2;
  return 0;
}

function buildReport_(sheets,param){
  var orders=sheets.orders.getLastRow()>1?sheets.orders.getRange(2,1,sheets.orders.getLastRow()-1,13).getValues():[];
  var items=sheets.items.getLastRow()>1?sheets.items.getRange(2,1,sheets.items.getLastRow()-1,9).getValues():[];
  var from=param.from?new Date(param.from+'T00:00:00-03:00'):new Date('2000-01-01T00:00:00-03:00');
  var to=param.to?new Date(param.to+'T23:59:59-03:00'):new Date('2100-01-01T00:00:00-03:00');
  var filtered=orders.filter(function(r){var d=r[1] instanceof Date?r[1]:new Date(r[1]);return d>=from&&d<=to;});
  var ids={};filtered.forEach(function(r){ids[String(r[0])]=true;});
  var fitems=items.filter(function(r){return ids[String(r[0])];});
  var revenue=filtered.reduce(function(s,r){return s+Number(r[11]||0);},0);
  var delivery=filtered.filter(function(r){return String(r[4]).toLowerCase()==='entrega';}).length;
  var neighborhoods={},products={};
  filtered.forEach(function(r){var b=String(r[5]||'Retirada');neighborhoods[b]=(neighborhoods[b]||0)+Number(r[11]||0);});
  fitems.forEach(function(r){var k=String(r[2]||'');if(!products[k])products[k]={nome:k,quantidade:0,faturamento:0};products[k].quantidade+=Number(r[4]||0);products[k].faturamento+=Number(r[7]||0);});
  var recent=filtered.slice().sort(function(a,b){return new Date(b[1])-new Date(a[1]);}).slice(0,100).map(function(r){return{id:String(r[0]),data:r[1] instanceof Date?r[1].toISOString():String(r[1]),cliente:String(r[2]||''),telefone:String(r[3]||''),recebimento:String(r[4]||''),bairro:String(r[5]||''),endereco:String(r[7]||''),localizacao:String(r[9]||''),total:Number(r[11]||0),status:String(r[12]||'NOVO')};});
  return {ok:true,kpis:{pedidos:filtered.length,faturamento:revenue,ticket_medio:filtered.length?revenue/filtered.length:0,entregas:delivery,retiradas:filtered.length-delivery},top_produtos:Object.keys(products).map(function(k){return products[k];}).sort(function(a,b){return b.faturamento-a.faturamento;}).slice(0,15),bairros:Object.keys(neighborhoods).map(function(k){return{bairro:k,faturamento:neighborhoods[k]};}).sort(function(a,b){return b.faturamento-a.faturamento;}),pedidos:recent,generated_at:new Date().toISOString()};
}
