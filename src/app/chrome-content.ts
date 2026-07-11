/* Static content for the global chrome — notifications, shortcuts, command
   palette entries. Mirrors the v5 prototype's keymap and notification center. */

/** The prototype's reference "today" — seed dates hang off Jul 06 2026. */
export const TODAY_LABEL = "Monday, July 06 2026";

export interface NotifRow {
  id: string;
  dot: string;
  text: string;
  time: string;
  to?: string;
}

export const NOTIFICATIONS: NotifRow[] = [
  { id: "n1", dot: "#D0342C", text: "Marcelo Carvalho · touch overdue — day 4 of 3, draft ready", time: "2h ago", to: "/contact/marcelo" },
  { id: "n2", dot: "#D0342C", text: "Sterling · HOA package due Jul 11 — inside T-3 window", time: "3h ago", to: "/transactions" },
  { id: "n3", dot: "#10A37F", text: "Agent logged 11 actions overnight — brief assembled", time: "6:00", to: "/intelligence" },
  { id: "n4", dot: "#0D0D0D", text: "Golden Beach counter open since Thursday — principal call proposed", time: "Yesterday", to: "/opportunities" },
  { id: "n5", dot: "#B45309", text: "Coastal Title commitment on day 7 of usual 5 — chase staged", time: "Yesterday", to: "/contact/coastal" },
];

export interface ShortcutGroup {
  label: string;
  keys: { k: string; d: string }[];
}

export const SHORTCUTS: ShortcutGroup[] = [
  {
    label: "Global",
    keys: [
      { k: "⌘K", d: "Command palette" },
      { k: "?", d: "This shortcuts panel" },
      { k: "/", d: "Focus the command bar" },
      { k: "⌘Z", d: "Undo last action" },
    ],
  },
  {
    label: "Navigate · press G then…",
    keys: [
      { k: "G C", d: "Welcome (command)" },
      { k: "G O", d: "Contacts" },
      { k: "G P", d: "Opportunities" },
      { k: "G I", d: "Intelligence" },
      { k: "G R", d: "Reports" },
      { k: "G S", d: "Settings" },
    ],
  },
  {
    label: "Queue · Touch Today",
    keys: [
      { k: "J / K", d: "Move down / up" },
      { k: "⏎", d: "Approve selected" },
      { k: "E", d: "Edit selected" },
      { k: "S", d: "Skip / snooze" },
    ],
  },
  {
    label: "Create · press N then…",
    keys: [
      { k: "N L", d: "Log activity" },
      { k: "N T", d: "New task" },
      { k: "N C", d: "New contact" },
      { k: "N D", d: "New deal" },
    ],
  },
];

export interface PaletteCmd {
  label: string;
  hint: string;
  to: string;
}

export const PALETTE_COMMANDS: PaletteCmd[] = [
  { label: "Go to Welcome", hint: "navigate", to: "/welcome" },
  { label: "Go to Intelligence", hint: "navigate", to: "/intelligence" },
  { label: "Go to Contacts", hint: "navigate", to: "/contacts" },
  { label: "Go to Opportunities", hint: "navigate", to: "/opportunities" },
  { label: "Go to Inbox", hint: "navigate", to: "/inbox" },
  { label: "Go to Reports", hint: "navigate", to: "/reports" },
  { label: "Go to Settings", hint: "navigate", to: "/settings" },
  { label: "Open Marcelo C. — Rivage PH-A", hint: "deal", to: "/deal/op_rivage_pha" },
  { label: "Open contact · Marcelo Carvalho", hint: "contact", to: "/contact/marcelo" },
  { label: "Open contact · Anton Keller", hint: "contact", to: "/contact/keller" },
  { label: "Transactions · In Contract", hint: "navigate", to: "/transactions" },
];
