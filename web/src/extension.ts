/** Asking the HookGuard extension, if it is installed, through shared/bridge.ts. */

import { FROM_EXTENSION, FROM_PAGE, type BridgeReply, type BridgeRequest } from "@shared/bridge";

function ask<T extends BridgeReply>(request: BridgeRequest, timeout: number): Promise<T | null> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const done = (reply: T | null) => {
      clearTimeout(timer);
      removeEventListener("message", onMessage);
      resolve(reply);
    };
    const timer = setTimeout(() => done(null), timeout);
    function onMessage(e: MessageEvent) {
      if (e.source === window && e.data?.source === FROM_EXTENSION && e.data.id === id) done(e.data as T);
    }
    addEventListener("message", onMessage);
    window.postMessage({ source: FROM_PAGE, id, ...request }, location.origin);
  });
}

let installed = false;
addEventListener("message", (e: MessageEvent) => {
  if (e.source === window && e.data?.source === FROM_EXTENSION && e.data.type === "ready") installed = true;
});

/** Whether the extension answers on this page. A "no" is asked again next time: its script may load later. */
export async function extensionInstalled(): Promise<boolean> {
  installed ||= Boolean(await ask({ type: "hello" }, 600));
  return installed;
}

/** Where a short link leads, read by the extension; null if it is not installed or could not tell. */
export async function expandWithExtension(url: string): Promise<string | null> {
  if (!(await extensionInstalled())) return null;
  const reply = await ask<Extract<BridgeReply, { type: "expand" }>>({ type: "expand", url }, 10_000);
  return reply?.destination ?? null;
}
