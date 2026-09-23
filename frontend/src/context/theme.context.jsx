"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(undefined);

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState("light");
  const [systemTheme, setSystemTheme] = useState("light");
  const [isInitialized, setIsInitialized] = useState(false);

  // Tema efetivo: "auto" segue a preferência do sistema operacional.
  const theme = themeMode === "auto" ? systemTheme : themeMode;

  useEffect(() => {
    // A preferência salva só existe no navegador, então é lida após a hidratação.
    const savedMode = localStorage.getItem("theme-mode");
    const legacySavedTheme = localStorage.getItem("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeModeState(savedMode || legacySavedTheme || "light");
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (themeMode !== "auto") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themeMode]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("theme-mode", themeMode);
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-color-scheme", theme);
  }, [theme, themeMode, isInitialized]);

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
