/* Performance · Network · Learning Loop — extracted verbatim from the v5
   Intelligence screen (BLOCK 03 / 05 / Learning Loop). */

export const performance = {
  gciForecast: {
    label: "GCI Forecast",
    scale: "Weighted · 6 months",
    whatIf: "What-if · Rivage slips to Oct?",
    months: [
      { month: "JUL", total: "$1.34M", raw: 1340 },
      { month: "AUG", total: "$420K", raw: 420 },
      { month: "SEP", total: "$4.4M", raw: 4396 },
      { month: "OCT", total: "$0", raw: 0 },
      { month: "NOV", total: "$599K", raw: 599 },
      { month: "DEC", total: "$180K", raw: 180 },
    ],
    expected: {
      month: "SEP",
      value: "$4.4M",
      rows: [
        { n: "Marcelo · Rivage PH-A", v: "$412K" },
        { n: "Zurich FO · Golden Beach", v: "$504K" },
        { n: "Faena Penthouse", v: "$460K" },
        { n: "Indian Creek Estate", v: "$3,020K" },
      ],
    },
  },
  weeklyMovement: {
    label: "Weekly Movement",
    narrative:
      "The week added three qualified relationships, all within the Acqualina–Rivage corridor. Five deals advanced a stage, led by the Zurich family office moving Golden Beach into Negotiation. Two positions slipped: Sunny Isles 3801 missed its June 30 close and the Bal Harbour listing crossed the touch threshold. One dead relationship was retired after four unanswered outreaches. Net weighted GCI rose $310K on stronger probability in the Collection division.",
    deltas: [
      { label: "New", value: "+3" },
      { label: "Advanced", value: "+5" },
      { label: "Slipped", value: "2" },
      { label: "Dead", value: "1" },
      { label: "Weighted GCI Δ", value: "+$310K" },
    ],
  },
  activity: {
    label: "Activity & Outreach",
    totalLabel: "566 touches this month",
    note: "vs 502 prior month",
    metrics: [
      { label: "Messages", value: "193", delta: "↑ 9%" },
      { label: "Calls", value: "74", delta: "↑ 4%" },
      { label: "Emails", value: "108", delta: "↓ 6%" },
      { label: "Showings", value: "22", delta: "↑ 29%" },
      { label: "Follow-ups", value: "128", delta: "↑ 12%" },
      { label: "Notes", value: "41", delta: "↑ 8%" },
    ],
  },
};

export const network = {
  hint: "directory lives in Contacts · Partners / Vendors",
  kpis: [
    { label: "Active Vendors", value: "14" },
    { label: "Referral Partners", value: "8" },
    { label: "Referrals YTD · In / Out", value: "11 / 6" },
    { label: "GCI via Network", value: "$2.3M" },
  ],
  vendorScorecard: {
    label: "Vendor Scorecard",
    hint: "Measured from transaction groups · nobody else measures this",
    columns: ["Vendor", "Role", "Deals", "On-Time", "Avg Response", "SLA Signal", "Cadence"],
    rows: [
      { name: "M. Delgado", role: "RE Attorney", deals: "9", onTime: "96%", avg: "2h", sla: "On pattern", cadence: "Lunch · due this quarter" },
      { name: "Coastal Title Co.", role: "Title", deals: "7", onTime: "71%", avg: "26h", sla: "Slipping · day 7 of usual 5", slaRisk: true, cadence: "—" },
      { name: "S. Whitfield", role: "Transaction Coord.", deals: "12", onTime: "98%", avg: "1h", sla: "On pattern", cadence: "Quarterly check-in · Aug" },
      { name: "ProInspect Miami", role: "Inspector", deals: "6", onTime: "88%", avg: "5h", sla: "On pattern", cadence: "—" },
      { name: "R. Katz", role: "Co-broke Agent", deals: "4", onTime: "—", avg: "3h", sla: "Compatible book · off-market channel", cadence: "Coffee · due Jul" },
    ],
  },
  reciprocity: {
    label: "Reciprocity Ledger",
    hint: "Who sends · who receives · what the balance asks for",
    columns: ["Partner", "Sent to You", "You Sent", "Balance", "Suggested Move"],
    rows: [
      { partner: "A. Bittencourt", sent: "7 referrals · $1.2M GCI", you: "2 introductions", balance: "You owe", risk: true, move: "Send the Zurich FO attorney intro + lunch in São Paulo" },
      { partner: "R. Katz · Co-broke", sent: "2 buyers", you: "2 listings", balance: "Even", move: "Propose off-market sourcing sweep together" },
      { partner: "M. Delgado", sent: "1 referral", you: "4 clients sent", balance: "Owes you", move: "Natural ask: estate-planning clients relocating to FL" },
      { partner: "Private Banker · Itaú Miami", sent: "1 UHNW intro", you: "0", balance: "You owe", risk: true, move: "Reciprocate: introduce the Duarte family" },
    ],
  },
  cadence: {
    label: "Network Cadence",
    hint: "A relationship with whoever closes with you is future pipeline",
    cards: [
      { when: "Jul", who: "R. Katz", what: "Coffee — explore off-market inventory swap", status: "Due", risk: true },
      { when: "Aug", who: "S. Whitfield", what: "Quarterly check-in + volume forecast for H2", status: "Scheduled" },
      { when: "Sep", who: "M. Delgado", what: "Lunch — 3 deals closed together this year", status: "Proposed" },
      { when: "Sep", who: "A. Bittencourt", what: "São Paulo trip — referral dinner", status: "Proposed" },
    ],
  },
};

export const learningLoop = {
  hint: "the system gets sharper every closed deal",
  cards: [
    {
      title: "Probability calibration",
      body: "Across 22 closed deals, your stated 60% historically closes at 45%; your 30% closes at 34%. Calibrated forecast: $4.89M weighted GCI vs $5.2M stated — −$310K optimism.",
      cta: "Apply calibrated forecast",
    },
    {
      title: "Lost post-mortem",
      body: "Pattern in the last 5 LOST: 3 lost to offer timing — the offer went out 48h+ after the tour, and a faster party contracted first. Proposed playbook change: offer-strategy call within 24h of any advanced tour.",
      cta: "Adjust playbook",
    },
    {
      title: "Personal cash flow · post-split",
      badge: "calibrated",
      body: "Oct–Nov valley — what you prospect this month closes in that window. 2 prospecting blocks reserved: Thu 9–11h · Fri 9–11h.",
      bodyRisk: true,
      cta: null,
    },
    {
      title: "Client visit · concierge",
      badge: "Jul 11–13",
      body: "Marcelo Carvalho in Miami. Itinerary drafted: Sat 11h Rivage 2nd visit · Sat 13h lunch at Makoto (A/CO standard) · Sun 10h Acqualina comparison tour. Dossier ready · post-visit follow-up armed.",
      cta: "Open itinerary",
    },
  ],
};
