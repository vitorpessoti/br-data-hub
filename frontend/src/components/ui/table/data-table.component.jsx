"use client";

import { useMemo, useState } from "react";
import Spinner from "@/components/ui/spinner/spinner.component";
import Pagination from "@/components/ui/table/pagination.component";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table.component";
import { cn } from "@/utils/cn.util";

// Tabela com busca, ordenação e paginação no visual do template.
// (A página "Data Tables" do TailAdmin é exclusiva da versão Pro; este componente
// foi construído sobre a tabela e a paginação da versão gratuita.)
//
// columns: [{ key, header, sortable?, render?(row), sortValue?(row), className? }]
// actions: botões opcionais exibidos ao lado do título.

const DEFAULT_PAGE_SIZES = [5, 10, 25];

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

function SortIcon({ direction }) {
  return (
    <span className="flex flex-col gap-0.5">
      <svg
        className={cn(
          "fill-gray-300 dark:fill-gray-700",
          direction === "asc" && "fill-brand-500 dark:fill-brand-500",
        )}
        width="8"
        height="5"
        viewBox="0 0 8 5"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M4.40962 0.585167C4.21057 0.300808 3.78943 0.300807 3.59038 0.585166L1.05071 4.21327C0.81874 4.54466 1.05582 5 1.46033 5H6.53967C6.94418 5 7.18126 4.54466 6.94929 4.21327L4.40962 0.585167Z" />
      </svg>
      <svg
        className={cn(
          "fill-gray-300 dark:fill-gray-700",
          direction === "desc" && "fill-brand-500 dark:fill-brand-500",
        )}
        width="8"
        height="5"
        viewBox="0 0 8 5"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M4.40962 4.41483C4.21057 4.69919 3.78943 4.69919 3.59038 4.41483L1.05071 0.786732C0.81874 0.455343 1.05582 0 1.46033 0H6.53967C6.94418 0 7.18126 0.455342 6.94929 0.786731L4.40962 4.41483Z" />
      </svg>
    </span>
  );
}

export default function DataTable({
  columns,
  data,
  rowKey = "id",
  title,
  actions,
  searchable = true,
  searchPlaceholder = "Buscar...",
  searchKeys,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  initialPageSize = pageSizeOptions[0],
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return data;
    const keys = searchKeys ?? columns.map((column) => column.key);
    return data.filter((row) =>
      keys.some((key) => normalize(row[key]).includes(term)),
    );
  }, [data, columns, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const column = columns.find((item) => item.key === sort.key);
    const valueOf = column?.sortValue ?? ((row) => row[sort.key]);
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const first = valueOf(a);
      const second = valueOf(b);
      if (typeof first === "number" && typeof second === "number") {
        return (first - second) * factor;
      }
      return (
        String(first ?? "").localeCompare(String(second ?? ""), "pt-BR", {
          numeric: true,
        }) * factor
      );
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const handlePageSize = (event) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
          {title && (
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h3>
          )}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>Exibir</span>
          <select
            value={pageSize}
            onChange={handlePageSize}
            className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span>registros</span>
        </div>

        {searchable && (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
              <svg
                className="fill-gray-500 dark:fill-gray-400"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                  fill=""
                />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pr-4 pl-12 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden sm:w-75 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>
        )}
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-white/5">
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  isHeader
                  className={cn(
                    "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400",
                    column.className,
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-3"
                    >
                      {column.header}
                      <SortIcon
                        direction={
                          sort.key === column.key ? sort.direction : null
                        }
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="px-5 py-10 text-center"
                >
                  <Spinner showLabel />
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row[rowKey]}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400",
                        column.className,
                      )}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row dark:border-white/5">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {sorted.length === 0
            ? "Nenhum registro"
            : `Exibindo ${start + 1} a ${start + pageRows.length} de ${sorted.length} registros`}
        </p>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
