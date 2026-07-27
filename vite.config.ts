// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// On the self-hosted VPS we run the SSR bundle with Node (pm2), so override
// Nitro's default cloudflare preset. In Lovable's sandbox/preview the
// LOVABLE=1 env is set, so keep cloudflare there to avoid breaking preview.
const isSelfHost = !process.env.LOVABLE;

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: isSelfHost
    ? { preset: "node-server" }
    : undefined,
});
