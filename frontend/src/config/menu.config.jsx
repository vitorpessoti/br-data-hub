import { GridIcon, UserCircleIcon } from "@/icons";
import { PRIVATE_ROUTES } from "@/config/routes.config";

export const MENU_ITEMS = [
  {
    key: "dashboard",
    name: "Dashboard",
    icon: <GridIcon />,
    path: PRIVATE_ROUTES.dashboard,
  },
  {
    key: "profile",
    name: "Perfil",
    icon: <UserCircleIcon />,
    path: PRIVATE_ROUTES.profile,
  },
];
