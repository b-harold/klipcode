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

// Remote bindings are enabled so `env.AI` works in local `next dev` — Workers
// AI has no local emulation and must proxy to Cloudflare. Only bindings marked
// `"remote": true` in wrangler.jsonc (currently just `ai`) use the remote
// proxy; everything else stays local. This needs a `wrangler login` session;
// without one the /api/generate-title route still degrades gracefully (its
// callers tolerate failure, same as every other optional Supabase/cloud path).
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev({ remoteBindings: true }));
