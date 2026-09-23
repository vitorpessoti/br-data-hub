# BR Data Hub — Frontend

Next.js 16 (App Router) + Tailwind CSS 4, baseado no template TailAdmin (versão gratuita, MIT —
ver `LICENSE-TAILADMIN` e `../template`). Por enquanto todos os dados são mockados (`src/mocks`).

## Executar

```bash
cp .env.example .env
npm install
npm run dev   # http://localhost:4000 (o backend usa a porta 3000)
```

## Estrutura

```
src/
  app/          rotas do Next (arquivos finos que apontam para os módulos)
    (public)/   login, cadastro, redefinição de senha e 404
    (private)/  páginas que exigem autenticação
  modules/      páginas (*.page.jsx) e componentes específicos de cada página
  components/   elementos reutilizáveis (ui/, form/, common/, header/)
  layout/       layout logado (sidebar, header) e layout de autenticação
  config/       rotas públicas/privadas, menu lateral e autenticação
  context/      tema e estado do menu lateral
  mocks/        dados fictícios até a integração com o backend
  proxy.js      proteção das rotas
```

## Rotas públicas e privadas

As rotas ficam em `src/config/routes.config.js` e são aplicadas por `src/proxy.js`:

- rotas públicas: `/signin`, `/signup`, `/reset-password`, `/reset-password/confirm` e `/error-404`;
- rotas privadas exigem o cookie de sessão (`NEXT_PUBLIC_AUTH_SESSION_COOKIE`, padrão `access_token`);
- qualquer URL inexistente, ou privada sem sessão, é redirecionada para `/error-404`, para não
  revelar quais URLs existem;
- `/` leva ao dashboard (com sessão) ou ao login (sem sessão).

O login (`/signin`) chama `POST /auth/login` no backend e grava a sessão em
`src/stores/session.store.js`: o token JWT vai para o cookie de sessão (lido pelo `proxy.js`) e
os dados do usuário (`name`, `email`) ficam no `sessionStorage` — ou no `localStorage`, com
"Manter conectado" (nesse caso o cookie expira junto com o token). A topbar e o perfil leem o
usuário com o hook `useSessionUser`; "Sair" limpa a sessão.

`AUTH_ENABLED=true` (padrão) liga a proteção; `AUTH_ENABLED=false` deixa todas as páginas
abertas para navegação, só para desenvolvimento. A variável é lida em tempo de execução.

## Elementos reutilizáveis

| Elemento | Arquivo |
| --- | --- |
| Spinner / carregamento de página | `components/ui/spinner/` |
| Modal base e modal de feedback (sucesso, erro, info, aviso) | `components/ui/modal/` |
| Alertas | `components/ui/alert/alert.component.jsx` |
| Badges | `components/ui/badge/badge.component.jsx` |
| Formulário (inputs, select, checkbox, radio, switch, data...) | `components/form/` |
| Tabela básica, paginação e tabela com busca/ordenação | `components/ui/table/` |

Exemplos de uso de cada elemento: menu **Outros → Elementos**.
