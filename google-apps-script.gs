var TZ = 'America/Fortaleza';
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function ss_(){return SpreadsheetApp.getActiveSpreadsheet();}
function ensureSheets_(){
  var ss=ss_(),orders=ss.getSheetByName('ORCAMENTOS')||ss.insertSheet('ORCAMENTOS'),items=ss.getSheetByName('ITENS_ORCAMENTO')||ss.insertSheet('ITENS_ORCAMENTO'),products=ss.getSheetByName('PRODUTOS')||ss.insertSheet('PRODUTOS');
  if(orders.getLastRow()===0)orders.appendRow(['ID','Data/Hora','Cliente','Telefone','Recebimento','Bairro','Taxa Entrega','Endereço','Referência','Localização','Subtotal','Total','Status']);
  if(items.getLastRow()===0)items.appendRow(['ID Orçamento','Produto ID','Produto','Categoria','Quantidade','Unidade','Preço Unitário','Subtotal','Observação']);
  var productHeaders=['ID','Categoria','Nome','Preço','Unidade','Ativo','Descrição','Imagem','Atualizado em','Promoção','Preço Promo','Início Promo','Fim Promo'];
  if(products.getLastRow()===0)products.appendRow(productHeaders);else if(products.getLastColumn()<productHeaders.length)products.getRange(1,1,1,productHeaders.length).setValues([productHeaders]);
  return{orders:orders,items:items,products:products};
}
function adminOk_(pin){var expected=PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');return!!expected&&String(pin||'')===String(expected);}
function setAdminPinOnce(){PropertiesService.getScriptProperties().setProperty('ADMIN_PIN','TROQUE-AQUI-PELO-SEU-PIN');}
function doGet(e){var sheets=ensureSheets_(),action=(e&&e.parameter&&e.parameter.action)||'products';if(action==='products')return json_({ok:true,products:readProducts_(sheets.products),updated_at:new Date().toISOString()});if(action==='report'){if(!adminOk_(e.parameter.pin))return json_({ok:false,error:'não autorizado'});return json_(buildReport_(sheets,e.parameter));}return json_({ok:false,error:'ação inválida'});}
function doPost(e){
  var sheets=ensureSheets_(),raw=e&&e.parameter?e.parameter.payload:'';if(!raw)return json_({ok:false,error:'payload ausente'});var p=JSON.parse(raw),action=p.action||'order';
  if(action==='order')return saveOrder_(sheets,p);
  if(!adminOk_(p.pin))return json_({ok:false,error:'não autorizado'});
  if(action==='updateProduct'||action==='createProduct')return updateProduct_(sheets.products,p.product||{});
  if(action==='updateOrderStatus')return updateOrderStatus_(sheets.orders,p.id,p.status);
  if(action==='bulkProducts'){(p.products||[]).forEach(function(x){updateProduct_(sheets.products,x,true);});return json_({ok:true,count:(p.products||[]).length});}
  if(action==='uploadImage')return uploadImage_(p);
  return json_({ok:false,error:'ação inválida'});
}
function saveOrder_(sheets,p){var orders=sheets.orders,items=sheets.items,id=p.id||'',existing=findRowByValue_(orders,1,id);if(!existing){orders.appendRow([id,p.criado_em?new Date(p.criado_em):new Date(),p.cliente||'',p.telefone||'',p.recebimento||'',p.bairro||'',Number(p.taxa_entrega||0),p.endereco||'',p.referencia||'',p.localizacao||'',Number(p.subtotal||0),Number(p.total||0),'NOVO']);(p.itens||[]).forEach(function(i){items.appendRow([id,i.id||'',i.nome||'',i.categoria||'',Number(i.quantidade||0),i.unidade||'',Number(i.preco_unitario||0),Number(i.subtotal||0),i.observacao||'']);});}return json_({ok:true,id:id});}
function readProducts_(sheet){if(sheet.getLastRow()<2)return[];var v=sheet.getRange(2,1,sheet.getLastRow()-1,13).getValues();return v.filter(function(r){return r[0];}).map(function(r){return{id:String(r[0]),categoria:String(r[1]||''),nome:String(r[2]||''),preco:Number(r[3]||0),unidade:String(r[4]||'kg'),ativo:toBool_(r[5],true),descricao:String(r[6]||''),imagem:String(r[7]||''),atualizado_em:dateText_(r[8]),promocao:toBool_(r[9],false),preco_promocional:Number(r[10]||0),promo_inicio:dateText_(r[11]),promo_fim:dateText_(r[12])};});}
function toBool_(v,def){if(v===''||v===null||typeof v==='undefined')return def;var s=String(v).toLowerCase();return!['false','0','não','nao','inativo','off'].includes(s);}
function dateText_(v){return v instanceof Date?v.toISOString():String(v||'');}
function updateProduct_(sheet,p,silent){
  if(!p.id)p.id=slug_(p.nome||'produto')+'-'+new Date().getTime();
  var row=findRowByValue_(sheet,1,String(p.id));
  var values=[[String(p.id),String(p.categoria||''),String(p.nome||''),Number(p.preco||0),String(p.unidade||'kg'),p.ativo!==false,String(p.descricao||''),String(p.imagem||''),new Date(),p.promocao===true,Number(p.preco_promocional||0),p.promo_inicio?new Date(p.promo_inicio+'T00:00:00-03:00'):'',p.promo_fim?new Date(p.promo_fim+'T23:59:59-03:00'):'']];
  if(row)sheet.getRange(row,1,1,13).setValues(values);else sheet.getRange(sheet.getLastRow()+1,1,1,13).setValues(values);SpreadsheetApp.flush();return silent?true:json_({ok:true,product:p,updated_at:new Date().toISOString()});
}
function slug_(s){return String(s||'produto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
function uploadImage_(p){
  if(!p.data)return json_({ok:false,error:'imagem ausente'});
  var m=String(p.data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);if(!m)return json_({ok:false,error:'formato de imagem inválido'});
  var folderIt=DriveApp.getFoldersByName('O_PEITICA_PRODUTOS'),folder=folderIt.hasNext()?folderIt.next():DriveApp.createFolder('O_PEITICA_PRODUTOS');
  var ext=m[1].indexOf('png')>=0?'png':m[1].indexOf('webp')>=0?'webp':'jpg',name=slug_(p.nome||'produto')+'-'+new Date().getTime()+'.'+ext;
  var file=folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]),m[1],name));file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  return json_({ok:true,url:'https://drive.google.com/uc?export=view&id='+file.getId(),file_id:file.getId()});
}
function updateOrderStatus_(sheet,id,status){var allowed=['NOVO','EM SEPARAÇÃO','PRONTO','SAIU PARA ENTREGA','CONCLUÍDO','CANCELADO'];if(allowed.indexOf(String(status))<0)return json_({ok:false,error:'status inválido'});var row=findRowByValue_(sheet,1,String(id));if(!row)return json_({ok:false,error:'pedido não encontrado'});sheet.getRange(row,13).setValue(status);return json_({ok:true,id:id,status:status});}
function findRowByValue_(sheet,col,value){if(!value||sheet.getLastRow()<2)return 0;var vals=sheet.getRange(2,col,sheet.getLastRow()-1,1).getDisplayValues();for(var i=0;i<vals.length;i++)if(String(vals[i][0])===String(value))return i+2;return 0;}
function buildReport_(sheets,param){
  var orders=sheets.orders.getLastRow()>1?sheets.orders.getRange(2,1,sheets.orders.getLastRow()-1,13).getValues():[],items=sheets.items.getLastRow()>1?sheets.items.getRange(2,1,sheets.items.getLastRow()-1,9).getValues():[];
  var from=param.from?new Date(param.from+'T00:00:00-03:00'):new Date('2000-01-01T00:00:00-03:00'),to=param.to?new Date(param.to+'T23:59:59-03:00'):new Date('2100-01-01T00:00:00-03:00');
  var filtered=orders.filter(function(r){var d=r[1]instanceof Date?r[1]:new Date(r[1]);return d>=from&&d<=to;}),ids={};filtered.forEach(function(r){ids[String(r[0])]=true;});var fitems=items.filter(function(r){return ids[String(r[0])];});
  var revenue=filtered.reduce(function(s,r){return s+Number(r[11]||0);},0),delivery=filtered.filter(function(r){return String(r[4]).toLowerCase()==='entrega';}).length,neighborhoods={},products={},statuses={};
  filtered.forEach(function(r){var b=String(r[5]||'Retirada'),st=String(r[12]||'NOVO');neighborhoods[b]=(neighborhoods[b]||0)+Number(r[11]||0);statuses[st]=(statuses[st]||0)+1;});
  fitems.forEach(function(r){var k=String(r[2]||'');if(!products[k])products[k]={nome:k,quantidade:0,faturamento:0};products[k].quantidade+=Number(r[4]||0);products[k].faturamento+=Number(r[7]||0);});
  var recent=filtered.slice().sort(function(a,b){return new Date(b[1])-new Date(a[1]);}).slice(0,200).map(function(r){return{id:String(r[0]),data:r[1]instanceof Date?r[1].toISOString():String(r[1]),cliente:String(r[2]||''),telefone:String(r[3]||''),recebimento:String(r[4]||''),bairro:String(r[5]||''),taxa:Number(r[6]||0),endereco:String(r[7]||''),referencia:String(r[8]||''),localizacao:String(r[9]||''),subtotal:Number(r[10]||0),total:Number(r[11]||0),status:String(r[12]||'NOVO')};});
  return{ok:true,kpis:{pedidos:filtered.length,faturamento:revenue,ticket_medio:filtered.length?revenue/filtered.length:0,entregas:delivery,retiradas:filtered.length-delivery},status:statuses,top_produtos:Object.keys(products).map(function(k){return products[k];}).sort(function(a,b){return b.faturamento-a.faturamento;}).slice(0,20),bairros:Object.keys(neighborhoods).map(function(k){return{bairro:k,faturamento:neighborhoods[k]};}).sort(function(a,b){return b.faturamento-a.faturamento;}),pedidos:recent,generated_at:new Date().toISOString()};
}
