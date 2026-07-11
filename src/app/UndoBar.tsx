import { useState } from "react";
import { undoStack } from "../data/repository";
import { useUndoTop } from "../data/hooks";
import "./UndoBar.css";

/**
 * Persistent Undo affordance (Law 3): after any mutation the last action
 * is always reversible from here. Glass pill, bottom center.
 */
export function UndoBar() {
  const top = useUndoTop();
  const [busy, setBusy] = useState(false);

  if (!top) return null;

  return (
    <div className="undobar">
      <span className="undobar-label">{top.label}</span>
      <button
        type="button"
        className="undobar-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await undoStack.undoLast();
          } finally {
            setBusy(false);
          }
        }}
      >
        Undo
      </button>
    </div>
  );
}
