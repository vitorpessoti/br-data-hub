# 011-docs

## Objetivo

Gerar documentação detalhada do projeto

## Contexto técnico

O leitor deve conseguir baixar, instalar e configurar o projeto em sua máquina local sem dificuldades. Deve ter com detalhes o que fazer para baixar o projeto (nome do projeto no github é `br-data-hub` e o owner é `vitorpessoti`), instalação e configuração (docker, variáveis de ambiente).
Deve também, antes de todo passo a passo de instalação e configuração, ter uma seção explicando o que é o projeto e o motivo do uso do BullMQ.


## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

### Documentação

- [x] Gerar a documentação em arquivo README.md, que ficará na raiz do projeto e na página inicial do projeto no GitHub.
  > ✅ 2026-09-23 12:00 — Criado `README.md` na raiz com: sobre o projeto (backend/frontend, infraestrutura, funcionalidades, arquitetura), seção "Por que BullMQ?" antes da instalação, pré-requisitos, passo a passo (clone de `vitorpessoti/br-data-hub`, `npm install` na raiz/backend/frontend, PostgreSQL e Redis via Docker, `.env` com versões Bash e PowerShell, geração do `JWT_SECRET`, `prisma:deploy`, `npm run dev`, primeiro acesso), tabelas de todas as variáveis de ambiente do backend e frontend, comandos, testes (unitários e e2e), rotas da API, estrutura de pastas e solução de problemas. Decisões/desvios: o `backend/docker-compose.yml` só tem o Redis, então o PostgreSQL é documentado com `docker run` (`postgres:16-alpine`, volume nomeado) sem alterar código; o comando não foi executado nesta máquina para não criar containers. Durante a verificação no código foi encontrado que, sem SMTP, o link de redefinição de senha **não** é gravado no log (só o aviso de envio ignorado), ao contrário do que dizia o comentário do `backend/.env.example`: README escrito com o comportamento real e comentário do `.env.example` corrigido. Também corrigida a porta do frontend no `frontend/README.md` (3001 → 4000). Obs.: ao iniciar, o conteúdo deste arquivo e o de `archive/010-perfil-usuario/spec.md` estavam trocados entre si; ambos foram restaurados.
