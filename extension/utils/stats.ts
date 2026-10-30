/** Weekly counters for the summary notification and the popup; kept on this device only. */

import { browser } from "wxt/browser";

export interface Stats {
  since: number;
  checked: number;
  warned: number;
  blocked: number;
  forms: number;
  downloads: number;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;
const empty = (): Stats => ({ since: Date.now(), checked: 0, warned: 0, blocked: 0, forms: 0, downloads: 0 });

export async function getStats(): Promise<Stats> {
  const { stats } = await browser.storage.local.get("stats");
  return (stats as Stats) ?? empty();
}

export async function count(field: Exclude<keyof Stats, "since">): Promise<void> {
  const stats = await getStats();
  stats[field] += 1;
  await browser.storage.local.set({ stats });
}

/** The finished week's numbers, or null while the week is still running. Starts a new week. */
export async function closeWeek(): Promise<Stats | null> {
  const stats = await getStats();
  if (Date.now() - stats.since < WEEK) return null;
  await browser.storage.local.set({ stats: empty() });
  return stats;
}
