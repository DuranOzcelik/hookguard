/**
 * The hash lists checked first: names USOM lists (blocklist) and official or very popular
 * domains (allowlist). They come with the extension, are refreshed every few hours from the
 * HookGuard site (or from your own API), kept in storage.local and held in memory as sets
 * while the background runs.
 */

import { browser } from "wxt/browser";

import { hashSet, type BlockList, type HashSet, type Lists } from "@shared/engine";
import { matchHashes } from "@shared/hookguard";

import { DATA_URL, bundled, download, refreshEngine } from "./data";
import { getApiBase } from "./settings";

export type ListKind = "blocklist" | "allowlist";
const KINDS: ListKind[] = ["blocklist", "allowlist"];

interface StoredList {
  version: string;
  hex_chars: number;
  hashes: string[];
  categories?: Record<string, string>;
}

export interface ListStatus {
  counts: Partial<Record<ListKind, number>>;
  checkedAt: number | null;
  error: string | null;
}

const memory: Partial<Record<ListKind, HashSet & { version: string }>> = {};

function remember(kind: ListKind, list: StoredList) {
  memory[kind] = { version: list.version, ...hashSet(list as BlockList) };
}

async function load(kind: ListKind) {
  if (!memory[kind]) {
    const stored = (await browser.storage.local.get(kind))[kind] as StoredList | undefined;
    const list = stored ?? (await bundled<StoredList>(`${kind}.json`));
    if (list) remember(kind, list);
  }
  return memory[kind];
}

export async function getLists(): Promise<Lists> {
  return { blocklist: (await load("blocklist")) ?? null, allowlist: (await load("allowlist")) ?? null };
}

/** The host or parent whose hash is on the list, or null. */
export async function matchList(kind: ListKind, host: string): Promise<string | null> {
  const list = await load(kind);
  return list ? matchHashes(host, list.hashes, list.hexChars) : null;
}

export async function refreshLists(): Promise<ListStatus> {
  const apiBase = await getApiBase();
  const errors: string[] = [];
  for (const kind of KINDS) {
    try {
      const current = await load(kind);
      const list = await download<StoredList>(apiBase ? `${apiBase}/api/${kind}` : `${DATA_URL}/${kind}.json`);
      if (list.version === current?.version) continue;
      const stored: StoredList = { version: list.version, hex_chars: list.hex_chars, hashes: list.hashes, categories: list.categories };
      await browser.storage.local.set({ [kind]: stored });
      remember(kind, stored);
    } catch (err) {
      errors.push(`${kind}: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (!apiBase) await refreshEngine().catch((err) => errors.push(`engine: ${err instanceof Error ? err.message : err}`));
  await browser.storage.local.set({ listsCheckedAt: Date.now(), listsError: errors.join("; ") || null });
  return listStatus();
}

export async function listStatus(): Promise<ListStatus> {
  const counts: ListStatus["counts"] = {};
  for (const kind of KINDS) {
    const list = await load(kind);
    if (list) counts[kind] = list.hashes.size;
  }
  const { listsCheckedAt, listsError } = await browser.storage.local.get(["listsCheckedAt", "listsError"]);
  return { counts, checkedAt: (listsCheckedAt as number) ?? null, error: (listsError as string) ?? null };
}
