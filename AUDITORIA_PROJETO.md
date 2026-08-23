# Auditoria consolidada — PWA Atacadão da Carne O Peitica

Data da auditoria: 23/08/2026

## Objetivo
Transformar o catálogo em um balcão digital mobile/PWA, com preços dinâmicos, cesta única, orçamento em PDF, entrega/retirada e fechamento via WhatsApp.

## Funcionalidades auditadas e implementadas

- [x] PWA instalável e responsiva.
- [x] Paleta baseada na identidade vermelho, preto e branco.
- [x] Endereço da loja: Rua Edison Martins, 530, Fortaleza/CE.
- [x] Botão de localização/Google Maps da loja.
- [x] Instagram oficial conectado.
- [x] WhatsApp Business oficial conectado.
- [x] Catálogo com Bovino, Suíno e Kits.
- [x] Nomes ambíguos diferenciados: Bisteca Suína/Bovina, Bife Suíno/Bovino etc.
- [x] Quantidade rápida 250 g, 500 g e 1 kg.
- [x] Quantidade livre/editável em gramas.
- [x] Cálculo do valor em tempo real antes de adicionar.
- [x] Cesta geral única e flutuante com todos os produtos selecionados.
- [x] Mesmo produto acumulado quando adicionado novamente com a mesma observação.
- [x] Quantidade editável dentro da cesta com +, -, ou digitação direta.
- [x] Persistência da cesta no aparelho mesmo após atualizar/reabrir a página.
- [x] Nome e WhatsApp do cliente preenchidos uma única vez para todo o orçamento.
- [x] Persistência local dos dados do cliente.
- [x] Escolha entre retirada na loja e entrega.
- [x] Taxa Bom Jardim = R$ 4,00.
- [x] Taxa Siqueira = R$ 6,00.
- [x] Tabela de demais bairros carregada no checkout.
- [x] Endereço, referência e bairro para entrega.
- [x] Captura opcional da localização GPS do cliente.
- [x] Link de localização incluído no pedido e no PDF.
- [x] Cálculo automático de subtotal, entrega e total.
- [x] Envio do pedido em texto para WhatsApp.
- [x] Botão "Salvar seu orçamento".
- [x] Código único de orçamento mantido entre salvar e encaminhar enquanto o conteúdo não muda.
- [x] Salvamento local de até 50 orçamentos no aparelho.
- [x] Estrutura para gravar orçamentos no Google Sheets.
- [x] Aba ORCAMENTOS e aba ITENS_ORCAMENTO previstas pelo Google Apps Script.
- [x] Botão "Encaminhar orçamento em PDF".
- [x] PDF consolidado com TODOS os itens da cesta.
- [x] PDF inclui tipo/categoria da carne, quantidade, preço, subtotal e observação.
- [x] PDF inclui cliente, telefone, recebimento, bairro, taxa, endereço, referência, localização e total.
- [x] Botão para baixar o PDF.
- [x] Campo de imagem por produto preparado na planilha.
- [x] Carregamento rápido: mostra catálogo salvo imediatamente e verifica preços novos em segundo plano.
- [x] Consulta de preços com `no-store` e parâmetro anti-cache.
- [x] Ao receber preços novos, itens já existentes na cesta são reprecificados pelo ID do produto.
- [x] Service Worker/PWA atualizado para a versão 8 para evitar JavaScript antigo preso em cache.

## Dependências externas ainda necessárias para produção

### 1. Google Sheets de produtos/preços
O arquivo `config.js` ainda precisa receber `SHEET_CSV_URL` com a URL CSV pública da planilha oficial. Sem essa URL, o app usa o catálogo inicial/local.

### 2. Google Sheets para salvar orçamentos
O arquivo `google-apps-script.gs` já está pronto. É necessário publicar esse script como Web App e colar a URL `/exec` em `ORDER_WEBAPP_URL` no `config.js`.

### 3. Fotos reais de cada produto
O sistema aceita a coluna `imagem`, mas ainda é preciso definir uma foto real para cada corte na planilha. A recomendação é usar foto individual por produto, e não uma única montagem para vários cortes.

## Estrutura esperada da planilha de produtos

`id,categoria,nome,preco,unidade,ativo,descricao,imagem,oferta,preco_anterior`

O arquivo `PLANILHA_MODELO.csv` contém a base atualizada.

## Teste funcional obrigatório antes da liberação ao cliente

1. Abrir o PWA em celular.
2. Selecionar Bife Bovino a 500 g.
3. Confirmar cálculo de metade do preço/kg.
4. Adicionar o mesmo produto novamente e conferir acúmulo para 1 kg.
5. Adicionar um segundo produto e conferir cesta geral.
6. Alterar peso diretamente na cesta.
7. Selecionar Entrega → Bom Jardim e conferir acréscimo de R$ 4,00.
8. Alterar para Retirada e conferir remoção da taxa.
9. Preencher nome/telefone uma única vez.
10. Capturar localização.
11. Gerar PDF e conferir todos os dados e observações.
12. Encaminhar PDF pelo compartilhamento do celular.
13. Enviar pedido em texto pelo WhatsApp.
14. Alterar um preço na planilha, atualizar o PWA e confirmar reprecificação.
15. Salvar orçamento e confirmar registro nas abas ORCAMENTOS e ITENS_ORCAMENTO.

## Situação atual
A lógica funcional principal está implementada. Para fechar a versão de produção faltam apenas as duas URLs do Google Sheets/Apps Script e a associação das fotos reais individuais aos produtos.
