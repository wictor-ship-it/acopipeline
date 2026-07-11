/* =========================================================================
   Seed bootstrap — writes the v5 demo fixtures into IndexedDB once, on first
   run. Fixtures are the prototype's demo data (README: "Dados de demo do
   protótipo = fixtures de seed"). Seeding is baseline state, not a user/agent
   action, so it bypasses audit/undo (seedBulk).
   ========================================================================= */
import { idbGet, idbPut } from "../idb";
import { seedBulk } from "../repository";
import { fixtures } from "./fixtures";

const SEED_KEY = "seed_version";
const SEED_VERSION = 2;

export async function ensureSeeded(): Promise<void> {
  const meta = await idbGet<{ id: string; value: number }>("meta", SEED_KEY);
  if (meta?.value === SEED_VERSION) return;

  await seedBulk("contacts", fixtures.contacts);
  await seedBulk("mandates", fixtures.mandates);
  await seedBulk("opportunities", fixtures.opportunities);
  await seedBulk("transactions", fixtures.transactions);
  await seedBulk("activities", fixtures.activities);
  await seedBulk("threads", fixtures.threads);
  await seedBulk("messages", fixtures.messages);
  await seedBulk("drafts", fixtures.drafts);
  await seedBulk("documents", fixtures.documents);
  await seedBulk("referrals", fixtures.referrals);
  await seedBulk("settings", fixtures.settings);
  await seedBulk("vault", fixtures.vault);

  await idbPut("meta", { id: SEED_KEY, value: SEED_VERSION });
}
