var TZ='America/Fortaleza';
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function ss_(){return SpreadsheetApp.getActiveSpreadsheet()}
function ensureSheets_(){
  var ss=ss_();
  var orders=ss.getSheetByName('ORCAMENTOS')||ss.insertSheet('ORCAMENTOS');
  var items=ss.getSheetByName('ITENS_ORCAMENTO')||ss.insertSheet('ITENS_ORCAMENTO');
  var products=ss.getSheetByName('PRODUTOS')||ss.insertSheet('PRODUTOS');
  var customers=ss.getSheetByName('CLIENTES')||ss.insertSheet('CLIENTES');
  if(orders.getLastRow()===0)orders.appendRow(['ID','Data/Hora','Cliente','Telefone','Recebimento','Bairro','Taxa Entrega','Endereço','Referência','Localização','Subtotal','Total','Status']);
  if(items.getLastRow()===0)items.appendRow(['ID Orçamento','Produto ID','Produto','Categoria','Quantidade','Unidade','Preço Unitário','Subtotal','Observação']);
  var ph=['ID','Categoria','Nome','Preço','Unidade','Ativo','Descrição','Imagem','Atualizado em','Promoção','Preço Promo','Início Promo','Fim Promo'];
  if(products.getLastRow()===0)products.appendRow(ph);else if(products.getLastColumn()<ph.length)products.getRange(1,1,1,ph.length).setValues([ph]);
  var ch=['ID Cliente','Cadastro','Nome','Telefone','Endereço','Bairro','Referência','Última Compra','Qtd Pedidos','Total Comprado','Status'];
  if(customers.getLastRow()===0)customers.appendRow(ch);else if(customers.getLastColumn()<ch.length)customers.getRange(1,1,1,ch.length).setValues([ch]);
  return{orders:orders,items:items,products:products,customers:customers};
}
function adminOk_(pin){var e=PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');return!!e&&String(pin||'')===String(e)}
function setAdminPinOnce(){PropertiesService.getScriptProperties().setProperty('ADMIN_PIN','TROQUE-AQUI-PELO-SEU-PIN')}
function phoneKey_(v){return String(v||'').replace(/\D/g,'')}
function dateText_(v){return v instanceof Date?v.toISOString():String(v||'')}
function toBool_(v,d){if(v===''||v===null||typeof v==='undefined')return d;return!['false','0','não','nao','inativo','off'].includes(String(v).toLowerCase())}
function findRowByValue_(sheet,col,value){if(!value||sheet.getLastRow()<2)return 0;var a=sheet.getRange(2,col,sheet.getLastRow()-1,1).getDisplayValues();for(var i=0;i<a.length;i++)if(String(a[i][0])===String(value))return i+2;return 0}
function findCustomerRow_(sheet,phone){var k=phoneKey_(phone);if(!k||sheet.getLastRow()<2)return 0;var a=sheet.getRange(2,4,sheet.getLastRow()-1,1).getDisplayValues();for(var i=0;i<a.length;i++)if(phoneKey_(a[i][0])===k)return i+2;return 0}
function doGet(e){
  var s=ensureSheets_(),p=e&&e.parameter?e.parameter:{},a=p.action||'products';
  if(a==='products')return json_({ok:true,products:readProducts_(s.products),updated_at:new Date().toISOString()});
  if(a==='customer')return json_(customerView_(s,p.phone));
  if(a==='report'){if(!adminOk_(p.pin))return json_({ok:false,error:'não autorizado'});return json_(buildReport_(s,p));}
  if(a==='customers'){if(!adminOk_(p.pin))return json_({ok:false,error:'não autorizado'});return json_({ok:true,customers:readCustomers_(s.customers)});}
  return json_({ok:false,error:'ação inválida'});
}
function doPost(e){
  var s=ensureSheets_(),raw=e&&e.parameter?e.parameter.payload:'';if(!raw)return json_({ok:false,error:'payload ausente'});
  var p=JSON.parse(raw),a=p.action||'order';
  if(a==='order')return saveOrder_(s,p);
  if(a==='saveCustomer')return saveCustomer_(s.customers,p.customer||{});
  if(!adminOk_(p.pin))return json_({ok:false,error:'não autorizado'});
  if(a==='updateProduct'||a==='createProduct')return updateProduct_(s.products,p.product||{});
  if(a==='updateOrderStatus')return updateOrderStatus_(s.orders,p.id,p.status);
  if(a==='bulkProducts'){(p.products||[]).forEach(function(x){updateProduct_(s.products,x,true)});return json_({ok:true,count:(p.products||[]).length});}
  if(a==='uploadImage')return uploadImage_(p);
  if(a==='updateCustomerStatus')return updateCustomerStatus_(s.customers,p.phone,p.status);
  return json_({ok:false,error:'ação inválida'});
}
function saveCustomer_(sheet,c){
  var phone=phoneKey_(c.telefone||c.phone);if(!phone)return json_({ok:false,error:'telefone obrigatório'});
  var row=findCustomerRow_(sheet,phone),now=new Date(),id=row?sheet.getRange(row,1).getValue():'CLI-'+now.getTime();
  var old=row?sheet.getRange(row,1,1,11).getValues()[0]:null;
  var values=[[id,old?old[1]:now,String(c.nome||c.name||old&&old[2]||''),phone,String(c.endereco||c.address||old&&old[4]||''),String(c.bairro||c.area||old&&old[5]||''),String(c.referencia||c.reference||old&&old[6]||''),old?old[7]:'',old?Number(old[8]||0):0,old?Number(old[9]||0):0,old?String(old[10]||'ATIVO'):'ATIVO']];
  if(row)sheet.getRange(row,1,1,11).setValues(values);else sheet.getRange(sheet.getLastRow()+1,1,1,11).setValues(values);
  return json_({ok:true,id:id});
}
function upsertCustomerFromOrder_(sheet,p){
  var phone=phoneKey_(p.telefone);if(!phone)return;
  var row=findCustomerRow_(sheet,phone),now=p.criado_em?new Date(p.criado_em):new Date();
  if(!row){sheet.appendRow(['CLI-'+new Date().getTime(),now,p.cliente||'',phone,p.endereco||'',p.bairro||'',p.referencia||'',now,1,Number(p.total||0),'ATIVO']);return;}
  var r=sheet.getRange(row,1,1,11).getValues()[0];
  sheet.getRange(row,1,1,11).setValues([[r[0],r[1]||now,p.cliente||r[2],phone,p.endereco||r[4],p.bairro||r[5],p.referencia||r[6],now,Number(r[8]||0)+1,Number(r[9]||0)+Number(p.total||0),r[10]||'ATIVO']]);
}
function saveOrder_(s,p){
  var id=p.id||'',row=findRowByValue_(s.orders,1,id);
  if(!row){
    s.orders.appendRow([id,p.criado_em?new Date(p.criado_em):new Date(),p.cliente||'',p.telefone||'',p.recebimento||'',p.bairro||'',Number(p.taxa_entrega||0),p.endereco||'',p.referencia||'',p.localizacao||'',Number(p.subtotal||0),Number(p.total||0),'NOVO']);
    (p.itens||[]).forEach(function(i){s.items.appendRow([id,i.id||'',i.nome||'',i.categoria||'',Number(i.quantidade||0),i.unidade||'',Number(i.preco_unitario||0),Number(i.subtotal||0),i.observacao||''])});
    upsertCustomerFromOrder_(s.customers,p);
  }
  return json_({ok:true,id:id});
}
function readProducts_(sheet){if(sheet.getLastRow()<2)return[];return sheet.getRange(2,1,sheet.getLastRow()-1,13).getValues().filter(function(r){return r[0]}).map(function(r){return{id:String(r[0]),categoria:String(r[1]||''),nome:String(r[2]||''),preco:Number(r[3]||0),unidade:String(r[4]||'kg'),ativo:toBool_(r[5],true),descricao:String(r[6]||''),imagem:String(r[7]||''),atualizado_em:dateText_(r[8]),promocao:toBool_(r[9],false),preco_promocional:Number(r[10]||0),promo_inicio:dateText_(r[11]),promo_fim:dateText_(r[12])}})}
function readCustomers_(sheet){if(sheet.getLastRow()<2)return[];return sheet.getRange(2,1,sheet.getLastRow()-1,11).getValues().filter(function(r){return r[0]}).map(function(r){return{id:String(r[0]),cadastro:dateText_(r[1]),nome:String(r[2]||''),telefone:String(r[3]||''),endereco:String(r[4]||''),bairro:String(r[5]||''),referencia:String(r[6]||''),ultima_compra:dateText_(r[7]),pedidos:Number(r[8]||0),total:Number(r[9]||0),status:String(r[10]||'ATIVO')}})}
function customerView_(s,phone){var row=findCustomerRow_(s.customers,phone);if(!row)return{ok:true,found:false};var r=s.customers.getRange(row,1,1,11).getValues()[0],key=phoneKey_(phone);var orders=s.orders.getLastRow()>1?s.orders.getRange(2,1,s.orders.getLastRow()-1,13).getValues():[];var mine=orders.filter(function(o){return phoneKey_(o[3])===key}).sort(function(a,b){return new Date(b[1])-new Date(a[1])}).slice(0,20).map(function(o){return{id:String(o[0]),data:dateText_(o[1]),total:Number(o[11]||0),status:String(o[12]||'NOVO'),recebimento:String(o[4]||'')}});return{ok:true,found:true,customer:{id:String(r[0]),nome:String(r[2]||''),telefone:String(r[3]||''),endereco:String(r[4]||''),bairro:String(r[5]||''),referencia:String(r[6]||''),pedidos:Number(r[8]||0),total:Number(r[9]||0),ultima_compra:dateText_(r[7])},orders:mine}}
function updateProduct_(sheet,p,silent){if(!p.id)p.id=slug_(p.nome||'produto')+'-'+new Date().getTime();var row=findRowByValue_(sheet,1,String(p.id));var v=[[String(p.id),String(p.categoria||''),String(p.nome||''),Number(p.preco||0),String(p.unidade||'kg'),p.ativo!==false,String(p.descricao||''),String(p.imagem||''),new Date(),p.promocao===true,Number(p.preco_promocional||0),p.promo_inicio?new Date(p.promo_inicio+'T00:00:00-03:00'):'',p.promo_fim?new Date(p.promo_fim+'T23:59:59-03:00'):'']];if(row)sheet.getRange(row,1,1,13).setValues(v);else sheet.getRange(sheet.getLastRow()+1,1,1,13).setValues(v);SpreadsheetApp.flush();return silent?true:json_({ok:true,product:p,updated_at:new Date().toISOString()})}
function slug_(s){return String(s||'produto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}
function uploadImage_(p){if(!p.data)return json_({ok:false,error:'imagem ausente'});var m=String(p.data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);if(!m)return json_({ok:false,error:'formato de imagem inválido'});var it=DriveApp.getFoldersByName('O_PEITICA_PRODUTOS'),folder=it.hasNext()?it.next():DriveApp.createFolder('O_PEITICA_PRODUTOS');var ext=m[1].indexOf('png')>=0?'png':m[1].indexOf('webp')>=0?'webp':'jpg';var file=folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]),m[1],slug_(p.nome||'produto')+'-'+new Date().getTime()+'.'+ext));file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);return json_({ok:true,url:'https://drive.google.com/uc?export=view&id='+file.getId(),file_id:file.getId()})}
function updateOrderStatus_(sheet,id,status){var allowed=['NOVO','EM SEPARAÇÃO','PRONTO','SAIU PARA ENTREGA','CONCLUÍDO','CANCELADO'];if(allowed.indexOf(String(status))<0)return json_({ok:false,error:'status inválido'});var row=findRowByValue_(sheet,1,String(id));if(!row)return json_({ok:false,error:'pedido não encontrado'});sheet.getRange(row,13).setValue(status);return json_({ok:true,id:id,status:status})}
function updateCustomerStatus_(sheet,phone,status){var row=findCustomerRow_(sheet,phone);if(!row)return json_({ok:false,error:'cliente não encontrado'});sheet.getRange(row,11).setValue(String(status||'ATIVO'));return json_({ok:true})}
function periodSummary_(orders,start,end){var f=orders.filter(function(r){var d=r[1]instanceof Date?r[1]:new Date(r[1]);return d>=start&&d<=end});var rev=f.reduce(function(s,r){return s+Number(r[11]||0)},0);return{pedidos:f.length,faturamento:rev,ticket_medio:f.length?rev/f.length:0}}
function buildReport_(s,p){
  var orders=s.orders.getLastRow()>1?s.orders.getRange(2,1,s.orders.getLastRow()-1,13).getValues():[],items=s.items.getLastRow()>1?s.items.getRange(2,1,s.items.getLastRow()-1,9).getValues():[];
  var from=p.from?new Date(p.from+'T00:00:00-03:00'):new Date('2000-01-01T00:00:00-03:00'),to=p.to?new Date(p.to+'T23:59:59-03:00'):new Date('2100-01-01T00:00:00-03:00');
  var filtered=orders.filter(function(r){var d=r[1]instanceof Date?r[1]:new Date(r[1]);return d>=from&&d<=to}),ids={};filtered.forEach(function(r){ids[String(r[0])]=true});var fitems=items.filter(function(r){return ids[String(r[0])]});
  var rev=filtered.reduce(function(s,r){return s+Number(r[11]||0)},0),delivery=filtered.filter(function(r){return String(r[4]).toLowerCase()==='entrega'}).length,nb={},prod={};
  filtered.forEach(function(r){var b=String(r[5]||'Retirada');nb[b]=(nb[b]||0)+Number(r[11]||0)});fitems.forEach(function(r){var k=String(r[2]||'');if(!prod[k])prod[k]={nome:k,quantidade:0,faturamento:0};prod[k].quantidade+=Number(r[4]||0);prod[k].faturamento+=Number(r[7]||0)});
  var recent=filtered.slice().sort(function(a,b){return new Date(b[1])-new Date(a[1])}).slice(0,200).map(function(r){return{id:String(r[0]),data:dateText_(r[1]),cliente:String(r[2]||''),telefone:String(r[3]||''),recebimento:String(r[4]||''),bairro:String(r[5]||''),taxa:Number(r[6]||0),endereco:String(r[7]||''),referencia:String(r[8]||''),localizacao:String(r[9]||''),subtotal:Number(r[10]||0),total:Number(r[11]||0),status:String(r[12]||'NOVO')}});
  var now=new Date(),dayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()),dayEnd=new Date(dayStart.getTime()+86400000-1),dow=(now.getDay()+6)%7,weekStart=new Date(dayStart.getTime()-dow*86400000),weekEnd=new Date(weekStart.getTime()+7*86400000-1),monthStart=new Date(now.getFullYear(),now.getMonth(),1),monthEnd=new Date(now.getFullYear(),now.getMonth()+1,1);monthEnd=new Date(monthEnd.getTime()-1);
  return{ok:true,kpis:{pedidos:filtered.length,faturamento:rev,ticket_medio:filtered.length?rev/filtered.length:0,entregas:delivery,retiradas:filtered.length-delivery},periodos:{hoje:periodSummary_(orders,dayStart,dayEnd),semana:periodSummary_(orders,weekStart,weekEnd),mes:periodSummary_(orders,monthStart,monthEnd)},clientes:{cadastrados:Math.max(0,s.customers.getLastRow()-1)},top_produtos:Object.keys(prod).map(function(k){return prod[k]}).sort(function(a,b){return b.faturamento-a.faturamento}).slice(0,20),bairros:Object.keys(nb).map(function(k){return{bairro:k,faturamento:nb[k]}}).sort(function(a,b){return b.faturamento-a.faturamento}),pedidos:recent,generated_at:new Date().toISOString()};
}