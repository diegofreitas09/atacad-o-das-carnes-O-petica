function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ORCAMENTOS') || ss.insertSheet('ORCAMENTOS');
  var itemsSheet = ss.getSheetByName('ITENS_ORCAMENTO') || ss.insertSheet('ITENS_ORCAMENTO');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Data/Hora','Cliente','Telefone','Recebimento','Bairro','Taxa Entrega','Endereço','Referência','Localização','Subtotal','Total']);
  }
  if (itemsSheet.getLastRow() === 0) {
    itemsSheet.appendRow(['ID Orçamento','Produto ID','Produto','Categoria','Quantidade','Unidade','Preço Unitário','Subtotal','Observação']);
  }

  var raw = e && e.parameter ? e.parameter.payload : '';
  if (!raw) return ContentService.createTextOutput(JSON.stringify({ok:false,error:'payload ausente'})).setMimeType(ContentService.MimeType.JSON);

  var p = JSON.parse(raw);
  sheet.appendRow([
    p.id || '',
    p.criado_em ? new Date(p.criado_em) : new Date(),
    p.cliente || '',
    p.telefone || '',
    p.recebimento || '',
    p.bairro || '',
    Number(p.taxa_entrega || 0),
    p.endereco || '',
    p.referencia || '',
    p.localizacao || '',
    Number(p.subtotal || 0),
    Number(p.total || 0)
  ]);

  (p.itens || []).forEach(function(i){
    itemsSheet.appendRow([
      p.id || '', i.id || '', i.nome || '', i.categoria || '',
      Number(i.quantidade || 0), i.unidade || '', Number(i.preco_unitario || 0),
      Number(i.subtotal || 0), i.observacao || ''
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({ok:true,id:p.id})).setMimeType(ContentService.MimeType.JSON);
}
