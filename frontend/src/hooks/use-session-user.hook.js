import { useSyncExternalStore } from "react";
import { getSessionUser, subscribeSession } from "@/stores/session.store";

// No servidor não há sessão no storage; o usuário aparece após a hidratação.
const getServerSnapshot = () => null;

export const useSessionUser = () =>
  useSyncExternalStore(subscribeSession, getSessionUser, getServerSnapshot);
