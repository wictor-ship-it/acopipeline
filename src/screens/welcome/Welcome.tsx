import { useState } from "react";
import { useNavigate } from "react-router-dom";
import content from "../../data/seed/content.json";
import { agentService } from "../../agent/MockAgentService";
import "./Welcome.css";

const w = content.welcome;

interface Turn {
  q: string;
  a: string;
}

export function Welcome() {
  const navigate = useNavigate();
  const [ask, setAsk] = useState("");
  const [thread, setThread] = useState<Turn[]>([]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q) return;
    setAsk("");
    const { reply } = await agentService.ask(q);
    setThread((t) => [...t, { q, a: reply }]);
  }

  return (
    <div className="wc-wrap">
      <div className="wc-hero">
        <div className="wc-greeting">
          {w.greeting} <span className="sub">{w.greetingSub}</span>
        </div>

        <div className="wc-ask">
          <button type="button" className="plus" title="Upload contract / document — agent extracts terms">+</button>
          <input
            value={ask}
            placeholder={w.askPlaceholder}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit(ask);
            }}
          />
          <span className="voice">V</span>
          <button type="button" className="mic" title="Dictate">🎙</button>
        </div>

        <div className="wc-chips">
          {w.askChips.map((c) => (
            <span key={c} className="wc-chip" onClick={() => void submit(c)}>
              {c}
            </span>
          ))}
        </div>

        {thread.length > 0 && (
          <div className="wc-thread">
            {thread.map((t, i) => (
              <div className="wc-answer" key={i}>
                <div className="q">“{t.q}”</div>
                <div className="a">{t.a}</div>
              </div>
            ))}
            <button type="button" className="wc-clear" onClick={() => setThread([])}>
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="wc-reminders">
        {w.homeReminders.map((r, i) => (
          <div className="wc-reminder" key={i}>
            <span className="dot" style={{ background: r.dot }} />
            <span className="text">{r.text}</span>
            <span className="action">{r.action} →</span>
          </div>
        ))}
        <button type="button" className="wc-cockpit" onClick={() => navigate("/intelligence")}>
          {w.footerLink}
        </button>
      </div>
    </div>
  );
}
