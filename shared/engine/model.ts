/**
 * The stage 1 name model in the browser (backend/model.py): character 2-5 grams with
 * sublinear TF-IDF and L2 norm, seven extra features, and a logistic regression. The
 * weights are exported by tools/build_static.py; the result matches scikit-learn's.
 */

export interface ModelData {
  ngram_range: [number, number];
  ngrams: string[];
  idf: number[];
  coef: number[];
  extra: number[];
  intercept: number;
  threshold: number;
}

type Weight = { idf: number; coef: number };

export class NameModel {
  readonly threshold: number;
  private readonly weights = new Map<string, Weight>();

  constructor(private readonly data: ModelData) {
    this.threshold = data.threshold;
    data.ngrams.forEach((g, i) => this.weights.set(g, { idf: data.idf[i] ?? 0, coef: data.coef[i] ?? 0 }));
  }

  /** The probability that a name is a scam site's, from its text and its extra features. */
  probability(text: string, extra: number[]): number {
    const chars = Array.from(text.toLowerCase().replace(/\s\s+/g, " "));
    const [lo, hi] = this.data.ngram_range;
    const counts = new Map<Weight, number>();
    for (let n = lo; n <= Math.min(hi, chars.length); n++) {
      for (let i = 0; i + n <= chars.length; i++) {
        const w = this.weights.get(chars.slice(i, i + n).join(""));
        if (w) counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    let dot = 0;
    let norm = 0;
    for (const [w, tf] of counts) {
      const v = (1 + Math.log(tf)) * w.idf;
      dot += v * w.coef;
      norm += v * v;
    }
    let z = (norm > 0 ? dot / Math.sqrt(norm) : 0) + this.data.intercept;
    extra.forEach((x, i) => (z += x * (this.data.extra[i] ?? 0)));
    return 1 / (1 + Math.exp(-z));
  }
}

export function entropy(s: string): number {
  const chars = Array.from(s);
  const counts = new Map<string, number>();
  for (const ch of chars) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) h -= (c / chars.length) * Math.log2(c / chars.length);
  return h;
}
