"use client";

import { useSidebar } from "@/context/sidebar.context";
import AppHeader from "@/layout/app-header.component";
import AppSidebar from "@/layout/app-sidebar.component";
import Backdrop from "@/layout/backdrop.component";

// Layout das páginas autenticadas: menu lateral, cabeçalho e área de conteúdo.
export default function AdminLayout({ children }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Margem do conteúdo acompanha o estado (expandido/recolhido) do menu lateral.
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
