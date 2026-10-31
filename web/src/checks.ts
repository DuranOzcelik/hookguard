/**
 * Where the web page checks a link.
 *
 * By default (GitHub Pages) on the device: shared/engine with the data files in
 * public/data, which tools/build_static.py writes; nothing is sent anywhere. With
 * VITE_API_BASE set (even to "", for the dev proxy) the page uses a HookGuard API
 * instead, which adds DNS and registration dates, the safe shortener and reports.
 */

import type { Lang } from "@shared/content";
import { deviceChecker } from "@shared/engine";
import {
  checkDomain,
  expandLink,
  reportOnGitHub,
  reportSite,
  type CheckResult,
  type ReportCategory,
} from "@shared/hookguard";

import { expandWithExtension } from "./extension";

export const API_BASE: string | undefined = import.meta.env.VITE_API_BASE;
export const ON_DEVICE = API_BASE === undefined;

const onDevice = deviceChecker(`${import.meta.env.BASE_URL}data/`);

export function checkHost(host: string, lang: Lang, signal?: AbortSignal): Promise<CheckResult> {
  return API_BASE === undefined ? onDevice(host, lang) : checkDomain(API_BASE, host, { lang, signal });
}

/** Where a short link leads: the API reads the redirect, or else the extension does, if it is installed. */
export async function expandShortLink(url: string): Promise<string | null> {
  if (API_BASE !== undefined) return (await expandLink(API_BASE, url)).destination;
  return expandWithExtension(url);
}

/** A report goes to the API's review queue, or else opens a pre-filled GitHub issue. */
export async function report(domain: string, category: ReportCategory, note: string): Promise<void> {
  if (API_BASE !== undefined) await reportSite(API_BASE, { domain, category, note, source: "web" });
  else window.open(reportOnGitHub(domain, category, note), "_blank", "noopener");
}
