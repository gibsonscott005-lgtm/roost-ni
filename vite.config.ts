// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { resolvePublicCloudDefines } from "./public-build-env";

// Vite bundles configuration into a temporary directory; import.meta.url is
// therefore not a reliable project root in production or managed previews.
const rootDir = process.cwd();

// Load non-VITE_ env vars into process.env for server-side code only.
// These are never added to the client define block.
export default (env: { command: "build" | "serve"; mode: string }) => {
  const loadedEnv = loadEnv(env.mode, rootDir, "");
  // Hosting-provided values take precedence over local files.
  for (const [key, value] of Object.entries(loadedEnv)) {
    process.env[key] ??= value;
  }
  return defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    envDir: rootDir,
    // Explicit allowlist: no private credentials enter the browser bundle.
    // Production publishes may lack env files; fall back to the project's
    // public (non-secret) Cloud URL and publishable key so the browser can connect.
    define: resolvePublicCloudDefines(
      env.command === "build" && env.mode === "production"
        ? {
            VITE_SUPABASE_URL: "https://vstujbraaeagtreohyvq.supabase.co",
            VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_LjlYlhNWjxwR-LzcwaAUiA_G0CeDL7v",
            // PostHog project token is a public ingest-only key; publish builds
            // may lack connector env vars, so fall back to the literal token.
            POSTHOG_API_KEY: "phc_vJpusDtntbMoMtfXU9osxJiZLfxJGmGPooPJrFvTJFYM",
            ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)),
          }
        : process.env,
    ),
    plugins: [mcpPlugin()],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(rootDir, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(rootDir, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(rootDir, "node_modules/entities"),
      },
    },
  },
  })(env);
};
