/**
 * The on-device check against the API's: cases scored by the Python code
 * (python -m tools.build_static --parity build/parity.json) must come out the same here.
 * Skipped when the data has not been built (it needs the trained model).
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { Engine, hashSet, type BlockList, type EngineData } from "@shared/engine";
import type { CheckResult } from "@shared/hookguard";

const file = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const DATA = file("../public/data/");
const PARITY = process.env.PARITY ?? file("../../build/parity.json");
const ready = existsSync(`${DATA}engine.json`) && existsSync(PARITY);

interface Case {
  host: string;
  lang: "en" | "tr";
  score: number;
  level: string;
  model_score: number | null;
  reasons: CheckResult["reasons"];
  category: CheckResult["category"];
}

const read = <T,>(name: string): T => JSON.parse(readFileSync(name, "utf-8"));

// The describe body runs even when skipped, so the files are read inside the test.
describe.skipIf(!ready)("on-device check", () => {
  it("scores like the API", async () => {
    const engine = new Engine(read<EngineData>(`${DATA}engine.json`));
    const lists = {
      blocklist: hashSet(read<BlockList>(`${DATA}blocklist.json`)),
      allowlist: hashSet(read<BlockList>(`${DATA}allowlist.json`)),
    };
    const cases = read<Case[]>(PARITY);
    expect(cases.length).toBeGreaterThan(100);
    const mismatches: string[] = [];
    for (const c of cases) {
      const r = await engine.check(c.host, lists, c.lang);
      // The exported weights are rounded to 6 digits, so allow a point where the model's share sits on a boundary.
      const close = Math.abs(r.score - c.score) <= 1 && r.level === c.level;
      const same =
        close &&
        Math.abs((r.details.model_score ?? 0) - (c.model_score ?? 0)) < 1e-3 &&
        JSON.stringify(r.reasons.map((x) => [x.code, x.severity, x.text])) ===
          JSON.stringify(c.reasons.map((x) => [x.code, x.severity, x.text])) &&
        JSON.stringify(r.category) === JSON.stringify(c.category);
      if (!same) mismatches.push(`${c.host} (${c.lang}): ${JSON.stringify({ ts: r.score, py: c.score, ts_r: r.reasons.map((x) => x.code), py_r: c.reasons.map((x) => x.code), ts_m: r.details.model_score, py_m: c.model_score, ts_c: r.category?.id, py_c: c.category?.id })}`);
    }
    expect(mismatches).toEqual([]);
  });
});
