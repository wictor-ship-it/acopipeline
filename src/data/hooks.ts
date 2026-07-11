/* React hooks over the repository: live collections + undo toast state. */

import { useEffect, useState } from "react";
import {
  getAll,
  onDataChange,
  undoStack,
  type EntityStore,
  type UndoableAction,
} from "./repository";

/** Live collection — re-reads whenever its store mutates. */
export function useCollection<T extends { id: string }>(store: EntityStore): {
  items: T[];
  loading: boolean;
} {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const read = () => {
      getAll<T>(store).then((rows) => {
        if (alive) {
          setItems(rows);
          setLoading(false);
        }
      });
    };
    read();
    const off = onDataChange((changed) => {
      if (changed === store) read();
    });
    return () => {
      alive = false;
      off();
    };
  }, [store]);

  return { items, loading };
}

/** Top of the undo stack — drives the persistent Undo affordance (Law 3). */
export function useUndoTop(): UndoableAction | null {
  const [top, setTop] = useState<UndoableAction | null>(undoStack.peek());
  useEffect(() => undoStack.subscribe(setTop), []);
  return top;
}
