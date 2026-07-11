import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Two suites live under e2e/:
 *
 * - "chromium" (smoke.spec.ts): backend-less UI flows against the regular dev
 *   server on :3000.
 * - "sync" (sync.spec.ts): cloud-sync flows against a DEDICATED dev server on
 *   :3100 wired to the local Supabase stack. It only exists when E2E_SYNC is
 *   set (pnpm test:e2e:sync) and its credentials come from .env.e2e, written
 *   by scripts/e2e-sync-setup.sh. It never reuses the :3000 server: .env may
 *   point at the production Supabase project, and these tests sign up users
 *   and write rows.
 */
function readSyncEnv(): Record<string, string> {
  const envPath = path.join(__dirname, ".env.e2e");
  if (!fs.existsSync(envPath)) {
    throw new Error(
      "E2E_SYNC is set but .env.e2e is missing. Start the local Supabase stack first: pnpm e2e:sync:setup"
    );
  }

  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
    throw new Error(`.env.e2e must point at a local Supabase stack, got "${url}"`);
  }

  return env;
}

const syncEnv = process.env.E2E_SYNC ? readSyncEnv() : null;

if (syncEnv) {
  // Hand the spec what it needs under E2E_SYNC_* names. The NEXT_PUBLIC_* names
  // are reserved for the :3100 webServer env below — assigning them to this
  // process would leak into the :3000 smoke server too.
  process.env.E2E_SYNC_SUPABASE_URL = syncEnv.NEXT_PUBLIC_SUPABASE_URL;
  process.env.E2E_SYNC_ANON_KEY = syncEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  process.env.E2E_SYNC_SERVICE_ROLE_KEY = syncEnv.E2E_SUPABASE_SERVICE_ROLE_KEY;
}

const sharedUse = {
  ...devices["Desktop Chrome"],
  // The middleware redirects based on Accept-Language; pin English so
  // prefix-less URLs behave deterministically (Spanish is tested via /es).
  locale: "en-US",
  permissions: ["clipboard-read", "clipboard-write"],
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /sync\.spec\.ts/,
      use: sharedUse,
    },
    ...(syncEnv
      ? [
          {
            name: "sync",
            testMatch: /sync\.spec\.ts/,
            use: { ...sharedUse, baseURL: "http://localhost:3100" },
          },
        ]
      : []),
  ],
  webServer: [
    // Only one dev server runs at a time: the smoke suite uses :3000, the sync
    // suite uses :3100. Next.js refuses a second `next dev` in the same dir
    // ("Another next dev server is already running"), so they must be mutually
    // exclusive.
    ...(syncEnv
      ? []
      : [
          {
            command: "pnpm dev",
            url: "http://localhost:3000",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ]),
    ...(syncEnv
      ? [
          {
            command: "pnpm dev --port 3100",
            url: "http://localhost:3100",
            // Never reuse: a stray server on :3100 could carry different env.
            reuseExistingServer: false,
            timeout: 120_000,
            // Merged over process.env; real env vars take precedence over the
            // .env file in Next, so these override the developer's own values.
            env: syncEnv,
          },
        ]
      : []),
  ],
});
