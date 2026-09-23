# Regras de Nomenclatura

Convenções globais de nomes de arquivos e diretórios. Podem ser referenciadas por qualquer spec.

## Regra geral

- nomes de arquivos e diretórios em `kebab-case`, sempre minúsculas
- nomes devem indicar **responsabilidade**, não implementação
- quando fizer sentido, o sufixo deve explicitar o papel do arquivo
- não usar `PascalCase`, `camelCase` ou mistura de maiúsculas em diretórios

Exemplos de diretórios válidos: `shared`, `pages`, `examples`, `customer-settings`.

## Sufixos recomendados

| Sufixo            | Uso                                                               |
| ----------------- | ----------------------------------------------------------------- |
| `*.entity.js`     | entidades de domínio                                              |
| `*.vo.js`         | value objects                                                     |
| `*.repository.js` | contratos ou implementações de repositório                        |
| `*.use-case.js`   | casos de uso                                                      |
| `*.service.js`    | serviços de domínio ou serviços do Nest                           |
| `*.provider.js`   | interfaces (portas)                                               |
| `*.controller.js` | controllers                                                       |
| `*.middleware.js` | middlewares                                                       |
| `*.guard.js`      | guards                                                            |
| `*.factory.js`    | fábricas para clientes, adapters, instâncias ou objetos complexos |
| `*.config.js`     | arquivos de configuração                                          |
| `*.types.js`      | tipos auxiliares                                                  |
| `*.page.jsx`      | páginas                                                           |
| `*.component.jsx` | componentes                                                       |
| `*.context.jsx`   | contextos React e hooks associados                                |
| `*.provider.jsx`  | providers de composição, wrappers globais, integração de runtime  |
| `*.hook.js`       | hooks                                                             |
| `*.store.js`      | stores                                                            |
| `*.spec.js`       | testes automatizados                                              |

### Exemplos aplicados

- `user.repository.js`
- `subscription.entity.js`
- `email.vo.js`
- `login.use-case.js`
- `auth.controller.js`
- `role-authorization.middleware.js`
- `login.page.jsx`
- `customer-form.component.jsx`
- `toast.context.jsx`
- `use-auth.hook.js`
- `session.store.js`
- `app.providers.jsx`
- `menu.types.js`
- `app.config.js`
- `api-client.factory.js`

## Exceções controladas

Nomes exigidos por ferramentas ou convenções externas mantêm o formato original. Exemplos: `README.md`, `SKILL.md`, `package.json`, `tsconfig.json`, `spec.md`.

Fora dessas exceções, prefira sempre `kebab-case`.

## Regra de decisão

Se um nome estiver ambíguo, prefira a forma que deixe mais claro:

- o que o arquivo representa
- em que camada ele vive
- qual a responsabilidade principal
