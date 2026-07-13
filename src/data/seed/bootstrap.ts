/* =========================================================================
   Seed bootstrap — writes baseline state once per store, on first run.

   • Demo / IndexedDB mode: seed the full v5 prototype fixtures (README:
     "Dados de demo do protótipo = fixtures de seed") so the app is populated
     with no backend.
   • Remote / Postgres mode (real use): seed ONLY the operating config
     (settings) — a real database starts clean; the Principal brings their own
     contacts/deals. Seeding demo people into real data would be wrong.

   Seeding is baseline state, not a user/agent action, so it bypasses audit/undo
   (seedBulk). Runs after selectBackend(), so it targets the right store.
   ========================================================================= */
import { backend, isRemote } from "../backend";
import { seedBulk } from "../repository";
import { fixtures } from "./fixtures";

const SEED_KEY = "seed_version";
const SEED_VERSION = 2;

export async function ensureSeeded(): Promise<void> {
  const meta = await backend().get<{ id: string; value: number }>("meta", SEED_KEY);
  if (meta?.value === SEED_VERSION) return;

  // Operating defaults (cadences, autonomy, pipeline stages…) — every mode.
  await seedBulk("settings", fixtures.settings);

  // Demo content — local/demo only. A real server DB stays clean.
  if (!isRemote()) {
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
    await seedBulk("vault", fixtures.vault);
  }

  await backend().put("meta", { id: SEED_KEY, value: SEED_VERSION });
}
