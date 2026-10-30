import type { ReactNode, Ref } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

import { STATUS_TONE, detailRows, displayLevel, whatsappLink } from "../content";
import type { Category, CheckResult, Level, Reason, Severity } from "../hookguard";
import { useContent } from "./i18n";
import {
  IconCaution,
  IconChevron,
  IconDanger,
  IconKey,
  IconPhone,
  IconReasonDanger,
  IconReasonInfo,
  IconReasonSafe,
  IconReasonWarning,
  IconSafe,
  IconShare,
} from "./icons";
import { ScoreRing } from "./ScoreRing";

/** What both the API result (web) and the extension's verdict provide. */
export interface ResultModel {
  domain: string;
  level: Level;
  score: number;
  reasons: Reason[];
  category: Category | null;
  details?: CheckResult["details"];
  checked_utc?: string;
}

export const STATUS_ICON = { low: IconSafe, medium: IconCaution, high: IconDanger };
const REASON_ICON: Record<Severity, typeof IconSafe> = {
  danger: IconReasonDanger,
  warning: IconReasonWarning,
  safe: IconReasonSafe,
  info: IconReasonInfo,
};
const REASON_TONE: Record<Severity, string> = { danger: "danger", warning: "caution", safe: "safe", info: "info" };

const EASE = [0.22, 1, 0.36, 1] as const;
const container: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE, staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item: Variants = { hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } } };

export function ReasonList({ reasons }: { reasons: Reason[] }) {
  return (
    <ul className="hg-reasons">
      {reasons.map((r) => {
        const Icon = REASON_ICON[r.severity];
        return (
          <li key={r.code + r.text} className={`tone-${REASON_TONE[r.severity]}`}>
            <Icon aria-hidden="true" />
            <span>{r.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function StatusBand({
  result,
  level,
  titleRef,
  as: Heading = "h2",
}: {
  result: ResultModel;
  level: Level;
  titleRef?: Ref<HTMLHeadingElement>;
  as?: "h1" | "h2";
}) {
  const c = useContent();
  const tone = STATUS_TONE[level];
  const Icon = STATUS_ICON[level];
  const raised = level !== result.level; // a category raised the level; the score no longer describes it
  const meaning = result.category && raised ? c.categoryMeaning[result.category.id] : c.status[level].meaning;
  return (
    <div className={`hg-status tone-${tone}`}>
      <Icon className="hg-status__icon" aria-hidden="true" />
      <Heading className="hg-status__title" ref={titleRef} tabIndex={-1}>
        {c.status[level].title}
      </Heading>
      <p className="hg-status__domain">{result.domain}</p>
      <p className="hg-status__meaning">{meaning}</p>
      {!raised && (
        <div className="hg-status__ring">
          <ScoreRing score={result.score} tone={tone} />
        </div>
      )}
    </div>
  );
}

export function CategoryCallout({ category }: { category: Category }) {
  const notice = useContent().categoryNotice[category.id];
  const Icon = notice.tone === "info" ? IconReasonInfo : notice.tone === "danger" ? IconDanger : IconCaution;
  return (
    <div className={`hg-callout tone-${notice.tone}`}>
      <h3 className="hg-callout__title">
        <Icon aria-hidden="true" />
        {notice.title}
      </h3>
      <p>{notice.body}</p>
      {notice.more && (
        <p>
          <a href={notice.more.href} target="_blank" rel="noreferrer">
            {notice.more.label}
          </a>
        </p>
      )}
      {notice.support && (
        <div className="hg-callout tone-brand hg-support">
          <p className="hg-callout__title">
            <IconPhone aria-hidden="true" />
            {notice.support.title}
          </p>
          <p>{notice.support.text}</p>
          <div className="hg-actions">
            <a className="hg-btn hg-btn--primary" href={notice.support.href}>
              <IconPhone aria-hidden="true" />
              {notice.support.label}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function AfterClick() {
  const { afterClick } = useContent();
  return (
    <div className="hg-callout tone-danger">
      <h3 className="hg-callout__title">
        <IconKey aria-hidden="true" />
        {afterClick.title}
      </h3>
      <ol className="hg-steps">
        {afterClick.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

export function ShareButton({ domain, level }: { domain: string; level: Level }) {
  const c = useContent();
  return (
    <a className="hg-btn hg-btn--secondary" href={whatsappLink(c, domain, level)} target="_blank" rel="noreferrer">
      <IconShare aria-hidden="true" />
      {c.share.label}
    </a>
  );
}

export function Details({ result }: { result: Required<Pick<ResultModel, "details" | "checked_utc">> }) {
  const c = useContent();
  return (
    <details className="hg-disclosure">
      <summary>
        {c.ui.details}
        <IconChevron aria-hidden="true" />
      </summary>
      <dl className="hg-facts hg-disclosure__body">
        {detailRows(c, result).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/**
 * The result card (MASTER.md §7): status band, category notice, why, what to do, what to do
 * if you already clicked, warn the sender, details. `lead` and `actions` add app buttons.
 */
export function ResultView({
  result,
  lead,
  actions,
  titleRef,
  heading = "h2",
  showDetails = true,
}: {
  result: ResultModel;
  lead?: ReactNode; // the main way out (warning page), placed before sharing
  actions?: ReactNode;
  titleRef?: Ref<HTMLHeadingElement>;
  heading?: "h1" | "h2";
  showDetails?: boolean;
}) {
  const c = useContent();
  const reduce = useReducedMotion();
  const level = displayLevel(result.level, result.category);
  const tone = STATUS_TONE[level];
  const steps = (result.category && c.categorySteps[result.category.id]) || c.whatToDo[level];
  const categoryReasons: Reason[] = (result.category?.reasons ?? []).map((text) => ({
    code: `category-${text}`,
    points: 0,
    severity: level === "high" ? "danger" : "warning",
    text,
  }));
  const details = result.details && result.checked_utc ? { details: result.details, checked_utc: result.checked_utc } : null;

  return (
    <motion.section className="hg-result" aria-live="polite" variants={container} initial={reduce ? false : "hidden"} animate="shown">
      <motion.div variants={item}>
        <StatusBand result={result} level={level} titleRef={titleRef} as={heading} />
      </motion.div>
      <div className="hg-result__body">
        {result.category && (
          <motion.div variants={item}>
            <CategoryCallout category={result.category} />
          </motion.div>
        )}
        <motion.div variants={item}>
          <h3 className="hg-subtitle">{c.ui.why}</h3>
          <ReasonList reasons={[...categoryReasons, ...result.reasons]} />
        </motion.div>
        <motion.div variants={item} className={`tone-${tone}`}>
          <h3 className="hg-subtitle">{c.ui.whatToDo}</h3>
          <ol className="hg-steps">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </motion.div>
        {level === "high" && result.category?.id !== "adult" && (
          <motion.div variants={item}>
            <AfterClick />
          </motion.div>
        )}
        {(level !== "low" || actions || lead) && (
          <motion.div variants={item} className="hg-actions">
            {lead}
            {level !== "low" && <ShareButton domain={result.domain} level={level} />}
            {actions}
          </motion.div>
        )}
        {showDetails && details && (
          <motion.div variants={item}>
            <Details result={details} />
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
