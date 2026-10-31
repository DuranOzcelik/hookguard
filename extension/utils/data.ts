/**
 * The data for checks on this device (tools/build_static.py): the engine (name model,
 * hints, official domains) and the two hash lists. A copy ships inside the extension, so
 * it works from the first second; newer ones come from the HookGuard site, or from your
 * own API if one is set, and are kept in storage.local.
 */

import { browser, type PublicPath } from "wxt/browser";

import { Engine, type EngineData } from "@shared/engine";

/** Where the site publishes the data; WXT_LISTS_URL points a build elsewhere. */
export const DATA_URL: string = import.meta.env.WXT_LISTS_URL ?? "https://duranozcelik.github.io/hookguard/data";

/** A file of the copy inside the extension, or null if this build has none. */
export async function bundled<T>(name: string): Promise<T | null> {
  try {
    const response = await fetch(browser.runtime.getURL(`/data/${name}` as PublicPath));
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** A newer file from the site (or the API), revalidated with the browser's cache. */
export async function download<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-cache", credentials: "omit" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

let engine: Engine | null = null;

export async function getEngine(): Promise<Engine> {
  if (!engine) {
    const stored = (await browser.storage.local.get("engine")).engine as EngineData | undefined;
    const data = stored ?? (await bundled<EngineData>("engine.json"));
    if (!data) throw new Error("No check data in this build");
    engine = new Engine(data);
  }
  return engine;
}

/** Fetches the engine from the site when it has changed. */
export async function refreshEngine(): Promise<void> {
  const data = await download<EngineData>(`${DATA_URL}/engine.json`);
  const current = engine ?? (await getEngine().catch(() => null));
  if (current?.data.version === data.version) return;
  await browser.storage.local.set({ engine: data });
  engine = new Engine(data);
}
