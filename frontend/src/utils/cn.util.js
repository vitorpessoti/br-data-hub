import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
/**
 * Combines and merges Tailwind CSS class names with conditional logic.
 * @example
 * cn("bg-white", isActive && "text-black", "px-4") → "bg-white text-black px-4"
 */
export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}
