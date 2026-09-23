# 007-login-usuario

## Objetivo

Personalizar a página de registro de usuário e torná-la funcional, apontando para a base de dados para fazer um login real e redirecionar para dentro do sistema.

## Contexto técnico

Descrito na seção `Objetivo`. Não serão necessários testes dentro do próprio navegador do Claude.

### Frontend

- Personalização do template, adequando para o caso de uso do projeto e removendo campos desnecessários.
- Conexão com o backend para realizar o login do usuário.
- Redirecionar para a página principal do dashboard após login de sucesso.


## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

### Login

- [x] Remover os botões de cadastro com Google e cadastro com o X, bem como o separador que há entre estes botões e o formulário.
  > ✅ 2026-09-22 15:58 — Removidos os botões "Entrar com Google"/"Entrar com X" e o separador "Ou" de [signin-form.component.jsx](../../../frontend/src/modules/auth/components/signin-form.component.jsx). Coberto por teste.
- [x] Remover o campo do sobrenome, pois não existe na base de dados.
  > ✅ 2026-09-22 15:58 — Não se aplica ao login: o formulário de `/signin` nunca teve campo de sobrenome (só e-mail e senha; o sobrenome foi removido do cadastro na spec 006). Há teste garantindo que ele não aparece. O "Sobrenome" que existia no perfil foi ocultado (ver última task).
- [x] Nomes do campos esperados no backend: `email`, `password`.
  > ✅ 2026-09-22 15:58 — O formulário envia `{ email, password }` para `POST /api/v1/auth/login` (endpoint existente, sem alteração no backend). Inputs com `name="email"`/`name="password"`. Contrato conferido com `curl` contra o backend real: `200 { message, tokenType, token, user: { id, name, email, ... } }` e `401 "Invalid email or password."`.
- [x] Remover o link "Voltar para o dashboard" do topo da página, pois no cenário real o usuário sem cadastro não terá tido acesso ao dashboard antes da tela de login.
  > ✅ 2026-09-22 15:58 — Link (e o bloco que o continha) removido de `signin-form.component.jsx`.
- [x] Validar no frontend se o email informado é um email válido. Caso não seja, exibir um alert informando o usuário.
  > ✅ 2026-09-22 15:58 — Reaproveitado `isValidEmail` ([validate-email.util.js](../../../frontend/src/utils/validate-email.util.js), spec 006). Se inválido, exibe o `Alert` do template (variant `error`, "E-mail inválido"). `noValidate` no `<form>` pelo mesmo motivo do cadastro (a validação nativa do `type="email"` esconderia o alert). Extra: senha vazia também mostra alert ("Senha obrigatória") sem chamar o backend.
- [x] Caso não passe na validação do email, nem deve acionar o backend.
  > ✅ 2026-09-22 15:58 — As validações rodam antes do `apiClient.post` e retornam cedo. Coberto por teste (`apiClient.post` não chamado).
- [x] Conectar-se com o backend para realizar o login ao submeter o formulário.
  > ✅ 2026-09-22 15:58 — `apiClient.post("/auth/login", { email, password })`. A sessão é gravada pelo novo [session.store.js](../../../frontend/src/stores/session.store.js): o JWT vai para o cookie `access_token` (o mesmo que o `proxy.js` já exigia nas rotas privadas) e o usuário (`name`, `email`...) vai para o `sessionStorage` — ou `localStorage` com "Manter conectado" marcado, caso em que o cookie expira junto com o `exp` do token. `AUTH_ENABLED` passou para `true` em `.env`/`.env.example` (a proteção das rotas agora funciona de verdade) e a variável do cookie passou a ser `NEXT_PUBLIC_AUTH_SESSION_COOKIE` (precisa ser visível no navegador; `auth.config.js` ainda aceita o nome antigo). README atualizado. Obs.: o backend não foi alterado — o token não é enviado como header `Authorization` nas chamadas porque ainda não há chamadas autenticadas no frontend.
- [x] Ao submeter o formulário, a tela deve exibir o spinner para que o usuário saiba que está em carregamento.
  > ✅ 2026-09-22 15:58 — Botão mostra o `Spinner` do template (`"Entrando..."`) e os campos ficam desabilitados enquanto `isSubmitting`. Coberto por teste.
- [x] Após retorno do backend, redirecionar para a tela inicial (`/dashboard`) ou exibir alert (devem ser utilizados os alerts do template e não o `alert()` padrão do navegador) de erro no login.
  > ✅ 2026-09-22 15:58 — Sucesso: `saveSession` + `router.push(HOME_ROUTE)` (`/dashboard`). Erro: `Alert` variant `error` "Não foi possível entrar" com a mensagem do backend (mesmo padrão do cadastro), reabilitando o formulário. Nenhum `window.alert`.
- [x] Criar os testes unitários necessários com cobertura de 100%.
  > ✅ 2026-09-22 15:58 — Novos testes: `signin-form.component.spec.jsx`, `stores/session.store.spec.js`, `hooks/use-session-user.hook.spec.js`, `header/user-dropdown.component.spec.jsx`, `profile/components/user-meta-card.component.spec.jsx`, `profile/profile.page.spec.jsx`. Os arquivos novos/alterados foram adicionados ao `COVERED_FILES` do `jest.config.mjs` (threshold de 100% por arquivo). `npm test` (frontend): 12 suítes, 81/81 testes, 100% statements/branches/functions/lines em todos os arquivos cobertos. `eslint src` e `next build` sem erros.
- [x] Na topbar (após login realizado, dentro do dashboard e de todas as outras telas do sistema) deve aparecer um ícone ou imagem padrão de um avatar no lugar da foto (pois o cadastro de usuário não possui foto) e o nome correto do usuário logado.
  > ✅ 2026-09-22 15:58 — Novo [default-avatar.component.jsx](../../../frontend/src/components/ui/avatar/default-avatar.component.jsx) (ícone `UserCircleIcon` do template em círculo cinza) no lugar da foto em [user-dropdown.component.jsx](../../../frontend/src/components/header/user-dropdown.component.jsx), que agora lê o usuário da sessão pelo novo hook [use-session-user.hook.js](../../../frontend/src/hooks/use-session-user.hook.js) (`useSyncExternalStore`, sincroniza também entre abas). A topbar mostra o primeiro nome (mesmo formato do template); o nome completo fica no popup. Como o header está no layout `(private)`, vale para todas as telas logadas. Extra: "Sair" agora limpa a sessão e volta para `/signin`.
- [x] O usuário, ao clicar em seu nome ou foto para abrir o popup do perfil, deve aparecer o nome completo do usuário (`name`) e email.
  > ✅ 2026-09-22 15:58 — Popup mostra `user.name` e `user.email` da sessão (antes vinham de `CURRENT_USER_MOCK`). Coberto por teste.
- [x] Ao clicar para visualizar ou editar seu perfil, deve exibir a página `/profile` com os dados reais do usuário (nome completo e email). As demais informações que constam na página podem ser ocultadas mas não excluídas, pois no futuro o cadastro de cliente vai evoluir.
  > ✅ 2026-09-22 15:58 — [user-meta-card.component.jsx](../../../frontend/src/modules/profile/components/user-meta-card.component.jsx): avatar padrão, título e campo "Nome completo" com `name`, e "E-mail" com `email` da sessão; o modal "Editar" abre com esses dois valores reais. Ocultados com a classe `hidden` (markup mantido, ainda alimentado pelo mock): cargo/localização, sobrenome, telefone, bio, redes sociais e "Alterar foto de perfil" (card e modal) e, em [profile.page.jsx](../../../frontend/src/modules/profile/profile.page.jsx), os cards de endereço, segurança e zona de perigo. Ajustes no modal: altura fixa de 450px virou `max-h` (evita espaço vazio com só 2 campos) e o `<form>` ganhou `preventDefault` no submit (os botões sem `type` recarregavam a página). Salvar ainda não grava — não há endpoint de perfil pedido nesta spec.
## Notas gerais de execução

- Backend sem alterações: `POST /api/v1/auth/login` já devolvia `token` + `user`. Contrato conferido com `curl` subindo o backend localmente; para isso foi criado no Postgres local o usuário de teste `login.e2e.1790103501@example.com` (pode ser removido).
- Sem testes no navegador, conforme o "Contexto técnico".
- `frontend`: 81/81 testes, 100% de cobertura nos arquivos desta spec e das anteriores; `eslint` e `next build` sem erros.
