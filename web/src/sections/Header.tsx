import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { PALETTE_NAMES, type Lang } from "@shared/content";
import { useLang } from "@shared/ui/i18n";
import { IconClose, IconExtension, IconMenu, IconMoon, IconPalette, IconSun, IconSystem } from "@shared/ui/icons";
import { Logo } from "@shared/ui/Logo";

import { href, route } from "../paths";
import { PALETTES, applyPalette, applyTheme, savedPalette, savedTheme, type Palette, type Theme } from "../prefs";

const TEXT = {
  en: {
    nav: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#extension", label: "Extension" },
      { href: "/short-links", label: "Short links" },
      { href: "/#scam-types", label: "Scam types" },
      { href: "/#faq", label: "FAQ" },
    ],
    cta: "Add the extension",
    menu: "Main menu",
    open: "Open menu",
    close: "Close menu",
    appearance: "Appearance",
    theme: "Theme",
    color: "Colour",
    themes: { system: "System", light: "Light", dark: "Dark" },
    language: "Language",
  },
  tr: {
    nav: [
      { href: "/#how-it-works", label: "Nasıl çalışır" },
      { href: "/#extension", label: "Eklenti" },
      { href: "/short-links", label: "Kısa linkler" },
      { href: "/#scam-types", label: "Dolandırıcılık türleri" },
      { href: "/#faq", label: "SSS" },
    ],
    cta: "Eklentiyi ekle",
    menu: "Ana menü",
    open: "Menüyü aç",
    close: "Menüyü kapat",
    appearance: "Görünüm",
    theme: "Tema",
    color: "Renk",
    themes: { system: "Sistem", light: "Açık", dark: "Koyu" },
    language: "Dil",
  },
};

const THEME_ICON: Record<Theme, typeof IconSun> = { system: IconSystem, light: IconSun, dark: IconMoon };

function LangSwitch({ onLang }: { onLang: (lang: Lang) => void }) {
  const lang = useLang();
  return (
    <div className="hg-segmented" role="group" aria-label={TEXT[lang].language}>
      {(["en", "tr"] as Lang[]).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => onLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Appearance() {
  const lang = useLang();
  const t = TEXT[lang];
  const names = PALETTE_NAMES[lang];
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [palette, setPalette] = useState<Palette>(savedPalette);
  return (
    <div className="appearance">
      <p className="appearance__label">{t.theme}</p>
      <div className="hg-segmented" role="radiogroup" aria-label={t.theme}>
        {(["system", "light", "dark"] as Theme[]).map((value) => {
          const Icon = THEME_ICON[value];
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                applyTheme(value);
              }}
            >
              <Icon aria-hidden="true" />
              {t.themes[value]}
            </button>
          );
        })}
      </div>
      <p className="appearance__label">{t.color}</p>
      <div className="hg-swatches" role="radiogroup" aria-label={t.color}>
        {PALETTES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            className="hg-swatch"
            data-palette-preview={value}
            aria-checked={palette === value}
            aria-label={names[value]}
            title={names[value]}
            onClick={() => {
              setPalette(value);
              applyPalette(value);
            }}
          >
            <span />
          </button>
        ))}
      </div>
      <p className="appearance__current">{names[palette]}</p>
    </div>
  );
}

/** A small popover for theme and colour; closes on Escape or a click outside. */
function AppearanceButton() {
  const t = TEXT[useLang()];
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);
  return (
    <div className="popover" ref={box}>
      <button
        type="button"
        className="hg-btn hg-btn--ghost hg-btn--icon"
        aria-expanded={open}
        aria-label={t.appearance}
        title={t.appearance}
        onClick={() => setOpen(!open)}
      >
        <IconPalette aria-hidden="true" />
      </button>
      {open && (
        <div className="popover__panel hg-glass" role="dialog" aria-label={t.appearance}>
          <Appearance />
        </div>
      )}
    </div>
  );
}

export function Header({ onLang }: { onLang: (lang: Lang) => void }) {
  const t = TEXT[useLang()];
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const here = route();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="hg-container site-header__inner">
        <Logo href={href("/")} />
        <nav className="site-nav" aria-label={t.menu}>
          {t.nav.map((n) => (
            <a key={n.href} href={href(n.href)} aria-current={n.href === here ? "page" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="site-header__actions">
          <div className="site-header__wide">
            <LangSwitch onLang={onLang} />
            <AppearanceButton />
          </div>
          <a className="hg-btn hg-btn--primary site-header__cta" href={href("/#install")}>
            <IconExtension aria-hidden="true" />
            {t.cta}
          </a>
          <button
            ref={button}
            type="button"
            className="hg-btn hg-btn--ghost hg-btn--icon menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.close : t.open}
            onClick={() => setOpen(!open)}
          >
            {open ? <IconClose aria-hidden="true" /> : <IconMenu aria-hidden="true" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id="mobile-menu"
            className="mobile-menu"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav className="hg-container mobile-menu__nav" aria-label={t.menu}>
              {t.nav.map((n) => (
                <a key={n.href} href={href(n.href)} onClick={() => setOpen(false)}>
                  {n.label}
                </a>
              ))}
              <a className="hg-btn hg-btn--primary hg-btn--block" href={href("/#install")} onClick={() => setOpen(false)}>
                <IconExtension aria-hidden="true" />
                {t.cta}
              </a>
              <div className="mobile-menu__prefs">
                <p className="appearance__label">{t.language}</p>
                <LangSwitch onLang={onLang} />
                <Appearance />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
