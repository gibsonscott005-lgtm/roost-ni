// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Bolt's preview expects the build output in `dist` with an index.html it can
// serve. The Lovable config routes Nitro output to `dist` and enables its
// prerender preview shim only when it detects a Lovable sandbox environment.
// Force that detection on so the build produces the right output shape.
process.env.LOVABLE_SANDBOX = "1";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Load non-VITE_ env vars into process.env for server-side code only.
// These are never added to the client define block.
Object.assign(process.env, loadEnv(process.env["NODE_ENV"] ?? "development", rootDir, ""));

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Bolt's preview serves static files and expects an index.html. SPA mode
    // generates a static HTML shell at build time so the preview can serve it.
    spa: { enabled: true },
  },
  nitro: {
    output: {
      dir: "dist",
      serverDir: "dist/server",
      publicDir: "dist",
    },
  },
  vite: {
    plugins: [mcpPlugin()],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(rootDir, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(rootDir, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(rootDir, "node_modules/entities"),
      },
    },
  },
});
