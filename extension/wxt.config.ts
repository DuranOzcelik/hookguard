import { fileURLToPath } from "node:url";

import Icons from "unplugin-icons/vite";
import { defineConfig } from "wxt";

// Manifest V3 for every browser: Chrome and Edge run the background as a service worker,
// Firefox as an event page. The API address defaults to a local server (see utils/settings.ts).
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) },
  vite: () => ({ plugins: [Icons({ compiler: "jsx", jsx: "react", scale: 1 })] }),
  manifest: ({ browser }) => ({
    name: "HookGuard",
    description: "Dolandırıcılık sitelerini açılmadan durdurur. Sunucuya yalnızca alan adı gönderir, tam adresi değil.",
    // webRequest only observes (redirects, short links); downloads pauses risky files; notifications for the weekly summary.
    permissions: ["storage", "webNavigation", "webRequest", "alarms", "downloads", "notifications"],
    host_permissions: ["http://*/*", "https://*/*"],
    action: { default_title: "HookGuard" },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "hookguard@hookguard",
          strict_min_version: "140.0",
          // Visited domain names are sent to the HookGuard API for checking.
          data_collection_permissions: { required: ["browsingActivity"] },
        },
      },
    }),
  }),
});
