import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

// In development the API runs separately (uvicorn backend.app:app --port 8000) and /api is proxied to it.
// For a build served elsewhere, set VITE_API_BASE to the API's address.
export default defineConfig({
  plugins: [react(), Icons({ compiler: "jsx", jsx: "react", scale: 1 })],
  resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
