/**
 * On the HookGuard web page only (SITE_ORIGINS): answers its questions through
 * window.postMessage (shared/bridge.ts), so that the page can show where a short link
 * leads. The background reads the shortener's redirect; the destination is not opened.
 */

import { browser } from "wxt/browser";

import { FROM_EXTENSION, FROM_PAGE, SITE_ORIGINS, type BridgeReply, type BridgeRequest } from "@shared/bridge";
import { ask } from "@/utils/messages";

function reply(id: string | null, message: BridgeReply) {
  window.postMessage({ source: FROM_EXTENSION, id, ...message }, location.origin);
}

export function answerSite(signal: AbortSignal): void {
  if (!SITE_ORIGINS.includes(location.origin)) return;
  const version = browser.runtime.getManifest().version;
  window.addEventListener(
    "message",
    async (e: MessageEvent) => {
      const data = e.data as (BridgeRequest & { source?: unknown; id?: unknown }) | null;
      if (e.source !== window || e.origin !== location.origin || data?.source !== FROM_PAGE || typeof data.id !== "string") return;
      if (data.type === "hello") reply(data.id, { type: "hello", version });
      else if (data.type === "expand" && typeof data.url === "string")
        reply(data.id, { type: "expand", destination: (await ask("expand", { url: data.url })).destination });
    },
    { signal },
  );
  reply(null, { type: "ready", version }); // for a page that asked before this script loaded
}
