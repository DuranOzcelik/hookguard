import { browser } from "wxt/browser";

import type { Category, Level, ReportCategory } from "@shared/hookguard";

import type { ListStatus } from "./lists";
import type { Settings } from "./settings";
import type { Stats } from "./stats";
import type { Verdict } from "./verdicts";

export interface Status {
  apiBase: string;
  apiError: string | null;
  lists: ListStatus;
  stats: Stats;
  settings: Omit<Settings, "family"> & { family: { enabled: boolean; blocked: Settings["family"]["blocked"]; hasPin: boolean } };
}

export type SettingsPatch = Partial<Omit<Settings, "family">> & {
  family?: Partial<Pick<Settings["family"], "enabled" | "blocked">>;
};
export type PageSignal = Pick<Category, "id" | "confidence" | "reasons">;
export type SensitiveKind = "password" | "card" | "tckn";

/** Every request to the background: [what is sent, what comes back]. */
export interface Api {
  verdict: [{ host: string; fresh?: boolean }, Verdict | null];
  proceed: [{ host: string }, null];
  status: [Record<string, never>, Status];
  "refresh-lists": [Record<string, never>, Status];
  "save-settings": [{ patch: SettingsPatch; pin?: string; newPin?: string }, { ok: boolean; status: Status }];
  report: [{ domain: string; category: ReportCategory; note: string }, { ok: boolean }];
  expand: [{ url: string }, { destination: string | null; verdict: Verdict | null }];
  badges: [{ hosts: string[] }, Record<string, Level | null>];
  "form-check": [{ host: string; kind: SensitiveKind }, { warn: boolean; verdict: Verdict | null }];
  "trust-site": [{ host: string }, null];
  "page-signal": [{ host: string; signal: PageSignal }, { verdict: Verdict | null }];
  leave: [Record<string, never>, null];
  "family-unlock": [{ host: string; pin: string }, { ok: boolean }];
  "download-action": [{ id: number; action: "cancel" | "resume" | "remove" }, { ok: boolean }];
}

export type Request = { [K in keyof Api]: { type: K } & Api[K][0] }[keyof Api];

export function ask<K extends keyof Api>(type: K, body: Api[K][0] = {} as Api[K][0]): Promise<Api[K][1]> {
  return browser.runtime.sendMessage({ type, ...body });
}

/** Pushed from the background to a tab's content script once a slow answer arrives. */
export interface ShowVerdict {
  type: "show";
  verdict: Verdict;
}
