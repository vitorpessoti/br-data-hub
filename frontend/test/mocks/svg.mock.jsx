// Substitui os imports de `*.svg` (transformados em componentes React pelo
// @svgr/webpack em runtime) por um componente simples durante os testes.
export default function SvgIconMock(props) {
  return <svg data-testid="icon-mock" {...props} />;
}
