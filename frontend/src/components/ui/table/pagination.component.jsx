const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Mostra até 3 páginas ao redor da atual, sem ultrapassar o total.
  const firstVisible = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + firstVisible,
  );
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="mr-2.5 flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3"
      >
        Anterior
      </button>
      <div className="flex items-center gap-2">
        {firstVisible > 1 && <span className="px-2">...</span>}
        {pagesAroundCurrent.map((page) => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`rounded px-4 py-2 ${
              currentPage === page
                ? "bg-brand-500 text-white"
                : "text-gray-700 dark:text-gray-400"
            } flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium hover:bg-blue-500/8 hover:text-brand-500 dark:hover:text-brand-500`}
          >
            {page}
          </button>
        ))}
        {firstVisible + 2 < totalPages && <span className="px-2">...</span>}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="ml-2.5 flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3"
      >
        Próxima
      </button>
    </div>
  );
};
export default Pagination;
