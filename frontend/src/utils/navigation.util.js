// Navegação com recarga completa da página (fora do router do Next), usada
// quando o estado do app precisa ser descartado — ex.: sessão expirada.
export const redirectTo = (path, location = window.location) =>
  location.assign(path);
