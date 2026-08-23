# O Peitica — PWA de pedidos

Catálogo PWA do Atacadão da Carne O Peitica, com preços dinâmicos via Google Sheets, carrinho por peso, retirada/entrega, PDF e envio do pedido pelo WhatsApp.

## Atualização de preços

A aplicação usa estratégia **network-first** para os dados e **cache-first** apenas para a interface. Ao abrir o app ou tocar em **Atualizar preços**, a consulta da planilha recebe um parâmetro anti-cache (`_t=timestamp`) para evitar preços antigos presos no navegador/PWA.

## Configuração

Edite `config.js` e informe `SHEET_CSV_URL` com a URL CSV publicada da planilha Google Sheets. O Instagram também pode ser configurado no mesmo arquivo.

## Colunas da planilha

`id,categoria,nome,preco,unidade,ativo,descricao,imagem`

Exemplo: `bife-bovino,Bovino,Bife,39,kg,SIM,Bife bovino,`

## Publicação

O repositório inclui workflow do GitHub Pages em `.github/workflows/pages.yml`.
