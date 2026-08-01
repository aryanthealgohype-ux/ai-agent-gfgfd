// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import path from "node:path";

// Wrap mcpPlugin to resolve Windows path mismatch (forward vs backslashes)
function patchedMcpPlugin(options?: any) {
  const plugin = mcpPlugin(options);
  const originalConfigResolved = plugin.configResolved;
  if (originalConfigResolved) {
    plugin.configResolved = function (config: any) {
      const patchedConfig = new Proxy(config, {
        get(target, prop, receiver) {
          if (prop === "root") {
            // Normalize path to use OS-specific separators (backslashes on Windows)
            return path.resolve(target.root);
          }
          return Reflect.get(target, prop, receiver);
        },
      });
      return originalConfigResolved.call(this, patchedConfig);
    };
  }
  return plugin;
}

export default defineConfig({
  plugins: [patchedMcpPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

