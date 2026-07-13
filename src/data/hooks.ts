/* React hooks over the repository: live collections + undo top. */
import { useEffect, useState } from "react";
import { getAll, onDataChange, undoStack, type EntityStore, type UndoableAction } from "./repository";

/* Session-level cache of the last-loaded rows per store. With the remote
   (Postgres) backend, useCollection refetches on every mount — this cache lets
   a remount (navigating back to a screen) render the previous rows INSTANTLY
   while the refetch runs in the background, so contacts don't visibly vanish
   and reappear. Cleared naturally on a full page reload. */
const collectionCache = new Map<string, unknown[]>();

export function useCollection<T extends { id: string }>(store: EntityStore): { items: T[]; loading: boolean } {
  const [items, setItems] = useState<T[]>(() => (collectionCache.get(store) as T[]) ?? []);
  // Only "loading" when we have nothing cached to show yet.
  const [loading, setLoading] = useState<boolean>(() => !collectionCache.has(store));
  useEffect(() => {
    let alive = true;
    const cached = collectionCache.get(store) as T[] | undefined;
    if (cached) { setItems(cached); setLoading(false); }
    const read = () => getAll<T>(store).then((rows) => {
      collectionCache.set(store, rows);
      if (alive) { setItems(rows); setLoading(false); }
    });
    read();
    const off = onDataChange((changed) => { if (changed === store) read(); });
    return () => { alive = false; off(); };
  }, [store]);
  return { items, loading };
}

export function useUndoTop(): UndoableAction | null {
  const [top, setTop] = useState<UndoableAction | null>(undoStack.peek());
  useEffect(() => undoStack.subscribe(setTop), []);
  return top;
}
