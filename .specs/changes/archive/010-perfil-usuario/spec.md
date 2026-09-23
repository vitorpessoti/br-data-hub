# 010-perfil-usuario

## Objetivo

Permitir alteração dos dados do usuário.

## Contexto técnico

Usuário deve poder alterar seu nome (único campo disponível no cadastro).
Email é único na base e não pode ser alterado.
Não serão necessários testes dentro do próprio navegador do Claude.

### Frontend

- Remover ícones de avatar.
- Bloquear o campo do email para alteração.
- Comunicar-se com o backend para processar alteração dos dados.


## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

### Frontend

- [x] Na topbar e na tela de perfil do usuário, remover o ícone de avatar ao lado do nome do usuário.
  > ✅ 2026-09-23 10:57 — Removido o `DefaultAvatar` de `user-dropdown.component.jsx` (topbar) e de `user-meta-card.component.jsx` (perfil). Como o componente ficou sem uso (e quebrava o threshold de 100% de cobertura), `components/ui/avatar/default-avatar.component.jsx` foi excluído. Specs ajustadas para garantir que nenhum avatar (`role="img"`) é renderizado.
- [x] Na modal de alteração do usuário, bloquear a edição do campo email.
  > ✅ 2026-09-23 10:57 — Campo E-mail da modal agora é `disabled` + `readOnly`, com hint "O e-mail não pode ser alterado.". Labels associadas aos inputs (`htmlFor`/`id`) para acessibilidade e testes.
- [x] Ao clicar em Salvar alterações, comunicar-se com o backend e processar a alteração na base.
  > ✅ 2026-09-23 10:57 — Formulário da modal passou a ser controlado (nome) e o submit chama `PATCH /auth/users/:id` via `apiClient` enviando apenas `{ name }` (com trim; nome vazio é barrado no front com alert). Botões ficam desabilitados e "Salvar" mostra spinner durante o envio; a modal não fecha (Esc/Fechar) enquanto salva.
- [x] No backend, enviar ao repository apenas os campos alteráveis, ou seja, não enviar o email. Desta forma, mesmo que a rota seja chamada manualmente por fora do frontend passando email no body, o email não será alterado.
  > ✅ 2026-09-23 10:57 — `AuthService.update` desestrutura apenas `name` e `password` (email ignorado, removida a checagem de conflito de email); `AuthValidator.updateValidation` não valida mais `email` e `UPDATABLE_FIELDS = ['name', 'password']` — body só com email retorna 400 `EMPTY_UPDATE` (mensagem ajustada para "name or password"). Senha mantida como campo alterável pois já era suportada pela rota. Testes em `auth.test.js` atualizados, incluindo o caso de email enviado no body não chegar ao repository.
- [x] Após retorno do backend, exibir alert de sucesso ou erro e em caso de sucesso, exibir os campos com os valores já alterados.
  > ✅ 2026-09-23 10:57 — Sucesso: modal fecha, alert "Perfil atualizado" exibido acima do card e o usuário da sessão é atualizado via nova função `updateSessionUser` (`session.store.js`, grava no mesmo storage da sessão e notifica assinantes), refletindo o novo nome no card e na topbar sem recarregar. Erro: alert com a mensagem do backend dentro da modal, que permanece aberta. Validação: frontend 228 testes / backend 439 testes passando, cobertura 100% nos thresholds, eslint sem erros. Sem testes no navegador, conforme contexto técnico.