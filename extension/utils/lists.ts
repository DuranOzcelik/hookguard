/**
 * The hash lists checked before anything is sent to the API: names USOM lists
 * (blocklist) and official or very popular domains (allowlist). They are kept in
 * storage.local, refreshed every few hours with If-None-Match, and held in memory
 * as sets while the background runs.
 */

import { browser } from "wxt/browser";

import { matchHashes, type HashList } from "@shared/hookguard";

import { getApiBase } from "./settings";

export type ListKind = "blocklist" | "allowlist";
const KINDS: ListKind[] = ["blocklist", "allowlist"];

interface StoredList {
  version: string;
  hex_chars: number;
  hashes: string[];
}

export interface ListStatus {
  counts: Partial<Record<ListKind, number>>;
  checkedAt: number | null;
  error: string | null;
}

const memory: Partial<Record<ListKind, { version: string; hexChars: number; hashes: Set<string> }>> = {};

async function load(kind: ListKind) {
  if (!memory[kind]) {
    const stored = (await browser.storage.local.get(kind))[kind] as StoredList | undefined;
    if (stored) memory[kind] = { version: stored.version, hexChars: stored.hex_chars, hashes: new Set(stored.hashes) };
  }
  return memory[kind];
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
      const response = await fetch(`${apiBase}/api/${kind}`, {
        headers: current ? { "If-None-Match": `"${current.version}"` } : {},
        cache: "no-store",
      });
      if (response.status === 304) continue;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const list: HashList = await response.json();
      const stored: StoredList = { version: list.version, hex_chars: list.hex_chars, hashes: list.hashes };
      await browser.storage.local.set({ [kind]: stored });
      memory[kind] = { version: list.version, hexChars: list.hex_chars, hashes: new Set(list.hashes) };
    } catch (err) {
      errors.push(`${kind}: ${err instanceof Error ? err.message : err}`);
    }
  }
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
