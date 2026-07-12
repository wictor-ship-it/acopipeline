import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/* Screen-level error boundary. A runtime throw in any screen used to blank the
   whole app (no boundary existed); now it is contained to the canvas — the
   sidebar and top bar stay usable, and navigating to another screen recovers
   (Shell keys this boundary by route so it remounts on navigation).
   Styled to the visual law: glass card, ink + grays, risk accent #D0342C only. */

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging; the fallback below is what the user sees.
    console.error("Screen error caught by boundary:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ padding: "48px" }}>
        <div
          style={{
            maxWidth: 620,
            borderRadius: 12,
            background: "rgba(255,255,255,0.42)",
            backdropFilter: "blur(22px) saturate(1.7)",
            WebkitBackdropFilter: "blur(22px) saturate(1.7)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
            padding: "26px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 7, height: 7, flex: "none", borderRadius: "50%", background: "#D0342C" }} />
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>This screen hit an error</span>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.6, color: "#5D5D5D", marginTop: 10 }}>
            The rest of the workspace is unaffected — use the sidebar to move on, or reload to try again. Nothing was sent and no record was changed by this error.
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#8F8F8F",
              background: "rgba(255,255,255,0.5)",
              border: "1px solid #E3E3E3",
              borderRadius: 8,
              padding: "12px 14px",
              marginTop: 16,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message || String(error)}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "9px 18px", fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "9px 18px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
