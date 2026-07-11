import "./Placeholder.css";

/**
 * Scaffolding placeholder for screens built in later steps.
 * Follows the empty-state rule (README §7): short phrase + next action,
 * never an illustration.
 */
export function Placeholder({ name }: { name: string }) {
  return (
    <div className="placeholder">
      <div className="placeholder-card">
        <div className="placeholder-eyebrow">Scaffolded</div>
        <div className="placeholder-title">{name}</div>
        <div className="placeholder-note">
          Shell, tokens and navigation are in place. This screen is recreated
          from the v5 prototype in a later step.
        </div>
      </div>
    </div>
  );
}
