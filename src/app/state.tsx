/* Session-level shell state — auth gate + "view as" role (README §5).
   Data persistence arrives in Step ②. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./roles";

interface AppState {
  authed: boolean;
  signIn: () => void;
  signOut: () => void;
  /** Admin is the true seat; view-as scopes the workspace to a role. */
  viewAs: Role;
  setViewAs: (r: Role) => void;
  /** true once the user has switched away from their own seat (Admin). */
  viewAsActive: boolean;
  exitViewAs: () => void;
  inboxUnread: number;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [viewAs, setViewAsRaw] = useState<Role>("admin");
  const [inboxUnread] = useState(0);

  const signIn = useCallback(() => setAuthed(true), []);
  const signOut = useCallback(() => { setAuthed(false); setViewAsRaw("admin"); }, []);
  const setViewAs = useCallback((r: Role) => setViewAsRaw(r), []);
  const exitViewAs = useCallback(() => setViewAsRaw("admin"), []);

  const value = useMemo<AppState>(
    () => ({ authed, signIn, signOut, viewAs, setViewAs, viewAsActive: viewAs !== "admin", exitViewAs, inboxUnread }),
    [authed, signIn, signOut, viewAs, setViewAs, exitViewAs, inboxUnread],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
