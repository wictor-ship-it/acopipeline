/* =========================================================================
   Activities + Referrals seed — extracted verbatim from v5
   (activities log ~10964–11010; referral cards ~11391–11630).
   ========================================================================= */

import type { Activity, Referral } from "../../domain/types";

export const activities: Activity[] = [
  { id: "act_1", type: "call", date: "Jul 06", label: "Estates at Acqualina 5601", body: "Confirmed Saturday 11am tour with buyer.", outcome: "advanced", by_agent: false, opportunity_id: "op_estates_5601" },
  { id: "act_2", type: "showing", date: "Jul 04", label: "Marcelo C. · Rivage PH-A", body: "Toured with spouse. Strong response to layout; spouse raised construction timeline concern.", outcome: "advanced", by_agent: true, contact_id: "marcelo", opportunity_id: "op_rivage_pha" },
  { id: "act_3", type: "call", date: "Jul 03", label: "Robert Sterling · Acqualina 4802", body: "Financing confirmed; scheduling final tour.", outcome: "advanced", by_agent: false, contact_id: "sterling", opportunity_id: "op_acqualina_4802" },
  { id: "act_4", type: "call", date: "Jul 03", label: "Anton Keller · Golden Beach", body: "Reviewed counter terms; principal call next week.", outcome: "neutral", by_agent: false, contact_id: "keller", opportunity_id: "op_golden_beach" },
  { id: "act_5", type: "whatsapp", date: "Jul 02", label: "Marcelo C. · Rivage PH-A", body: "Shared developer brochure and finish schedule.", outcome: "neutral", by_agent: false, contact_id: "marcelo", opportunity_id: "op_rivage_pha" },
  { id: "act_6", type: "call", date: "Jul 02", label: "Carlos Alvarez · Continuum 2904", body: "Confirmed appraisal ordered; close on track for Jul 18.", outcome: "neutral", by_agent: false, contact_id: "alvarez", opportunity_id: "op_continuum_2904" },
  { id: "act_7", type: "email", date: "Jul 01", label: "Kenji Nakamura · Bal Harbour 1503", body: "Submitted offer package; awaiting counter.", outcome: "neutral", by_agent: false, contact_id: "nakamura" },
  { id: "act_8", type: "note", date: "Jun 30", label: "Ana Bittencourt", body: "Introduced Marcelo Carvalho; thanked and kept warm.", outcome: "neutral", by_agent: false, contact_id: "bittencourt" },
  { id: "act_9", type: "showing", date: "Jun 28", label: "Elena Ravel · Faena 8C", body: "Second viewing of Faena 8C; positive on finishes.", outcome: "advanced", by_agent: false, contact_id: "ravel" },
  { id: "act_10", type: "whatsapp", date: "Jun 28", label: "Faena Penthouse", body: "Prompted seller for a counter response.", outcome: "neutral", by_agent: false, opportunity_id: "op_faena_ph" },
  { id: "act_11", type: "email", date: "Jun 26", label: "Anton Keller · Golden Beach", body: "Sent comparative valuation on two compounds.", outcome: "neutral", by_agent: false, contact_id: "keller", opportunity_id: "op_golden_beach" },
  { id: "act_12", type: "note", date: "Jun 21", label: "Robert Sterling", body: "Comparing Acqualina vs Estates unit; leaning Acqualina.", outcome: "neutral", by_agent: false, contact_id: "sterling" },
];

export const referrals: Referral[] = [
  { id: "ref_rivage", partner_id: "bittencourt", client: "Marcelo C.", stage: "Offer strategy", fee_pct: 25, agreement_status: "Signed · on file", payout_status: "projected" },
  { id: "ref_golden", partner_id: "bittencourt", client: "Bianca F.", stage: "Prep & staging", fee_pct: 25, agreement_status: "Signed · on file", payout_status: "projected" },
  { id: "ref_continuum", partner_id: "bittencourt", client: "Miguel A.", stage: "Closing", fee_pct: 25, agreement_status: "Signed · on file", payout_status: "payable" },
  { id: "ref_setai", partner_id: "bittencourt", client: "R. Almeida", stage: "Paid ✓", fee_pct: 25, agreement_status: "Signed · on file", payout_status: "paid" },
];
