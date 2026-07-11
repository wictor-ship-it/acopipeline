/* =========================================================================
   Seed fixtures — extracted from the v5 prototype (README §4).
   PLACEHOLDER: being filled with the exact demo data from
   design-reference/Pipeline Intelligence v5.dc.html (extraction in progress).
   ========================================================================= */

import type { DocumentRef } from "../../domain/types";

export { contacts, mandates } from "./fixtures.contacts";
export { opportunities, transactions } from "./fixtures.deals";
export { activities, referrals } from "./fixtures.activities";
export { threads, messages, drafts } from "./fixtures.inbox";
export const documents: DocumentRef[] = [];

/** settings store rows (id-keyed) — cadences/types/autonomy modeled in
 *  Settings from day one (README §8 note + backlog item 8). */
export const settings: { id: string; [k: string]: unknown }[] = [
  {
    id: "cadences",
    hot: "every 3 days",
    warm: "weekly",
    nurturing: "monthly",
    won: "quarterly",
    lost: "none",
  },
  {
    id: "contact_types",
    types: ["client", "prospect", "sphere", "partner", "vendor"],
  },
  {
    id: "autonomy_rules",
    // Default Fase 1 (README §12): autonomous vs approval-required
    autonomous: [
      "capture/structure communication",
      "data hygiene",
      "prepare drafts",
      "chase vendors",
    ],
    approval_required: [
      "any send to client",
      "lead status change",
      "commitments on behalf of Principal",
    ],
  },
  {
    id: "team",
    members: [],
  },
];
