import { useId } from "react";

import { useContent } from "./i18n";

/** The shield with a hook, filled with the palette's gradient. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--brand)" }} />
          <stop offset="1" style={{ stopColor: "var(--brand-2)" }} />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7z" />
      <path className="hg-logo__hook" d="M17 9v9a3 3 0 1 1-6 0" />
    </svg>
  );
}

export function Logo({ href }: { href?: string }) {
  const c = useContent();
  const content = (
    <>
      <LogoMark />
      <span>HookGuard</span>
    </>
  );
  return href ? (
    <a className="hg-logo" href={href} aria-label={c.ui.home}>
      {content}
    </a>
  ) : (
    <span className="hg-logo">{content}</span>
  );
}
