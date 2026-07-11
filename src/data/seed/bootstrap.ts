/* =========================================================================
   Seed bootstrap — runs once at first boot (README §4: prototype demo data
   = fixtures). Seeding bypasses audit/undo (it is baseline state, not a
   user or agent action).
   ========================================================================= */

import { idbGet, idbPut } from "../idb";
import { seedBulk } from "../repository";
import * as fx from "./fixtures";

const SEED_VERSION = 2;

interface SeedMeta {
  id: "seed";
  version: number;
  seeded_at: string;
}

export async function ensureSeeded(): Promise<void> {
  const meta = await idbGet<SeedMeta>("meta", "seed");
  if (meta && meta.version >= SEED_VERSION) return;

  await Promise.all([
    seedBulk("contacts", fx.contacts),
    seedBulk("mandates", fx.mandates),
    seedBulk("opportunities", fx.opportunities),
    seedBulk("transactions", fx.transactions),
    seedBulk("activities", fx.activities),
    seedBulk("threads", fx.threads),
    seedBulk("messages", fx.messages),
    seedBulk("drafts", fx.drafts),
    seedBulk("documents", fx.documents),
    seedBulk("referrals", fx.referrals),
    seedBulk("settings", fx.settings),
  ]);

  await idbPut("meta", {
    id: "seed",
    version: SEED_VERSION,
    seeded_at: new Date().toISOString(),
  } satisfies SeedMeta);
}
