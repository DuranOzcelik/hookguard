/** Theme, colour palette and language, kept in this browser only. */

import { DEFAULT_LANG, PALETTES, isLang, type Lang, type Palette } from "@shared/content";

export { PALETTES, type Palette };
export type Theme = "system" | "light" | "dark";

function read(key: string): string | null {
  try {
    return localStorage.getItem(`hookguard-${key}`);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(`hookguard-${key}`, value);
  } catch {
    // private mode: the choice lasts for this visit only
  }
}

export function savedTheme(): Theme {
  const value = read("theme");
  return value === "light" || value === "dark" ? value : "system";
}

export function savedPalette(): Palette {
  const value = read("palette");
  return PALETTES.includes(value as Palette) ? (value as Palette) : "aurora";
}

export function savedLang(): Lang {
  const value = read("lang");
  return isLang(value) ? value : DEFAULT_LANG;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.dataset.theme = theme;
  write("theme", theme);
}

export function applyPalette(palette: Palette): void {
  const root = document.documentElement;
  if (palette === "aurora") root.removeAttribute("data-palette");
  else root.dataset.palette = palette;
  write("palette", palette);
}

export function applyLang(lang: Lang): void {
  document.documentElement.lang = lang;
  write("lang", lang);
}
