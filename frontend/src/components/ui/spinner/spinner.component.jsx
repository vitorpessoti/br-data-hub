import { cn } from "@/utils/cn.util";

// Spinner de carregamento no visual do template (a página de spinners do
// TailAdmin é exclusiva da versão Pro; este componente foi construído do zero).

const SIZES = {
  sm: "size-5 border-2",
  md: "size-8 border-[3px]",
  lg: "size-12 border-4",
  xl: "size-16 border-4",
};

const DOT_SIZES = {
  sm: "size-1.5",
  md: "size-2.5",
  lg: "size-3.5",
  xl: "size-4",
};

const COLORS = {
  primary: { ring: "border-brand-500", dot: "bg-brand-500" },
  success: { ring: "border-success-500", dot: "bg-success-500" },
  error: { ring: "border-error-500", dot: "bg-error-500" },
  warning: { ring: "border-warning-500", dot: "bg-warning-500" },
  info: { ring: "border-blue-light-500", dot: "bg-blue-light-500" },
  dark: {
    ring: "border-gray-800 dark:border-white/90",
    dot: "bg-gray-800 dark:bg-white/90",
  },
  light: { ring: "border-white", dot: "bg-white" },
};

export default function Spinner({
  variant = "ring",
  size = "md",
  color = "primary",
  label = "Carregando...",
  showLabel = false,
  className = "",
}) {
  const colors = COLORS[color] ?? COLORS.primary;

  const indicator =
    variant === "dots" ? (
      <span className="inline-flex items-center gap-1.5" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className={cn(
              "animate-bounce rounded-full",
              DOT_SIZES[size],
              colors.dot,
            )}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
    ) : (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block animate-spin rounded-full",
          SIZES[size],
          colors.ring,
          variant === "dashed" ? "border-dashed" : "border-t-transparent",
        )}
      />
    );

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-3", className)}
    >
      {indicator}
      {showLabel ? (
        <span
          className={cn(
            "text-theme-sm",
            color === "light"
              ? "text-white"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
