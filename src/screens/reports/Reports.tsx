import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import { PIPES, PIPE_NAMES, tagsFor, type Card } from "../opportunities/data";
import {
  ACTV_DATA, ASSET_MIX, DIVISION_GCI, FORECAST, FUNNEL, GEOGRAPHY, INC_HIST, INC_KPIS,
  INC_PAID, INC_RECV, INC_TOTAL_LINE, LOSS_REASONS, MKT_ATTR, MKT_CHANNELS, MKT_KPIS,
  PRICE_BANDS, REP_NAV, REPORT_KPIS, SOURCES, VELOCITY,
} from "./data";
import "./Reports.css";

/* ================= SCREEN 6 · REPORTS (fragment 09) =================
   Category nav rail (hover to switch) + period + Export PDF. Overview /
   Pipeline & Forecast / Sources & Market / Activity / Marketing / Income. */

const H2 = ({ children }: { children: ReactNode }) => <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D", marginBottom: 22 }}>{children}</div>;
const Bar = ({ w, bg = "#0D0D0D", h = 8 }: { w: string; bg?: string; h?: number }) => <div style={{ height: h, background: "rgba(255,255,255,0.55)", position: "relative" }}><div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: w, background: bg }} /></div>;

const ALL_DEALS: Array<Card & { pipe: string }> = (["purchases", "listings", "rentals", "investments", "offmarket"] as const).flatMap((p) => PIPES[p].flatMap((c) => c.cards.map((card) => ({ ...card, stage: c.stage, pipe: PIPE_NAMES[p], tags: tagsFor(card) }))));
const fmtM = (m: number) => (m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${m.toFixed(1)}M`);

export function Reports() {
  const [sec, setSec] = useState("01");
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const actv = ACTV_DATA[period];

  /* Custom Report builder */
  const [crPipe, setCrPipe] = useState("all");
  const [crHeat, setCrHeat] = useState("all");
  const [crGroup, setCrGroup] = useState("pipe");
  const [crMetrics, setCrMetrics] = useState({ count: true, vol: true, gci: true, wgci: true });
  const crRows = useMemo(() => {
    const filtered = ALL_DEALS.filter((d) => (crPipe === "all" || d.pipe === crPipe) && (crHeat === "all" || d.status === crHeat) && !/\/mo/.test(d.budget));
    const dimOf = (d: Card & { pipe: string }) => crGroup === "pipe" ? d.pipe : crGroup === "stage" ? (d.stage ?? "—") : crGroup === "status" ? d.status : (d.tags?.[0] ?? "Untagged");
    const groups: Record<string, { count: number; vol: number; gci: number; wgci: number }> = {};
    for (const d of filtered) { const k = dimOf(d); const g = (groups[k] ??= { count: 0, vol: 0, gci: 0, wgci: 0 }); g.count++; g.vol += d.budgetNum; g.gci += d.budgetNum * 0.03; g.wgci += d.weightedNum * 0.03; }
    const rows = Object.entries(groups).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.wgci - a.wgci);
    const max = Math.max(...rows.map((r) => r.wgci), 1);
    return rows.map((r) => ({ ...r, barW: `${Math.round((r.wgci / max) * 100)}%` }));
  }, [crPipe, crHeat, crGroup]);

  const exportPdf = () => void recordAction({ actor: "user", action: `Reports · exported — PDF · scope ${period}` }, "reports", () => {});
  const crExport = () => void recordAction({ actor: "user", action: `Custom Report · exported — PDF · ${crPipe} · grouped by ${crGroup}` }, "reports/custom", () => {});

  return (
    <div style={{ padding: "0 48px 140px" }}>
      <div style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
        {/* NAV RAIL */}
        <div style={{ width: 186, flex: "none", position: "sticky", top: 24 }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", padding: "0 0 10px" }}>Report categories</div>
          {REP_NAV.map(([key, label], i) => {
            const on = sec === key;
            return (
              <div key={key} onClick={() => setSec(key)} onMouseEnter={() => setSec(key)} className="rp-navrow" style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 10px", margin: "0 -10px", borderBottom: "1px solid #E3E3E3", cursor: "pointer", userSelect: "none", transition: "background 150ms", background: on ? "rgba(255,255,255,0.62)" : "transparent" }}>
                <span style={{ fontFamily: SANS, fontSize: 11, letterSpacing: "0.1em", width: 20, flex: "none", fontWeight: on ? 500 : 200, color: on ? "#0D0D0D" : "#8F8F8F" }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "#0D0D0D" : "#303030" }}>{label}</span>
              </div>
            );
          })}
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, lineHeight: 1.6, color: "#B8B8B8", marginTop: 14 }}>Hover to switch — same numbers, one lens at a time.</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "22px 0 26px" }}>
            <div style={{ display: "flex", gap: 18 }}>
              {(["week", "month", "quarter"] as const).map((p) => {
                const on = period === p;
                return <span key={p} onClick={() => setPeriod(p)} style={{ cursor: "pointer", userSelect: "none", fontFamily: SANS, fontWeight: on ? 600 : 400, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: on ? "#0D0D0D" : "#8F8F8F", paddingBottom: 3, borderBottom: `1px solid ${on ? "#0D0D0D" : "transparent"}`, transition: "color 150ms" }}>{p}</span>;
              })}
            </div>
            <button onClick={exportPdf} className="rp-export" style={{ background: "transparent", border: "1px solid #B4B4B4", padding: "8px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "background 150ms" }}>Export PDF</button>
          </div>

          {/* ===== 01 · OVERVIEW ===== */}
          {sec === "01" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
              <div className="rp-kpigrid">
                {REPORT_KPIS.map((k) => (
                  <div key={k.label} style={{ padding: "24px 22px 22px", borderRight: "1px solid #E3E3E3", borderBottom: "1px solid #E3E3E3" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{k.label}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 34, lineHeight: 1, marginTop: 16, color: "#0D0D0D" }}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 6, borderTop: "1px solid #E3E3E3", paddingTop: 28 }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Annual GCI Target · 2026</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 16 }}>
                      <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 48, lineHeight: 1, color: "#0D0D0D" }}>$3.8M</span>
                      <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 18, color: "#8F8F8F" }}>of $6.5M</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 200, fontSize: 40, lineHeight: 1, color: "#0D0D0D" }}>58%</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end", marginTop: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D0D0D" }} />
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0D0D0D" }}>On pace · +$0.3M vs plan</span>
                    </div>
                  </div>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.55)", position: "relative", marginTop: 22 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "58%", background: "#0D0D0D" }} />
                  <div style={{ position: "absolute", left: "50%", top: -6, bottom: -6, width: 0.5, background: "#5D5D5D" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  {["Jan", "Plan · 50% by Jul", "Dec"].map((l) => <span key={l} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{l}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* ===== 02 · PIPELINE & FORECAST ===== */}
          {sec === "02" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
              <section>
                <H2>Pipeline by Status</H2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {FUNNEL.map((f) => (
                    <div key={f.stage} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                      <span style={{ width: 130, flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 13, letterSpacing: "0.06em", color: "#303030" }}>{f.stage}</span>
                      <div style={{ flex: 1 }}><Bar w={f.width} h={22} /></div>
                      <span style={{ width: 40, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 14.5, color: "#0D0D0D" }}>{f.count}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <H2>Pipeline by Stage</H2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {DIVISION_GCI.map((d) => (
                    <div key={d.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{d.label}</span>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14.5, color: "#0D0D0D" }}>{d.value}</span>
                      </div>
                      <Bar w={d.width} />
                    </div>
                  ))}
                </div>
              </section>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1.2fr", gap: 44, alignItems: "start" }}>
                <section>
                  <H2>Trailing 12-Month Outcomes</H2>
                  <div style={{ display: "flex", height: 22 }}><div style={{ width: "32%", background: "#0D0D0D" }} /><div style={{ width: "68%", background: "rgba(255,255,255,0.55)" }} /></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                    <div><div style={{ fontFamily: SANS, fontWeight: 200, fontSize: 30, color: "#0D0D0D", lineHeight: 1 }}>11</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", marginTop: 6 }}>Won · 32%</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontFamily: SANS, fontWeight: 200, fontSize: 30, color: "#8F8F8F", lineHeight: 1 }}>23</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", marginTop: 6 }}>Lost · 68%</div></div>
                  </div>
                </section>
                <section>
                  <H2>Loss Reasons</H2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {LOSS_REASONS.map((l) => (
                      <div key={l.reason}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{l.reason}</span>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{l.count}</span>
                        </div>
                        <Bar w={l.width} bg="#303030" h={6} />
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <H2>Asset Mix</H2>
                  <div style={{ display: "flex", height: 22 }}>{ASSET_MIX.map((a) => <div key={a.label} style={{ width: a.pct, background: a.shade }} />)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 18 }}>
                    {ASSET_MIX.map((a) => (
                      <div key={a.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: a.shade, flex: "none" }} /><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{a.label}</span></div>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{a.pct}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <section>
                <H2>6-Month GCI Forecast</H2>
                <div style={{ borderTop: "1px solid #E3E3E3" }}>
                  {FORECAST.map((f) => (
                    <div key={f.m} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #E3E3E3" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{f.m}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14.5, color: "#0D0D0D" }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ===== 04 · SOURCES & MARKET ===== */}
          {sec === "04" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
              <section>
                <H2>Pipeline by Asset Type</H2>
                <div style={{ borderTop: "1px solid #E3E3E3" }}>
                  {SOURCES.map((s) => (
                    <div key={s.name} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #E3E3E3" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{s.name}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14.5, color: "#0D0D0D" }}>{s.gci}</span>
                    </div>
                  ))}
                </div>
              </section>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr", gap: 44, alignItems: "start" }}>
                <section>
                  <H2>Sales Velocity</H2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {VELOCITY.map((v) => (
                      <div key={v.stage}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{v.stage}</span>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{v.days}</span>
                        </div>
                        <Bar w={v.width} h={6} />
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <H2>Price Bands</H2>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 150 }}>
                    {PRICE_BANDS.map((p) => (
                      <div key={p.band} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 8, height: "100%" }}>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{p.count}</span>
                        <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 110 }}><div style={{ width: "100%", height: p.h, background: "#0D0D0D" }} /></div>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.04em", color: "#8F8F8F" }}>{p.band}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <H2>Geographic Concentration</H2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {GEOGRAPHY.map((g) => (
                      <div key={g.area}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{g.area}</span>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{g.value}</span>
                        </div>
                        <Bar w={g.width} h={6} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ===== 05 · ACTIVITY ===== */}
          {sec === "05" && (
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                <H2>Activity &amp; Outreach</H2>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F" }}>scoped to this {period} — switch above</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", borderTop: "1px solid #E3E3E3", borderLeft: "1px solid #E3E3E3" }}>
                {actv.metrics.map(([label, value, pct]) => {
                  const neg = pct < 0;
                  return (
                    <div key={label} style={{ borderRight: "1px solid #E3E3E3", borderBottom: "1px solid #E3E3E3", padding: "18px 18px 16px" }}>
                      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8F8F8F" }}>{label}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 12 }}>
                        <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 34, lineHeight: 1, color: "#0D0D0D" }}>{value}</span>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: neg ? "#B45309" : "#10A37F" }}>{(neg ? "↓ " : "↑ ") + Math.abs(pct)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 2px 0" }}>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{actv.total}</span>
                <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 12, color: "#8F8F8F" }}>{actv.note}</span>
              </div>
            </section>
          )}

          {/* ===== 08 · MARKETING ===== */}
          {sec === "08" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
              <div className="rp-kpigrid">
                {MKT_KPIS.map((k) => (
                  <div key={k.label} style={{ padding: "24px 22px 22px", borderRight: "1px solid #E3E3E3", borderBottom: "1px solid #E3E3E3" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{k.label}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 30, lineHeight: 1, margin: "16px 0 10px", color: "#0D0D0D" }}>{k.value}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D" }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <section>
                <H2>Channels</H2>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {MKT_CHANNELS.map((c) => (
                    <div key={c.ch}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                        <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13.5, color: "#0D0D0D" }}>{c.ch}</span>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F" }}>{c.metric} · {c.lead}</span>
                      </div>
                      <Bar w={c.w} h={6} />
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <H2>Campaign Attribution</H2>
                <div style={{ borderTop: "1px solid #E3E3E3" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr", padding: "13px 0", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                    {["Campaign", "Channel", "Influenced", "GCI"].map((h) => <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>)}
                  </div>
                  {MKT_ATTR.map((r) => (
                    <div key={r.campaign} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr", padding: "15px 0", borderBottom: "1px solid #E3E3E3", alignItems: "center" }}>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{r.campaign}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.chan}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{r.influenced}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{r.gci}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ===== 07 · INCOME ===== */}
          {sec === "07" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
              <div className="rp-kpigrid">
                {INC_KPIS.map((k) => (
                  <div key={k.label} style={{ padding: "24px 22px 22px", borderRight: "1px solid #E3E3E3", borderBottom: "1px solid #E3E3E3" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{k.label}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 30, lineHeight: 1, margin: "16px 0 10px", color: "#0D0D0D" }}>{k.value}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D" }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <section>
                <H2>Open Receivables</H2>
                <div style={{ borderTop: "1px solid #E3E3E3" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 0.8fr 0.8fr 0.9fr 1.2fr", padding: "13px 0", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                    {["Deal", "When", "GCI", "Referral", "Net", "Status"].map((h) => <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>)}
                  </div>
                  {INC_RECV.map((r) => (
                    <div key={r.deal} style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 0.8fr 0.8fr 0.9fr 1.2fr", padding: "15px 0", borderBottom: "1px solid #E3E3E3", alignItems: "center" }}>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{r.deal}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.when}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{r.gci}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: r.ref === "—" ? "#B8B8B8" : "#B45309" }}>{r.ref}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{r.net}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: r.c }}>{r.st}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#5D5D5D", marginTop: 12 }}>{INC_TOTAL_LINE}</div>
              </section>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 44, alignItems: "start" }}>
                <section>
                  <H2>Collected · Monthly</H2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {INC_HIST.map((h) => (
                      <div key={h.m} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ width: 34, flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{h.m}</span>
                        <div style={{ flex: 1 }}><Bar w={h.w} h={10} /></div>
                        <span style={{ width: 52, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{h.amt}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <H2>Paid · 2026</H2>
                  <div style={{ borderTop: "1px solid #E3E3E3" }}>
                    {INC_PAID.map((p) => (
                      <div key={p.deal} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "13px 0", borderBottom: "1px solid #E3E3E3" }}>
                        <div>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D" }}>{p.deal}</div>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", marginTop: 2 }}>{p.when}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13.5, color: "#0D0D0D" }}>{p.net}</div>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", marginTop: 2 }}>gross {p.gci}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ===== 06 · CUSTOM REPORT ===== */}
          {sec === "06" && (
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <H2>Custom Report</H2>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{crRows.reduce((n, r) => n + r.count, 0)} deals · grouped by {crGroup === "pipe" ? "pipeline" : crGroup}</span>
              </div>
              <div className="rp-kpigrid" style={{ display: "block", padding: "18px 20px" }}>
                {([["Pipeline", crPipe, setCrPipe, [["All", "all"], ["Purchases", "Purchases"], ["Listings", "Listings"], ["Investments", "Investments"], ["Off-Market", "Off-Market"]]], ["Status", crHeat, setCrHeat, [["All", "all"], ["HOT", "HOT"], ["WARM", "WARM"]]], ["Group by", crGroup, setCrGroup, [["Pipeline", "pipe"], ["Stage", "stage"], ["Status", "status"], ["Tag", "tag"]]]] as Array<[string, string, (v: string) => void, Array<[string, string]>]>).map(([label, val, setter, opts]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <span style={{ width: 84, flex: "none", fontFamily: SANS, fontWeight: 600, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>{label}</span>
                    {opts.map(([l, id]) => { const on = val === id; return <div key={id} onClick={() => setter(id)} style={{ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 11.5, color: on ? "#0D0D0D" : "#5D5D5D", background: on ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${on ? "#0D0D0D" : "#E3E3E3"}`, borderRadius: 999, padding: "5px 12px", cursor: "pointer", userSelect: "none", transition: "all 150ms" }}>{l}</div>; })}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ width: 84, flex: "none", fontFamily: SANS, fontWeight: 600, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>Metrics</span>
                  {([["Count", "count"], ["Volume", "vol"], ["GCI", "gci"], ["Weighted GCI", "wgci"]] as Array<[string, keyof typeof crMetrics]>).map(([l, k]) => { const on = crMetrics[k]; return <div key={k} onClick={() => setCrMetrics((m) => ({ ...m, [k]: !m[k] }))} style={{ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 11.5, color: on ? "#0D0D0D" : "#5D5D5D", background: on ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${on ? "#0D0D0D" : "#E3E3E3"}`, borderRadius: 999, padding: "5px 12px", cursor: "pointer", userSelect: "none", transition: "all 150ms" }}>{l}</div>; })}
                </div>
                <div style={{ margin: "16px -20px 0", borderTop: "1px solid #E3E3E3" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "11px 20px", borderBottom: "1px solid #ECECEC", background: "rgba(255,255,255,0.38)" }}>
                    <span style={{ flex: 1, fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Segment</span>
                    {crMetrics.count && <span style={{ width: 70, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Deals</span>}
                    {crMetrics.vol && <span style={{ width: 96, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Volume</span>}
                    {crMetrics.gci && <span style={{ width: 90, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>GCI</span>}
                    {crMetrics.wgci && <span style={{ width: 110, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Weighted GCI</span>}
                  </div>
                  {crRows.map((r) => (
                    <div key={r.k} style={{ position: "relative", display: "flex", alignItems: "baseline", gap: 12, padding: "12px 20px", borderBottom: "1px solid #ECECEC" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: r.barW, background: "rgba(13,13,13,0.035)", pointerEvents: "none" }} />
                      <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D", position: "relative" }}>{r.k}</span>
                      {crMetrics.count && <span style={{ width: 70, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", position: "relative" }}>{r.count}</span>}
                      {crMetrics.vol && <span style={{ width: 96, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D", position: "relative" }}>{fmtM(r.vol)}</span>}
                      {crMetrics.gci && <span style={{ width: 90, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", position: "relative" }}>{fmtM(r.gci)}</span>}
                      {crMetrics.wgci && <span style={{ width: 110, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D", position: "relative" }}>{fmtM(r.wgci)}</span>}
                    </div>
                  ))}
                  {crRows.length === 0 && <div style={{ padding: "18px 20px", fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F" }}>No deals match these filters — widen the pipeline or status.</div>}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
                  <button onClick={crExport} className="rp-export" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "9px 18px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Save view</button>
                  <button onClick={crExport} className="rp-export" style={{ background: "transparent", border: "1px solid #B4B4B4", borderRadius: 999, padding: "9px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Export PDF</button>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>live on the same deals the board runs on</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
