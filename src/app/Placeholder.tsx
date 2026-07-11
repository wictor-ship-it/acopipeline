/* Scaffolding placeholder — screens are built one per step (PROMPT-INICIAL
   loop), each from its design-reference/screens/ fragment. */
import "./Placeholder.css";

export function Placeholder({ name }: { name: string }) {
  return (
    <div className="ph">
      <div className="ph-eyebrow">Shell ready</div>
      <div className="ph-title">{name}</div>
      <div className="ph-note">
        Tokens, ambient, sidebar, top bar and view-as are in place. This screen
        is built from its <code>design-reference/screens/</code> fragment in a
        later step.
      </div>
    </div>
  );
}
