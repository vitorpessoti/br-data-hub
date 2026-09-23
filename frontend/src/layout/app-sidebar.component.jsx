"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_ITEMS } from "@/config/menu.config";
import { HOME_ROUTE } from "@/config/routes.config";
import { useSidebar } from "@/context/sidebar.context";
import { cn } from "@/utils/cn.util";

const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:mt-0 dark:border-gray-800 dark:bg-gray-900 ${
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
      >
        <Link href={HOME_ROUTE}>
          {showText ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
                priority
                style={{ width: "auto", height: "auto" }}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
                priority
                style={{ width: "auto", height: "auto" }}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
              priority
              style={{ width: "auto", height: "auto" }}
            />
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <ul className="flex flex-col gap-1">
            {MENU_ITEMS.map((item) => {
              const isActive = item.path === pathname;
              return (
                <li key={item.key}>
                  <Link
                    href={item.path}
                    className={cn(
                      "group menu-item",
                      isActive ? "menu-item-active" : "menu-item-inactive",
                    )}
                  >
                    <span
                      className={cn(
                        isActive
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive",
                      )}
                    >
                      {item.icon}
                    </span>
                    {showText && (
                      <span className="menu-item-text">{item.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
