import { redirect } from "next/navigation";
import { HOME_ROUTE } from "@/config/routes.config";

// A raiz é tratada pelo proxy (dashboard ou login); este redirect é só um fallback.
export default function RootPage() {
  redirect(HOME_ROUTE);
}
