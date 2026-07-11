/* =========================================================================
   Agent voice guard — README §12 Constitution. Short, declarative, specific.
   No exclamation, no emoji. Forbidden superlatives never appear in output.
   Every draft the mock emits passes through violatesVoice() in a dev check.
   ========================================================================= */

/* Forbidden superlatives (§12 — copied literally from the Constitution list). */
export const FORBIDDEN_SUPERLATIVES = [
  "ultra-luxury", "world-class", "exclusive", "iconic",
  "state-of-the-art", "best-in-class", "premier", "bespoke",
] as const;

export interface VoiceViolation { reason: string; match: string; }

/** Returns the list of voice violations in a piece of agent output (empty = clean). */
export function violatesVoice(text: string): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN_SUPERLATIVES) {
    if (lower.includes(word)) out.push({ reason: "forbidden superlative", match: word });
  }
  if (text.includes("!")) out.push({ reason: "no exclamation", match: "!" });
  /* Emoji range check (no pictographs). */
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) {
    out.push({ reason: "no emoji", match: "emoji" });
  }
  return out;
}
