import { useLang } from "@shared/ui/i18n";
import { IconAnalyze, IconPaste, IconResult } from "@shared/ui/icons";

import { Reveal } from "./Reveal";

const ICONS = [IconPaste, IconAnalyze, IconResult];
const TEXT = {
  en: {
    title: "How it works",
    lead: "Three steps, no sign-up, free.",
    steps: [
      ["Paste the link", "Press and hold the link in the message, choose “Copy” and paste it in the box above. You never need to tap it."],
      [
        "We check it",
        "We compare the address with known scam lists, see how long the site has existed and whether its name looks like the names of scam sites.",
      ],
      ["See the answer", "“Looks safe”, “Be careful” or “Dangerous”: with the reasons and what to do next."],
    ],
  },
  tr: {
    title: "Nasıl çalışır?",
    lead: "Üç adımda, üye olmadan ve ücretsiz.",
    steps: [
      ["Linki yapıştır", "Mesajdaki linke basılı tut, “Kopyala”yı seç ve yukarıdaki kutuya yapıştır. Linke tıklaman gerekmez."],
      [
        "Analiz edilir",
        "Adresi bilinen dolandırıcılık listeleriyle karşılaştırır, sitenin ne zamandır var olduğuna ve adının dolandırıcılık sitelerine benzeyip benzemediğine bakarız.",
      ],
      ["Sonucu gör", "“Güvenli görünüyor”, “Dikkatli ol” ya da “Tehlikeli”: nedenleriyle ve ne yapman gerektiğiyle birlikte."],
    ],
  },
};

export function HowItWorks() {
  const t = TEXT[useLang()];
  return (
    <section className="section" id="how-it-works" aria-labelledby="how-title">
      <div className="hg-container">
        <Reveal className="section__head">
          <h2 id="how-title">{t.title}</h2>
          <p>{t.lead}</p>
        </Reveal>
        <ol className="steps-grid">
          {t.steps.map(([title, text], i) => {
            const Icon = ICONS[i];
            return (
              <Reveal as="li" key={title} className="hg-card step-card" delay={i * 0.06}>
                <span className="step-card__number hg-gradient-text" aria-hidden="true">
                  0{i + 1}
                </span>
                <span className="hg-icon-tile">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
