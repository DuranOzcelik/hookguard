import { useId, useState, type FormEvent } from "react";

import type { ReportCategory } from "../hookguard";
import { useContent } from "./i18n";
import { IconFlag, IconReasonDanger, IconReasonSafe } from "./icons";

type State = "idle" | "sending" | "done" | "error";

/** "Report a suspicious site": a category, an optional note, nothing about the person reporting. */
export function ReportForm({
  domain,
  initial = "phishing",
  onSubmit,
}: {
  domain: string;
  initial?: ReportCategory;
  onSubmit: (category: ReportCategory, note: string) => Promise<unknown>;
}) {
  const c = useContent();
  const t = c.report;
  const id = useId();
  const [category, setCategory] = useState<ReportCategory>(initial);
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await onSubmit(category, note);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="hg-note tone-safe" role="status">
        <IconReasonSafe aria-hidden="true" />
        {t.done}
      </p>
    );
  }

  return (
    <form className="hg-report" onSubmit={submit}>
      <p>
        {t.domain} <strong className="mono">{domain}</strong>
      </p>
      <div>
        <label className="hg-label" htmlFor={`${id}-cat`}>
          {t.kind}
        </label>
        <select id={`${id}-cat`} className="hg-input" value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
          {c.reportOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="hg-label" htmlFor={`${id}-note`}>
          {t.note}
        </label>
        <textarea
          id={`${id}-note`}
          className="hg-input"
          rows={3}
          maxLength={280}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="hg-note">
          {t.noteHint}
        </p>
      </div>
      {state === "error" && (
        <p className="hg-error" role="alert">
          <IconReasonDanger aria-hidden="true" />
          {t.failed}
        </p>
      )}
      <div className="hg-actions">
        <button className="hg-btn hg-btn--primary" type="submit" disabled={state === "sending"}>
          <IconFlag aria-hidden="true" />
          {state === "sending" ? t.sending : t.submit}
        </button>
      </div>
    </form>
  );
}
