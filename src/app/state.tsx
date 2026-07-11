/* =========================================================================
   App state — auth gate + "view as" role (README §5).
   Data persistence (IndexedDB) arrives in Step 2; this holds only the
   session-level UI state for the shell.
   ========================================================================= */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "./roles";

interface AppState {
  authed: boolean;
  signIn: () => void;
  signOut: () => void;

  /** The role the user is currently "viewing as" (Admin is the true seat). */
  viewAs: Role;
  setViewAs: (role: Role) => void;

  /** Unread inbox count — wired to real data in Step 2; 0 = no badge for now. */
  inboxUnread: number;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [viewAs, setViewAs] = useState<Role>("admin");
  const [inboxUnread] = useState(0);

  const signIn = useCallback(() => setAuthed(true), []);
  const signOut = useCallback(() => {
    setAuthed(false);
    setViewAs("admin");
  }, []);

  const value = useMemo<AppState>(
    () => ({ authed, signIn, signOut, viewAs, setViewAs, inboxUnread }),
    [authed, signIn, signOut, viewAs, inboxUnread],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
