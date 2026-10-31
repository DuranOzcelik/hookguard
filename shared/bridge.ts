/**
 * The HookGuard web page and the extension talk through window.postMessage: the page asks,
 * the extension's content script answers, and only on the page's own origins. This lets
 * the page on GitHub Pages show where a short link leads, which a web page alone cannot
 * read without opening the link.
 */

export const FROM_PAGE = "hookguard-page";
export const FROM_EXTENSION = "hookguard-extension";

/** Where the HookGuard web page runs: GitHub Pages, and the dev and preview servers. */
export const SITE_ORIGINS = [
  "https://duranozcelik.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

export type BridgeRequest = { type: "hello" } | { type: "expand"; url: string };
export type BridgeReply =
  | { type: "hello"; version: string }
  | { type: "ready"; version: string } // sent unasked when the extension's script starts on the page
  | { type: "expand"; destination: string | null };
