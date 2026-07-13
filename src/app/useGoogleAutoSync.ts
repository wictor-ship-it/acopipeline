/* Background one-way Google Contacts → CRM sync. Runs every 5 minutes while the
   app is open, on a real (remote) account with Google connected. The manual
   "Sync now" button in Contacts keeps working; both share syncGoogleContacts,
   which dedupes and is guarded against overlapping runs. */
import { useEffect } from "react";
import { useAppState } from "./state";
import { isRemote } from "../data/backend";
import { syncGoogleContacts } from "../data/googleSync";

const FIVE_MIN = 5 * 60 * 1000;

export function useGoogleAutoSync() {
  const { google } = useAppState();
  const connected = google?.connected ?? false;
  useEffect(() => {
    if (!isRemote() || !connected) return;
    let cancelled = false;
    const run = () => { if (!cancelled) void syncGoogleContacts("agent"); };
    // A catch-up sync shortly after load, then every 5 minutes.
    const kick = setTimeout(run, 20_000);
    const timer = setInterval(run, FIVE_MIN);
    return () => { cancelled = true; clearTimeout(kick); clearInterval(timer); };
  }, [connected]);
}
