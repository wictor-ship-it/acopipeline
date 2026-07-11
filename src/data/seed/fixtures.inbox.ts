/* =========================================================================
   Inbox seed — threads, messages, drafts. Extracted verbatim from v5
   (inbox JS fixtures ~11013–11135; Touch Today drafts ~12410–12470).
   R6: draft language follows the contact (marcelo/bittencourt=PT,
   alvarez=ES, others=EN).
   ========================================================================= */

import type { Draft, Message, Thread } from "../../domain/types";

export const threads: Thread[] = [
  { id: "t_marcelo", contact_id: "marcelo", channel: "whatsapp", unread: true, unread_count: 2, subject: "Rivage PH-A", initials: "MC", last_time: "09:12" },
  { id: "t_nakamura", contact_id: "nakamura", channel: "email", unread: true, unread_count: 1, subject: "Bal Harbour 1503", initials: "KN", last_time: "Jul 05" },
  { id: "t_sterling", contact_id: "sterling", channel: "sms", unread: false, unread_count: 0, subject: "Acqualina 4802", initials: "RS", last_time: "Jul 03" },
  { id: "t_ravel", contact_id: "ravel", channel: "whatsapp", unread: false, unread_count: 0, subject: "Faena 8C", initials: "ER", last_time: "Jun 28" },
  { id: "t_keller", contact_id: "keller", channel: "email", unread: false, unread_count: 0, subject: "Golden Beach", initials: "AK", last_time: "Jun 26" },
  { id: "t_alvarez", contact_id: "alvarez", channel: "whatsapp", unread: false, unread_count: 0, subject: "Continuum 2904", initials: "CA", last_time: "Jul 02" },
  { id: "t_bittencourt", contact_id: "bittencourt", channel: "whatsapp", unread: false, unread_count: 0, subject: "Referral partner", initials: "AB", last_time: "Jun 30" },
];

export const messages: Message[] = [
  // Marcelo Carvalho · Rivage PH-A
  { id: "m_marcelo_1", thread_id: "t_marcelo", dir: "in", body: "Bom dia! We really enjoyed the Rivage tour on Saturday.", at: "Sat 14:20" },
  { id: "m_marcelo_2", thread_id: "t_marcelo", dir: "out", body: "So glad — the PH-A layout suits your brief. Happy to walk through the finish timeline whenever works.", at: "Sat 15:02" },
  { id: "m_marcelo_3", thread_id: "t_marcelo", dir: "in", body: "My wife is a little concerned about the construction schedule. Could you send the developer’s latest?", at: "Sat 16:45" },
  { id: "m_marcelo_4", thread_id: "t_marcelo", dir: "out", body: "Of course — sending the developer’s finish schedule and brochure now.", at: "Sun 10:05" },
  { id: "m_marcelo_5", thread_id: "t_marcelo", dir: "in", body: "Perfect, thank you. Saturday 11am works for a second visit.", at: "09:12" },
  // Kenji Nakamura · Bal Harbour 1503
  { id: "m_nakamura_1", thread_id: "t_nakamura", dir: "out", body: "Kenji, submitted the offer package this morning. I’ll flag the moment we hear back.", at: "Jul 01 09:30" },
  { id: "m_nakamura_2", thread_id: "t_nakamura", dir: "in", body: "Thank you. Reviewing with my advisor — will revert on the counter shortly.", at: "Jul 05 18:10" },
  // Robert Sterling · Acqualina 4802
  { id: "m_sterling_1", thread_id: "t_sterling", dir: "in", body: "Financing is confirmed on my end.", at: "Jul 03 11:02" },
  { id: "m_sterling_2", thread_id: "t_sterling", dir: "out", body: "Excellent — scheduling the final tour. Does Friday afternoon suit you?", at: "Jul 03 11:20" },
  // Elena Ravel · Faena 8C
  { id: "m_ravel_1", thread_id: "t_ravel", dir: "in", body: "Loved the finishes on the second viewing.", at: "Jun 28 16:40" },
  { id: "m_ravel_2", thread_id: "t_ravel", dir: "out", body: "Wonderful. I’ll prepare a summary of terms so you can review at your pace.", at: "Jun 28 17:15" },
  // Anton Keller · Golden Beach
  { id: "m_keller_1", thread_id: "t_keller", dir: "out", body: "Sent the comparative valuation on both compounds for your review.", at: "Jun 26 10:00" },
  { id: "m_keller_2", thread_id: "t_keller", dir: "in", body: "Received — let’s discuss the counter next week.", at: "Jun 26 14:30" },
  // Carlos Alvarez · Continuum 2904
  { id: "m_alvarez_1", thread_id: "t_alvarez", dir: "out", body: "Appraisal is ordered — close remains on track for Jul 18.", at: "Jul 02 12:05" },
  { id: "m_alvarez_2", thread_id: "t_alvarez", dir: "in", body: "Great, appreciate the update.", at: "Jul 02 12:40" },
  // Ana Bittencourt · Referral partner
  { id: "m_bittencourt_1", thread_id: "t_bittencourt", dir: "in", body: "Happy to introduce a couple more clients this quarter.", at: "Jun 30 09:15" },
  { id: "m_bittencourt_2", thread_id: "t_bittencourt", dir: "out", body: "That means a great deal, Ana — thank you. Lunch on me soon.", at: "Jun 30 09:50" },
];

/** Touch Today queue (Intelligence) — pending agent drafts, one per contact. */
export const drafts: Draft[] = [
  {
    id: "d_marcelo",
    target: { kind: "contact", id: "marcelo" },
    channel: "whatsapp",
    language: "PT",
    status: "pending",
    name_label: "Marcelo Carvalho",
    value_label: "$412K wGCI",
    subject: "2nd visit + developer schedule",
    plan: "Confirm Saturday 11am · attach construction timeline",
    body: "Marcelo — consegui o cronograma de obra do PH-A. Sábado 11h para a segunda visita? Levo o schedule de depósitos também.",
  },
  {
    id: "d_bittencourt",
    target: { kind: "contact", id: "bittencourt" },
    channel: "whatsapp",
    language: "PT",
    status: "pending",
    name_label: "Ana Bittencourt",
    value_label: "referral engine",
    subject: "referral ask · 94 days since close",
    plan: "Give first, then ask · one named introduction",
    body: "Ana — te devo uma. Tenho uma introdução que vale seu tempo, e uma pergunta: quem mais da sua rede deveria estar olhando Miami agora?",
  },
  {
    id: "d_keller",
    target: { kind: "contact", id: "keller" },
    channel: "whatsapp",
    language: "EN",
    status: "pending",
    name_label: "Anton Keller · Zurich FO",
    value_label: "$504K wGCI",
    subject: "principal call before Wednesday",
    plan: "15-min call · align Golden Beach counter window",
    body: "Anton — the Golden Beach window is moving. 15 minutes tomorrow to align the counter before Wednesday?",
  },
  {
    id: "d_sterling",
    target: { kind: "contact", id: "sterling" },
    channel: "whatsapp",
    language: "EN",
    status: "pending",
    name_label: "Robert Sterling",
    value_label: "$530K wGCI",
    subject: "inspection ends today",
    plan: "Same-day summary · HOA package next",
    body: "Robert — inspection wraps today. Summary tonight, and we file the HOA package right after. Nothing needed from you yet.",
  },
  {
    id: "d_nakamura",
    target: { kind: "contact", id: "nakamura" },
    channel: "whatsapp",
    language: "EN",
    status: "pending",
    name_label: "Yuki Nakamura",
    value_label: "$400K wGCI",
    subject: "closing Jul 30 · walk-through",
    plan: "Confirm walk-through Jul 28 · verify wire by phone",
    body: "Yuki — walk-through July 28, 10am works? Wire instructions confirmed by the title company by phone — never trust the emailed version.",
  },
  {
    id: "d_duarte",
    target: { kind: "contact", id: "duarte" },
    channel: "whatsapp",
    language: "PT",
    status: "pending",
    name_label: "Duarte Family Office",
    value_label: "$15M mandate",
    subject: "Doral teaser · 48h follow-up",
    plan: "Offer site visit this week",
    body: "Fernando — o teaser de Doral: vale 20 minutos? Consigo organizar a visita ao site ainda esta semana.",
  },
  {
    id: "d_fontes",
    target: { kind: "contact", id: "fontes" },
    channel: "whatsapp",
    language: "PT",
    status: "pending",
    name_label: "Isabela Fontes",
    value_label: "new · inbound",
    subject: "welcome + qualify",
    plan: "Warm welcome · discovery slot",
    body: "Isabela — bem-vinda! Aqui é o Wictor. Me conta o que você procura em Miami — café ou uma call rápida esta semana?",
  },
  {
    id: "d_zanotti",
    target: { kind: "contact", id: "zanotti" },
    channel: "whatsapp",
    language: "EN",
    status: "pending",
    name_label: "Paolo Zanotti",
    value_label: "closed 2025",
    subject: "purchase anniversary",
    plan: "Anniversary note · quiet cross-sell radar",
    body: "Paolo — one year at Portofino this week. How is the residence treating you? A few quiet things nearby worth seeing on your next visit.",
  },
];
