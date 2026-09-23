# 005-init-frontend

## Objetivo

Extrair páginas de um template free disponível na internet e construir os componentes do frontend utilizando este template.

## Contexto técnico

Vamos extrair o algumas páginas de um template disponível na web (URL base do template: https://react-demo.tailadmin.com/) para construir o frontend baseado neste template. A princípio, apenas com dados mockados. A integração com o backend será feita em specs posteriores. 

### URL das páginas e elementos a serem extraídas

#### Páginas
- [Página de login](https://react-demo.tailadmin.com/signin)
- [Página de registro de usuário](https://react-demo.tailadmin.com/signup)
- [Página de reset de senha](https://react-demo.tailadmin.com/reset-password)
- [Layout da página inicial do dashboard logado](https://react-demo.tailadmin.com/logistics)
- [Página não encontrada 404](https://react-demo.tailadmin.com/error-404)
- [Tabelas a serem usadas no dashboard](https://react-demo.tailadmin.com/data-tables)
- [Perfil do usuário](https://react-demo.tailadmin.com/profile)

#### Elementos
- [Spinner usado para carregamentos](https://react-demo.tailadmin.com/spinners)
- [Modals para sucesso, erro, info e warnings](https://react-demo.tailadmin.com/modals)
- [Alerts para sucesso, erro, info e warnings](https://react-demo.tailadmin.com/alerts)
- [Badges](https://react-demo.tailadmin.com/badge)
- [Elementos de formulário](https://react-demo.tailadmin.com/form-elements)

## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

- [x] Criar, na raiz do projeto, uma pasta `backend` e mover todo o conteúdo do projeto pra lá (exceto as pastas de configuração do claude e do vscode: .claude, .specs, .vscode).
  > ✅ 2026-09-22 12:15 — Todo o conteúdo (src, test, prisma, node_modules, .env*, Dockerfile, docker-compose.yml, configs) foi movido para `backend/`. Na raiz ficaram só `.claude`, `.specs`, `.vscode`, `backend`, `frontend` e `template`. `npm test` rodado dentro de `backend/`: 19 suítes, 408 testes passando.
- [x] Criar, na raiz do projeto, uma pasta `frontend` que irá armazenar todo o frontend.
  > ✅ 2026-09-22 12:15 — `frontend/` criado com Next.js 16 (App Router, Turbopack) + Tailwind 4, em JavaScript/JSX seguindo as regras de nomenclatura (`*.page.jsx`, `*.component.jsx`, `*.context.jsx`, `*.hook.js`, `*.config.js`, `*.mock.js`). Roda na porta 3001 (o backend usa a 3000). README em `frontend/README.md`.
- [x] Manter todas as imagens e ícones do template. Caso alguma não venha a ser utilizada, vou remover manualmente depois.
  > ✅ 2026-09-22 12:15 — Todas as 112 imagens copiadas para `frontend/public/images` e todos os ícones SVG para `frontend/src/icons` (com o `index.js` de exportação do template).
- [x] Criar, na raiz do projeto, uma pasta `template` que irá armazenar o código extraído do template free.
  > ✅ 2026-09-22 12:15 — Desvio: `react-demo.tailadmin.com` é a demo do **TailAdmin Pro (pago)**. Com a aprovação do usuário, foi usado o repositório oficial gratuito (MIT) `TailAdmin/free-nextjs-admin-dashboard` (commit `4fba024`), que já é Next.js + Tailwind. O código original, sem alterações, fica em `template/`, junto com o `LICENSE` e um `README.md` que explica a origem e o mapeamento.
- [x] Dentro de `/template`, criar as pastas `pages` e `elements`, armazenando cada um dos destacados acima na seção `URL das páginas e elementos a serem extraídas` em seus respectivos locais e nomeando de forma curta e objetiva cada um deles (ex: pages/login, pages/register, elements/spinner, elements/modals...)
  > ✅ 2026-09-22 12:15 — `pages/{login,register,reset-password,dashboard,not-found,data-tables,profile}` e `elements/{spinner,modals,alerts,badges,form-elements}`. Os arquivos mantêm os nomes originais (código de terceiros). Itens exclusivos da Pro não têm código original: `reset-password` e `spinner` têm só um README; `dashboard` (logistics) e `data-tables` guardam a base gratuita equivalente (dashboard e-commerce + layout logado; tabela básica + paginação). O layout logado (sidebar, header, contextos, `globals.css`) ficou em `pages/dashboard`.
- [x] Criar as páginas reais do projeto dentro da pasta `frontend` utilizando Next.js. O CSS, como o próprio template já diz, é Tailwind. As páginas de login, registro de usuário, reset de senha e 404 são as únicas públicas, ou seja, que poderão ser acessadas sem estar autenticado. Todas as outras páginas precisam de autenticação. Caso o usuário entre com uma URL forçando pelo navegador, seja ela existente ou não, redireciona para a página do 404 para que ele nunca saiba se a URL realmente existe ou não.
  > ✅ 2026-09-22 12:15 — Páginas: `/signin`, `/signup`, `/reset-password`, `/error-404` (grupo `(public)`) e `/dashboard`, `/data-tables`, `/profile`, `/alerts`, `/badges`, `/form-elements`, `/modals`, `/spinners` (grupo `(private)`). Rotas definidas em `src/config/routes.config.js` e aplicadas por `src/proxy.js`: URL inexistente → redirect para `/error-404`; rota privada sem cookie de sessão → redirect para `/error-404`; `/` → dashboard (com sessão) ou login (sem sessão). Verificado com `curl` em build de produção com `AUTH_ENABLED=true`, com e sem cookie. Construídos do zero no visual do template (exclusivos da Pro): formulário de redefinição de senha e tabela com busca/ordenação/paginação. O dashboard usa o layout e os cards do dashboard gratuito. Textos em pt-BR (removido o next-intl do template). `next build` e `eslint` sem erros.
- [x] Atentar-se ao menu sidebar à esquerda. O mesmo deve se manter idêntico ao template, com toggle funcionando. Criar um item para cada uma das páginas do menu - exceto para a página de 404, obviamente, essa não deve ser acessada via menu.
  > ✅ 2026-09-22 12:15 — Sidebar portada do template (mesmo markup, animação de submenu, expandir ao passar o mouse, recolher, versão mobile com backdrop), com os itens vindos de `src/config/menu.config.jsx`: Menu → Dashboard, Tabelas, Perfil; Outros → Elementos (Alertas, Badges, Formulários, Modais, Spinners) e Autenticação (Login, Cadastro, Redefinir senha). Sem item para a 404. Toggle testado no navegador (desktop e mobile). O widget "Purchase Plan" do rodapé foi mantido idêntico ao template (é propaganda do TailAdmin e pode ser removido em `layout/sidebar-widget.component.jsx`).
- [x] Criar os elementos separadamente para serem reaproveitados em vários pontos do frontend. 
  > ✅ 2026-09-22 12:15 — Em `src/components`: `ui/spinner` (Spinner com tamanhos, cores e variações ring/dashed/dots + PageLoader usado no `loading.jsx` das rotas privadas), `ui/modal` (Modal base + FeedbackModal com as variantes success/info/warning/error, extraído do exemplo do template), `ui/alert`, `ui/badge`, `ui/button`, `ui/table` (Table, Pagination e DataTable), `ui/dropdown`, `ui/avatar` e `form/*` (Input, Select, MultiSelect, Checkbox, Radio, Switch, TextArea, FileInput, DatePicker, PhoneInput, Label). As páginas de Elementos mostram exemplos de uso.
- [x] Como a criação inicial ainda não está linkada com o backend, manter as páginas abertas para navegação, porém, conforma já mencionado em outra task, já deve-se deixar pronta a questão das páginas que serão públicas e privadas. 
  > ✅ 2026-09-22 12:15 — `AUTH_ENABLED=false` (padrão no `.env.example`) deixa todas as páginas abertas; `AUTH_ENABLED=true` liga a proteção (lida em tempo de execução, sem rebuild), usando o cookie `AUTH_SESSION_COOKIE` (padrão `access_token`). Os formulários de login e cadastro só navegam (dashboard e login, respectivamente), e todos os dados vêm de `src/mocks/*.mock.js`.