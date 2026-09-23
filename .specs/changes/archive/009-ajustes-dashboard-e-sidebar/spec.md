# 009-ajustes-dashboard-e-sidebar

## Objetivo

Ajustar detalhes no dashboard, possibilitar a adição de novos itens, remover itens desnecessários na sidebar e no header.

## Contexto técnico

Deixar a sidebar e o header apenas com links reais que serão utilizados na navegação.
Botão pra adicionar novos CEPs e CNPJs.
Ajustes na modal de exibição/alteração dos CEPs e CNPJs.
Não serão necessários testes dentro do próprio navegador do Claude.

### Frontend

- Remover itens desnecessários do sidebar e do header
- Possibilitar a criação de novos itens
- Melhorar a exibição e alteração dos itens no modal


## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

### Login

- [x] Na sidebar, deixar apenas a logo e os itens "Dashboard" e "Perfil".
  > ✅ 2026-09-23 10:11 — Trocado o `MENU_GROUPS` por uma lista simples `MENU_ITEMS` (Dashboard e Perfil) em [menu.config.jsx](../../../../frontend/src/config/menu.config.jsx). A [app-sidebar.component.jsx](../../../../frontend/src/layout/app-sidebar.component.jsx) ficou só com a logo e os dois links: saíram os títulos dos grupos ("Menu"/"Outros") e a lógica de submenus. As páginas do template (Elementos, Tabelas etc.) continuam existindo, mas não aparecem mais na navegação.
- [x] Remover o ícone do Next.js que aparece no canto inferior esquerdo da página.
  > ✅ 2026-09-23 10:11 — `devIndicators: false` no [next.config.mjs](../../../../frontend/next.config.mjs), conforme a doc do Next 16 (`node_modules/next/dist/docs`). Erros de compilação e de runtime continuam aparecendo.
- [x] Na topbar (header), remover o input de busca pois não será utilizado.
  > ✅ 2026-09-23 10:11 — Removidos o formulário de busca e o atalho ⌘K/Ctrl+K de [app-header.component.jsx](../../../../frontend/src/layout/app-header.component.jsx).
- [x] Na topbar, remover também o botão de notificações. Também não será utilizado.
  > ✅ 2026-09-23 10:11 — Removido do header e apagado o arquivo `components/header/notification-dropdown.component.jsx`, que não era usado em outro lugar.
- [x] No menu suspenso do usuário (ao clicar no nome do usuário, canto superior direito), remover os links "Configurações da conta" e "Suporte".
  > ✅ 2026-09-23 10:11 — Ficaram só "Editar perfil" e "Sair" em [user-dropdown.component.jsx](../../../../frontend/src/components/header/user-dropdown.component.jsx). O teste do dropdown agora confere que há só um link e que os dois itens não aparecem.
- [x] No data-table do CNPJ, aumentar um pouco a largura da coluna CNPJ para que não tenha quebra de linha. Está quebrando linha por conta de dois caracteres.
  > ✅ 2026-09-23 10:11 — A primeira coluna (CNPJ/CEP) ganhou `whitespace-nowrap` (cabeçalho e células), então fica com a largura do valor formatado e não quebra linha. Usei isso em vez de uma largura fixa para funcionar também com o CNPJ alfanumérico.
- [x] Adicionar botão no header das data-tables para criação de novo item (CEP e CNPJ).
  > ✅ 2026-09-23 10:11 — Botão "Novo CEP"/"Novo CNPJ" (com ícone +) no cabeçalho de cada widget. Ele abre o novo [create-record-modal.component.jsx](../../../../frontend/src/modules/dashboard/components/create-record-modal.component.jsx), com um input mascarado (CEP `00000-000`; CNPJ `00.000.000/0000-00`, que aceita letras) e "Cadastrar" habilitado só com o valor completo. Envia `POST /cep` ou `/cnpj` (endpoints que já existiam) com o valor sem máscara. Se o backend responde com o registro, a linha entra no topo da tabela (ou substitui a existente, quando o item já estava cadastrado) e aparece um alert de sucesso. Se a consulta vai para a fila (`queued`), aparece um alert informativo com o jobId e a tabela é recarregada para mostrar o registro pendente. Se der erro, aparece um alert com a mensagem do backend dentro do modal.
- [x] Nos modais, tanto visualização quando edição, seja CEP ou CNPJ, formatar o valor do campo `Status` sempre com a primeira letra em maiúscula.
  > ✅ 2026-09-23 10:11 — `formatStatus` em [format-field.util.js](../../../../frontend/src/utils/format-field.util.js): mostra o status traduzido, igual ao badge da tabela (`completed` → "Concluído", `pending` → "Pendente" etc.). Um status desconhecido aparece com a primeira letra maiúscula (`archived` → "Archived"). É usado nos modais (via `RecordFields`) e no `EnrichmentStatusBadge`.
- [x] Nos modais, traduzir o nome de todos os campos para português do Brasil. Lembrar de não traduzir no literal, pois alguns nomes não são tradução literal (ex.: Corporate Name = Razão Social).
  > ✅ 2026-09-23 10:11 — `FIELD_LABELS` em `format-field.util.js` traz os nomes de todos os campos de CEP e CNPJ, seguindo os termos da Receita e da ViaCEP: `corporateName` → "Razão social", `tradeName` → "Nome fantasia", `registrationStatus` → "Situação cadastral", `legalNature` → "Natureza jurídica", `qsa` → "Quadro de sócios e administradores (QSA)", `ibgeCode` → "Código IBGE" etc. Campos sem tradução continuam separando o camelCase e mantêm as siglas em maiúsculo.
- [x] Nos modais, o título está como "Detalhes do CNPJ ..." ou "Editar CNPJ...", assim como para o CEP; e o subtítulo como "Dados completos do registro salvo na base." ou "Altere os campos desejados e salve". Pode deixar o título apenas "CEP ..."/"CNPJ ..." e no subtítulo informar se está visualizando ou editando. Ou pode ser o contrário, caso julgue ser o melhor.
  > ✅ 2026-09-23 10:11 — Título: só "CEP 01001-000" / "CNPJ 19.131.243/0001-97". Subtítulo: "Visualizando os dados completos do registro salvo na base." ou "Editando: altere os campos desejados e salve.". Mantive o identificador no título porque é o que mais importa ver no modal.
- [x] Em todos os campos editáveis de CEP ou CNPJ, utilizar uma máscara de formatação. Não enviar os dados com máscara para o formulário (máscara apenas na visualização em tela).
  > ✅ 2026-09-23 10:11 — Novo [input-mask.util.js](../../../../frontend/src/utils/input-mask.util.js). Cada máscara tem `format` (valor salvo → texto na tela) e `parse` (texto digitado → valor salvo). O estado do formulário e o PATCH usam sempre o valor sem máscara. Máscaras por campo em `fieldMasks` ([record-resources.config.js](../../../../frontend/src/modules/dashboard/config/record-resources.config.js)): CEP `00000-000`; telefones/fax `(00) 0000-0000` ou `(00) 00000-0000`; CNAE principal `0000-0/00`; capital social em moeda (`R$ 1.500,50` → `"1500.50"`, montado a partir do texto para não perder precisão no Decimal(18,2)); UF com 2 letras maiúsculas; códigos IBGE/DDD/GIA/SIAFI e os demais códigos numéricos aceitam só dígitos. Datas continuam com o input nativo de data. Nos campos de texto livre (nome, logradouro, e-mail…) não há formato a aplicar, então ficaram sem máscara. A visualização mostra os mesmos formatos (`formatFieldValue(value, key)`).
- [x] Campos `Country Code`, `Company Size Code` no CNPJ deve ser readonly.
  > ✅ 2026-09-23 10:11 — `readOnlyFields: ["countryCode", "companySizeCode"]` no config do CNPJ: os campos continuam no formulário, na mesma posição, mas com `readonly` e fundo cinza. O `buildUpdatePayload` nunca os envia.
- [x] Campo `Country` deve escrever sempre em letras maiúsculas.
  > ✅ 2026-09-23 10:11 — Na edição, `UPPERCASE_MASK` converte o que é digitado (e o PATCH envia em maiúsculas). Na visualização, o valor também aparece em maiúsculas.
- [x] As strings "CNPJ", "CEP", "IBGE", "CNAE". "UF" e "DDD" devem aparecer em maiúsculo em todos os modais e telas que estão.
  > ✅ 2026-09-23 10:11 — Os rótulos traduzidos já usam as siglas em maiúsculo, e o `formatFieldLabel` mantém em maiúsculo as siglas dos campos que não têm tradução (CNPJ, CEP, IBGE, CNAE, UF, DDD, QSA, MEI, SIAFI, GIA). Um `grep` em `src` não encontrou mais textos de tela com "Cep", "Cnpj", "Ibge", "Cnae", "Uf" ou "Ddd".
- [x] Esconder o campo "id" dos modais (jobId pode manter aparecendo).
  > ✅ 2026-09-23 10:11 — `RecordFields` ignora o `id`, então ele some dos modais de visualizar, de edição (seção somente leitura) e de consulta por jobId. O jobId continua aparecendo, com o rótulo "Job ID".

## Notas gerais de execução

- Frontend: `npm test` com 24 suítes e 222/222 testes. Os `COVERED_FILES` estão com 100% de cobertura, incluindo os novos `create-record-modal.component.jsx` e `input-mask.util.js`. `eslint src` e `next build` passaram sem erros.
- Backend não foi alterado: o cadastro usa os `POST /cep` e `POST /cnpj` que já existiam.
- Sem testes no navegador, como pede o "Contexto técnico".
