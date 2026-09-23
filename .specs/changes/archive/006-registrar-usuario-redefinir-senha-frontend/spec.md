# 006-registrar-usuario-redefinir-senha-frontend

## Objetivo

Personalizar a página de registro de usuário e torná-la funcional, apontando para a base de dados.

## Contexto técnico

Descrito na seção `Objetivo`. Não tem o que acrescentar. 

### Frontend

- Personalização do template, adequando para o caso de uso do projeto e removendo campos desnecessários.
- Conexão com o backend para registrar um novo usuário ou alterar um usuário existente.


## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

### Registrar usuário (/signup)

- [x] Se possível, alterar a logo e padronizar para todas as páginas do projeto. Pode mandar o mesmo ícone da logo, mas alterar a escrita de "TailAdmin" para "BR Data Hub"
  > ✅ 2026-09-22 15:20 — `frontend/public/images/logo/{auth-logo,logo,logo-dark}.svg`: mantido o ícone (quadrado arredondado com as 3 barras), substituído o wordmark vetorizado "TailAdmin" por um `<text>` "BR Data Hub" (usando `textLength`/`lengthAdjust` para ocupar exatamente o mesmo espaço do wordmark original, sem alterar `width`/`height`/`viewBox`). `logo-icon.svg` (sem texto) não precisou de alteração. Como os 3 arquivos são usados em `auth-layout`, `app-header` e `app-sidebar`, a marca já fica padronizada em todas as páginas automaticamente. Verificado visualmente no navegador (ambos os arquivos claro/escuro).
- [x] Remover os botões de cadastro com Google e cadastro com o X, bem como o separador que há entre estes botões e o formulário.
  > ✅ 2026-09-22 15:20 — Removidos de [signup-form.component.jsx](../../../frontend/src/modules/auth/components/signup-form.component.jsx). Verificado no navegador: página só mostra o formulário.
- [x] Remover o campo do sobrenome, pois não existe na base de dados.
  > ✅ 2026-09-22 15:20 — Campo "Sobrenome" removido do formulário.
- [x] Nomes do campos esperados no backend: `name`, `email`, `password`.
  > ✅ 2026-09-22 15:20 — Formulário envia `{ name, email, password }` para `POST /api/v1/auth/register`, que já esperava exatamente esses campos (endpoint criado na spec 001, sem alteração de contrato).
- [x] Remover checkbox de políticas de privacidade, pois não será necessário para o projeto.
  > ✅ 2026-09-22 15:20 — Checkbox e o texto "Termos e Condições / Política de Privacidade" removidos.
- [x] Remover o link "Voltar para o dashboard" do topo da página, pois no cenário real o usuário sem cadastro não terá tido acesso ao dashboard antes da tela de login.
  > ✅ 2026-09-22 15:20 — Link removido de `signup-form.component.jsx`.
- [x] Validar no frontend se o email informado é um email válido. Caso não seja, exibir um alert informando o usuário.
  > ✅ 2026-09-22 15:20 — Criado [validate-email.util.js](../../../frontend/src/utils/validate-email.util.js) (`isValidEmail`). No submit, se inválido, exibe o `Alert` (variant `error`) do próprio template — sem chamar o backend. Também foi adicionado `noValidate` no `<form>`: sem isso, o `type="email"` do input bloqueava o submit via validação nativa do navegador antes do JS rodar, escondendo o alert customizado pedido pela spec (descoberto pelos testes de UI).
- [x] Validar a força da senha do usuário, seguindo estas regras: Mínimo de 8 caracteres; ao menos uma letra maiúscula; ao menos uma letra minúscula; ao menos um caractere especial; ao menos um número.
  > ✅ 2026-09-22 15:20 — Criado [validate-password.util.js](../../../frontend/src/utils/validate-password.util.js) (`getPasswordValidationErrors`/`isStrongPassword`) com as 5 regras da spec.
- [x] Caso não passe em alguma das validações (email ou força de senha), nem deve acionar o backend.
  > ✅ 2026-09-22 15:20 — As duas validações rodam antes do `apiClient.post`; em caso de falha a função retorna cedo. Coberto por teste (`apiClient.post` não chamado).
- [x] Conectar-se com o backend para registrar um usuário na model `User` ao submeter o formulário.
  > ✅ 2026-09-22 15:20 — Criado [api-client.factory.js](../../../frontend/src/config/api-client.factory.js) (wrapper de `fetch` sobre `NEXT_PUBLIC_API_BASE_URL`, novo env var). `signup-form` chama `apiClient.post("/auth/register", { name, email, password })`. Testado end-to-end no navegador contra o backend real (Postgres local): usuário `maria.silva@example.com` persistido na tabela `user` (id `1fb7cb53-dec4-40c4-8195-a3413fb56e93`), confirmado via Prisma Client.
- [x] Ao submeter o formulário, a tela deve exibir o spinner para que o usuário saiba que está em carregamento.
  > ✅ 2026-09-22 15:20 — Botão usa o `Spinner` do template (`size="sm" color="light" showLabel`) enquanto `isSubmitting` é `true`, mesmo padrão já usado em `reset-password-form`. Verificado visualmente (spinner "Cadastrando...").
- [x] Após retorno do backend, exibir alert (devem ser utilizados os alerts do template e não o `alert()` padrão do navegador) de sucesso ou erro, de acordo com a ocasião.
  > ✅ 2026-09-22 15:20 — Sucesso: `Alert` variant `success` + redirecionamento para `/signin` após 1.5s. Erro: `Alert` variant `error` com a mensagem vinda do backend (ex.: "Email is already in use."). Nenhum uso de `window.alert`.
- [x] Criar os testes unitários necessários com cobertura de 100%.
  > ✅ 2026-09-22 15:20 — Stack de testes criada do zero no frontend (não existia): Jest 30 + `next/jest` + Testing Library (`@testing-library/react`, `jest-dom`, `user-event`) + mock de `*.svg` (ver desvio abaixo). Arquivos: [jest.config.mjs](../../../frontend/jest.config.mjs), [jest.setup.js](../../../frontend/jest.setup.js), [signup-form.component.spec.jsx](../../../frontend/src/modules/auth/components/signup-form.component.spec.jsx), [validate-email.util.spec.js](../../../frontend/src/utils/validate-email.util.spec.js), [validate-password.util.spec.js](../../../frontend/src/utils/validate-password.util.spec.js), [api-client.factory.spec.js](../../../frontend/src/config/api-client.factory.spec.js). `npm test` (frontend): 100% statements/branches/functions/lines nesses 4 arquivos (`coverageThreshold` no `jest.config.mjs` escopado só a eles — o restante do frontend, pré-existente, não tinha testes e está fora do escopo desta spec). ⚠️ Desvio: `next/jest` já mapeia `*.svg` para um objeto `{src,height,width}` (mock de `next/image`), o que quebrava a renderização dos ícones (`EyeIcon`/`ChevronLeftIcon`, importados como componente React via `@svgr/webpack`); sobrescrito com [test/mocks/svg.mock.jsx](../../../frontend/test/mocks/svg.mock.jsx) usando a mesma chave de regex do next/jest para ter prioridade.

### Redefinição de senha (/reset-password)

- [x] Validar no frontend se o email informado é um email válido. Caso não seja, exibir um alert informando o usuário.
  > ✅ 2026-09-22 15:20 — `reset-password-form.component.jsx` usa `isValidEmail` antes do submit; alert de erro do template, sem chamar o backend. `noValidate` adicionado ao `<form>` pelo mesmo motivo do formulário de cadastro.
- [x] Se o email informado for válido porém não existe na base, o sistema apenas não envia email mas não deve avisar que o email não está cadastrado.
  > ✅ 2026-09-22 15:20 — Desvio necessário: essa regra depende do backend, que ainda não tinha endpoint de redefinição de senha (fora do "Contexto técnico" da spec, que só cita Frontend). Implementado `POST /api/v1/auth/forgot-password` em `backend/src/modules/auth/`: sempre responde com a mesma mensagem genérica (`PASSWORD_RESET_EMAIL_SENT`) e só gera/envia o token internamente se o e-mail existir — nunca revela se o cadastro existe. Coberto por teste (`auth.test.js`): "should return the same generic message without sending an email when the address is not registered".
- [x] Ao submeter o formulário, exibir alert dizendo que o usuário receberá um email com o link caso seja um email válido.
  > ✅ 2026-09-22 15:20 — Mantido o `Alert` de sucesso já existente no template (`"Se existir uma conta para {email}, você receberá as instruções..."`), agora disparado após a resposta real do backend em vez do `setTimeout` mockado.
- [x] Ao submeter o formulário, enviar email com link para redefinição de senha caso seja um email válido e cadastrado na base.
  > ✅ 2026-09-22 15:20 — Desvio/adição de backend: criado [email.service.js](../../../backend/src/services/email.service.js) (nodemailer + SMTP configurável via `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`/etc, novas vars em `.env(.example)`). `AuthService.forgotPassword` gera um token aleatório (`crypto.randomBytes(32)`), guarda o **hash SHA-256** dele + expiração (`resetPasswordTokenHash`/`resetPasswordExpiresAt`, novos campos no model `User` via migration `20260922175118_add_user_reset_password_fields`, aplicada no Postgres local) e envia (ou, sem SMTP configurado, apenas loga) o link `${FRONTEND_URL}/reset-password/confirm?token=...`. Testado end-to-end: fluxo completo signup → forgot-password → link (token setado manualmente via script para simular o e-mail, já que sem SMTP configurado o link só vai pro log) → reset-password/confirm → login com a senha nova funcionando.
- [x] Criar uma página com os campos `password` e `confirm password` que será acessada através do link recebido no email do usuário.
  > ✅ 2026-09-22 15:20 — Nova rota `/reset-password/confirm?token=...`: [reset-password-confirm-form.component.jsx](../../../frontend/src/modules/auth/components/reset-password-confirm-form.component.jsx) + [reset-password-confirm.page.jsx](../../../frontend/src/modules/auth/reset-password-confirm.page.jsx) + [page.jsx](../../../frontend/src/app/(public)/(auth)/reset-password/confirm/page.jsx) (grupo `(public)/(auth)`, mesmo layout de login/cadastro). Registrada em `PUBLIC_ROUTES.resetPasswordConfirm` (`routes.config.js`) para o `proxy.js` não bloquear a rota. Verificado no navegador.
- [x] A nova página deve fazer as mesmas validações de senha que temos acima e enviar um request ao backend para atualizar a senha do usuário caso as duas senhas correspondam.
  > ✅ 2026-09-22 15:20 — Reaproveita `getPasswordValidationErrors`; valida também `password === confirmPassword` (alert "As senhas não coincidem" se diferente) e a presença do `token` na URL (alert "Link inválido" se ausente). Envia `POST /api/v1/auth/reset-password { token, password }` (novo endpoint backend, valida hash+expiração do token, faz hash bcrypt da nova senha, limpa o token). Testado end-to-end no navegador contra o backend real: senha redefinida, confirmada com login bem-sucedido via `curl` usando a nova senha.
  >
  > ⚠️ Durante o teste manual foi encontrado e corrigido um vazamento de dados **fora do escopo direto desta task, mas causado por ela**: `POST /auth/login` retornava `resetPasswordTokenHash`/`resetPasswordExpiresAt` no objeto `user` (o método só excluía `password` manualmente do resultado do Prisma). Corrigido em `auth.service.js#login` e coberto por teste de regressão em `auth.test.js`.

## Notas gerais de execução

- Backend não estava listado em "Contexto técnico" (spec só menciona Frontend), mas duas tasks de redefinição de senha exigem funcionalidade que não existia (envio de email, endpoint de redefinição). Aplicado o item 8 do `como-executar.md`: implementado o necessário no backend (módulo `auth` existente, sem criar módulo novo) e registrado aqui como desvio.
- `backend`: 427/427 testes passando, 100% de cobertura em `src/modules/auth/**` e no novo `src/services/email.service.js` (`npm test` dentro de `backend/`).
- `frontend`: stack de testes (Jest/Testing Library) criada do zero; 46/46 testes passando, 100% de cobertura nos arquivos desta spec (`npm test` dentro de `frontend/`).
- Corrigidas duas inconsistências de configuração pré-existentes, encontradas ao testar o fluxo end-to-end no navegador (sem elas o cadastro/redefinição não funcionavam de ponta a ponta): `backend/.env(.example)` tinha `CORS_ORIGIN_ALLOWED=http://localhost:4200` (frontend roda em `4000`); `.claude/launch.json` tinha a porta do frontend divergente do `package.json` (`3001` vs `4000`, além de não ter entrada para o backend).
