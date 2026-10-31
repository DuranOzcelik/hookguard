/**
 * Settings, kept in storage.local. Every protection can be switched off except the
 * known-threat block. Family mode locks chosen categories behind a PIN; the PIN is stored
 * only as a salted PBKDF2 hash, and while family mode is on every settings change needs it.
 */

import { browser } from "wxt/browser";

import { DEFAULT_LANG, type Lang, type Palette } from "@shared/content";

export type FamilyCategory = "gambling" | "adult";

export interface Settings {
  /** Your own HookGuard API; empty: check on this device. */
  apiBase: string;
  lang: Lang;
  palette: Palette;
  formProtection: boolean;
  downloadWarning: boolean;
  shortLinkPreview: boolean;
  linkBadges: boolean;
  techSupport: boolean;
  categoryProtection: boolean;
  weeklySummary: boolean;
  family: { enabled: boolean; blocked: FamilyCategory[]; pinHash: string | null; salt: string | null };
}

export const DEFAULT_API_BASE: string = import.meta.env.WXT_API_BASE ?? "";

export const DEFAULTS: Settings = {
  apiBase: DEFAULT_API_BASE,
  lang: DEFAULT_LANG,
  palette: "aurora",
  formProtection: true,
  downloadWarning: true,
  shortLinkPreview: true,
  linkBadges: true,
  techSupport: true,
  categoryProtection: true,
  weeklySummary: true,
  family: { enabled: false, blocked: ["gambling", "adult"], pinHash: null, salt: null },
};

export async function getSettings(): Promise<Settings> {
  const { settings } = await browser.storage.local.get("settings");
  const saved = (settings ?? {}) as Partial<Settings>;
  return { ...DEFAULTS, ...saved, family: { ...DEFAULTS.family, ...saved.family } };
}

export async function getApiBase(): Promise<string> {
  return (await getSettings()).apiBase;
}

/** An http(s) origin, empty for checks on this device, or else the default. */
export function cleanApiBase(value: string): string {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // fall through
  }
  return DEFAULT_API_BASE;
}

export async function writeSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
}

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 150_000 },
    key,
    256,
  );
  return toHex(bits);
}

export function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function pinMatches(settings: Settings, pin: string | undefined): Promise<boolean> {
  const { pinHash, salt } = settings.family;
  if (!pinHash || !salt || !pin) return false;
  return (await hashPin(pin, salt)) === pinHash;
}
