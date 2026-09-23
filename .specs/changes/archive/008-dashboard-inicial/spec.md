# 008-dashboard-inicial

## Objetivo

Criar o conteúdo do dashboard inicial.

## Contexto técnico

Remover itens do template padrão e popular a tela com dados reais. Não serão necessários testes dentro do próprio navegador do Claude.

### Frontend

- Remover itens desnecessários do template padrão
- Ajustar os itens da sidebar
- Adicionar widget que lista os CNPJs cadastrados
- Adicionar widget que lista os CEPs cadastrados


## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

### Login

- [x] Retirar da sidebar a div que faz referência ao Tailwind com botão de Purchase
  > ✅ 2026-09-22 23:27 — Removido o `SidebarWidget` ("#1 Tailwind CSS Dashboard" + "Purchase Plan") de [app-sidebar.component.jsx](../../../../frontend/src/layout/app-sidebar.component.jsx) e apagado o arquivo `layout/sidebar-widget.component.jsx`. Os itens de menu não foram alterados (nenhuma task pedia mudança neles).
- [x] Remover todos os widgets da área principal do dashboard, pois não serão utilizados
  > ✅ 2026-09-22 23:27 — Apagados os 7 componentes do template em `modules/dashboard/components` (métricas, gráficos, meta mensal, mapa/demografia, pedidos recentes) e o `mocks/dashboard.mock.js`, usado só por eles. [dashboard.page.jsx](../../../../frontend/src/modules/dashboard/dashboard.page.jsx) agora só renderiza os dois widgets novos. As dependências de gráfico/mapa continuam no `package.json`.
- [x] Posicionar um widget com uma data-table exibindo os CEPs cadastrados na base. Buscar na base os dados para exibir no widget.
  > ✅ 2026-09-22 23:27 — Backend: novo `GET /api/v1/cep` (`findAll` no repository, ordenado por `createdAt desc`; `list()` no service → `{ message, total, ceps }`; erro de banco → 500 `FETCH_FAILED`). Frontend: novo [record-table-widget.component.jsx](../../../../frontend/src/modules/dashboard/components/record-table-widget.component.jsx) sobre o `DataTable` existente (busca, ordenação, paginação), configurado por [record-resources.config.js](../../../../frontend/src/modules/dashboard/config/record-resources.config.js). Colunas: CEP (00000-000), Logradouro, Bairro, Cidade, UF, Status (badge) e Ações; botão "Atualizar"; erro de carregamento mostra o `Alert` do template. Para isso, o [api-client.factory.js](../../../../frontend/src/config/api-client.factory.js) passou a enviar `Authorization: Bearer <token>` (lido do cookie da sessão por `getSessionToken`), ganhou `delete`, e num 401 de rota protegida encerra a sessão e volta para `/signin`. Conferido com `curl` no backend local: 200 com 3 CEPs; o preflight de CORS aceita `DELETE` e `Authorization`.
- [x] Posicionar um widget com uma data-table exibindo os CNPJs cadastrados na base. Buscar na base os dados para exibir no widget.
  > ✅ 2026-09-22 23:27 — Backend: novo `GET /api/v1/cnpj`, mesmo padrão do CEP (`{ message, total, cnpjs }`). Frontend: o mesmo widget com `resourceKey="cnpj"`. Colunas: CNPJ (00.000.000/0000-00, também para o CNPJ alfanumérico), Razão social, Nome fantasia, Cidade, UF, Status e Ações. Conferido com `curl`: 200 com 4 CNPJs. Obs.: a página passa só a chave (`"cep"`/`"cnpj"`) para o widget, porque a configuração tem funções e o `next build` não permite passá-las de um Server Component.
- [x] Em cada linha das tabelas, no último elemento de cada linha da tabela, devem ter botões para visualizar, alterar e excluir.
  > ✅ 2026-09-22 23:27 — A última coluna ("Ações") tem botões com ícone (olho, lápis, lixeira) e `aria-label`/`title` ("Visualizar CEP 01001-000" etc.). Excluir abre um modal de confirmação ([delete-record-modal.component.jsx](../../../../frontend/src/modules/dashboard/components/delete-record-modal.component.jsx)) → `DELETE /cep/:cep` ou `/cnpj/:cnpj` (endpoints existentes), com spinner; a linha sai da tabela e aparece um alert de sucesso; se falhar, mostra alert de erro no modal.
- [x] Ao clicar na visualização ou alteração do item, abre o modal exibindo os dados completos.
  > ✅ 2026-09-22 23:27 — [record-details-modal.component.jsx](../../../../frontend/src/modules/dashboard/components/record-details-modal.component.jsx): "Visualizar" lista todos os campos do registro (listas como QSA e CNAEs secundários aparecem como JSON). "Alterar" mostra inputs para os campos que o PATCH aceita (texto, número, decimal, data e Sim/Não conforme o tipo) e os demais campos como somente leitura. Só os campos alterados são enviados; sem alteração, mostra um alert informativo e não chama o backend. Sucesso: a linha é atualizada e aparece um alert de sucesso. Erro: alert com a mensagem do backend.
- [x] Cada campo no modal deve estar formatado sempre com a primeira letra em maiúscula. Considerar o camelCase dos campos e separar em duas palavras quando for o caso (ex.: ibgeCode será exibido na tela como Ibge Code)
  > ✅ 2026-09-22 23:27 — `formatFieldLabel` em [format-field.util.js](../../../../frontend/src/utils/format-field.util.js) (`ibgeCode` → `Ibge Code`, `cityIbgeCode` → `City Ibge Code`, `uf` → `Uf`), usado nos rótulos dos modais de visualizar, alterar e jobId. Os valores também são formatados: vazio → "—", booleano → Sim/Não, data → dd/mm/aaaa, data e hora → pt-BR.
- [x] Deve também ter um botão para consultar o cadastro (por jobId) que será útil quando um cadastro cair no limbo do rate-limit.
  > ✅ 2026-09-22 23:27 — Botão "Consultar por jobId" no cabeçalho de cada widget e um botão com ícone de relógio nas linhas que têm `jobId`, já preenchido. O [job-lookup-modal.component.jsx](../../../../frontend/src/modules/dashboard/components/job-lookup-modal.component.jsx) chama o `GET /jobs/:jobId` existente e mostra o tipo, o status (badge) e os dados completos. Se o registro encontrado for do mesmo tipo do widget, a linha da tabela é atualizada (ex.: de Pendente para Concluído).

## Notas gerais de execução

- Este `spec.md` está na pasta `archive/007-login-usuario`, mas o conteúdo é o da spec 008 (e `changes/008-dashboard-inicial/spec.md` tem o conteúdo da 007 já concluída). Parece que os arquivos foram trocados; eles não foram movidos.
- Backend: `npm test` com 20 suítes e 439/439 testes; cobertura de 100% em todos os arquivos de `cep`, `cnpj` e `job`. Testes novos para `GET /cep` e `GET /cnpj` (rota, service e repository).
- Frontend: `npm test` com 22 suítes e 156/156 testes; 100% de cobertura em todos os `COVERED_FILES`, incluindo os novos. `eslint src` e `next build` sem erros.
- Sem testes no navegador, conforme o "Contexto técnico". Os endpoints foram conferidos com `curl` usando um JWT temporário (2 min) assinado com o `JWT_SECRET` local; nenhum usuário foi criado.
