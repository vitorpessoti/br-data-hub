// Table Component
const Table = ({ children, className = "", ...props }) => {
  return (
    <table className={`min-w-full ${className}`} {...props}>
      {children}
    </table>
  );
};
// TableHeader Component
const TableHeader = ({ children, className, ...props }) => {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
};
// TableBody Component
const TableBody = ({ children, className, ...props }) => {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
};
// TableRow Component
const TableRow = ({ children, className, ...props }) => {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  );
};
// TableCell Component
const TableCell = ({
  children,
  isHeader = false,
  className = "",
  ...props
}) => {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag className={` ${className}`} {...props}>
      {children}
    </CellTag>
  );
};
export { Table, TableHeader, TableBody, TableRow, TableCell };
