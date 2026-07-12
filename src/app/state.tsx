/* Session-level shell state — auth gate + "view as" role (README §5).
   Phase 2: also tracks the Google connection via the BFF. When the BFF is
   unreachable the app stays in mock/demo mode (Phase 1 behavior). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./roles";
import { getGoogleSession, googleLogout, startGoogleLogin } from "../data/adapters/googleAuth";

export interface GoogleConn {
  checked: boolean;    // probe finished
  reachable: boolean;  // BFF answered
  configured: boolean; // BFF has Google creds
  connected: boolean;  // a Google session exists
  email: string | null;
}

const GOOGLE_INIT: GoogleConn = { checked: false, reachable: false, configured: false, connected: false, email: null };

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
  /** Google connection state (via BFF). */
  google: GoogleConn;
  connectGoogle: () => void;
  disconnectGoogle: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [viewAs, setViewAsRaw] = useState<Role>("admin");
  const [inboxUnread] = useState(0);
  const [google, setGoogle] = useState<GoogleConn>(GOOGLE_INIT);

  const signIn = useCallback(() => setAuthed(true), []);
  const signOut = useCallback(() => { setAuthed(false); setViewAsRaw("admin"); }, []);
  const setViewAs = useCallback((r: Role) => setViewAsRaw(r), []);
  const exitViewAs = useCallback(() => setViewAsRaw("admin"), []);

  const connectGoogle = useCallback(() => startGoogleLogin(), []);
  const disconnectGoogle = useCallback(async () => {
    await googleLogout();
    setGoogle((g) => ({ ...g, connected: false, email: null }));
  }, []);

  /* On load: strip the ?auth=… redirect marker, then probe the BFF once. A live
     Google session auto-signs-in (real login); unreachable BFF ⇒ demo mode. */
  useEffect(() => {
    if (typeof window !== "undefined" && /[?&]auth=/.test(window.location.search)) {
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    let alive = true;
    void getGoogleSession().then((s) => {
      if (!alive) return;
      if (!s) { setGoogle({ ...GOOGLE_INIT, checked: true }); return; }
      setGoogle({ checked: true, reachable: true, configured: s.configured, connected: s.authed, email: s.email });
      if (s.authed) setAuthed(true);
    });
    return () => { alive = false; };
  }, []);

  const value = useMemo<AppState>(
    () => ({ authed, signIn, signOut, viewAs, setViewAs, viewAsActive: viewAs !== "admin", exitViewAs, inboxUnread, google, connectGoogle, disconnectGoogle }),
    [authed, signIn, signOut, viewAs, setViewAs, exitViewAs, inboxUnread, google, connectGoogle, disconnectGoogle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
