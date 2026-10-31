import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import Icons from "unplugin-icons/vite";
import { defineConfig, type Plugin } from "vite";

// Checks run on the device with the files in public/data (python -m tools.build_static).
// With an API instead: npm run dev:api (VITE_API_BASE="" and /api proxied to uvicorn on port 8000),
// or VITE_API_BASE=https://your-api.example for a build. VITE_BASE is the path the site is served
// under, "/hookguard/" on GitHub Pages.

/** Static hosts have no fallback to index.html, so the /short-links page gets its own copy. */
function pageCopies(): Plugin {
  let outDir = "dist";
  return {
    name: "hookguard-page-copies",
    apply: "build",
    configResolved: (config) => void (outDir = config.build.outDir),
    closeBundle() {
      mkdirSync(`${outDir}/short-links`, { recursive: true });
      copyFileSync(`${outDir}/index.html`, `${outDir}/short-links/index.html`);
      copyFileSync(`${outDir}/index.html`, `${outDir}/404.html`);
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), Icons({ compiler: "jsx", jsx: "react", scale: 1 }), pageCopies()],
  resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
