import { useEffect, useState } from "react";

import type { Lang } from "@shared/content";
import { LangProvider } from "@shared/ui/i18n";

import { ON_DEVICE } from "./checks";
import { route } from "./paths";
import { applyLang, savedLang } from "./prefs";
import { Checker } from "./sections/Checker";
import { ExtensionSection } from "./sections/ExtensionSection";
import { Faq } from "./sections/Faq";
import { Footer } from "./sections/Footer";
import { Header } from "./sections/Header";
import { HowItWorks } from "./sections/HowItWorks";
import { ScamTypes } from "./sections/ScamTypes";
import { ShortLinks } from "./sections/ShortLinks";
import { ShortPreview } from "./sections/ShortPreview";

const TITLE: Record<Lang, string> = {
  en: "HookGuard: check a link before you click",
  tr: "HookGuard: tıklamadan önce linki kontrol et",
};
const SKIP: Record<Lang, string> = { en: "Skip to content", tr: "İçeriğe geç" };

/** Three pages, chosen by path: the checker, /short-links, and /s/CODE (a short link's preview, with an API only). */
function Page() {
  const path = route();
  const code = path.match(/^\/s\/([A-Za-z0-9]{7})$/)?.[1];
  if (code && !ON_DEVICE) return <ShortPreview code={code} />;
  if (path === "/short-links") return <ShortLinks />;
  return (
    <>
      <Checker />
      <HowItWorks />
      <ExtensionSection />
      <ScamTypes />
      <Faq />
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(savedLang);
  useEffect(() => {
    applyLang(lang);
    document.title = TITLE[lang];
  }, [lang]);

  return (
    <LangProvider value={lang}>
      <a className="skip-link" href="#main">
        {SKIP[lang]}
      </a>
      <Header onLang={setLang} />
      <main id="main">
        <Page />
      </main>
      <Footer />
    </LangProvider>
  );
}
