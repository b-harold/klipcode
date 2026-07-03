import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler causes a benign Performance.measure timing error in
  // Turbopack dev mode (React 19 issue). Keep it enabled only for production.
  reactCompiler: process.env.NODE_ENV === "production",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;

// `remoteBindings: false` keeps local `next dev`/`next build` working without
// a `wrangler login` session. The `ai` binding has no local emulation and
// would otherwise force a remote proxy session (and thus a login) just to
// load the Next.js config; with it disabled, `env.AI` is simply unavailable
// locally and the /api/generate-title route degrades gracefully (its callers
// already tolerate that, same as every other optional Supabase/cloud path).
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev({ remoteBindings: false }));
