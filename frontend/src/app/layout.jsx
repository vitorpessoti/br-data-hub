import "flatpickr/dist/flatpickr.css";
import { Outfit } from "next/font/google";
import { SidebarProvider } from "@/context/sidebar.context";
import { ThemeProvider } from "@/context/theme.context";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "BR Data Hub",
    template: "%s | BR Data Hub",
  },
  description: "Consultas de CEP, CNPJ e outros dados públicos do Brasil.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" dir="ltr">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
