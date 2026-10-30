import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";

import type { Tone } from "../content";
import { useContent } from "./i18n";

const R = 44;
const C = 2 * Math.PI * R;
const EASE = [0.22, 1, 0.36, 1] as const;

/** The score as a ring that fills once; with reduced motion it is drawn full at once. */
export function ScoreRing({ score, tone, delay = 0.25 }: { score: number; tone: Tone; delay?: number }) {
  const c = useContent();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? score : 0);
  const offset = C * (1 - score / 100);

  useEffect(() => {
    if (reduce) {
      setShown(score);
      return;
    }
    const controls = animate(0, score, { duration: 0.9, delay, ease: EASE, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [score, reduce, delay]);

  return (
    <div className={`hg-ring tone-${tone}`} role="img" aria-label={c.ui.score(score)}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="hg-ring__track" cx="50" cy="50" r={R} />
        <motion.circle
          className="hg-ring__value"
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={C}
          initial={{ strokeDashoffset: reduce ? offset : C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : delay, ease: EASE }}
        />
      </svg>
      <div className="hg-ring__label" aria-hidden="true">
        <span className="hg-ring__score">{shown}</span>
        <span className="hg-ring__max">/ 100</span>
      </div>
    </div>
  );
}
