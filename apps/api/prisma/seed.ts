/**
 * Database seed entrypoint (`prisma db seed`).
 *
 * Phase 1 defines no domain models, so there is nothing to seed yet — the
 * script exists so the seeding pipeline (runner, logging, exit discipline) is
 * in place and CI can execute it from day one. Phase 2 fills this with
 * deterministic reference + demo data inside a transaction.
 */
async function main(): Promise<void> {
  console.log(
    '[seed] No domain models defined yet — nothing to seed. (Phase 2 adds reference + demo data.)',
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exit(1);
  });
