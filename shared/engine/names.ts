/**
 * Name helpers of the on-device check, ported from backend/hints.py and backend/domains.py.
 * The word lists come from engine.json (tools/build_static.py), so only the logic lives here.
 */

/** [name, words] pairs: BRAND_HINTS or LURE_HINTS. */
export type WordTable = [string, string[]][];

const LETTER = /\p{L}/u;

function wordHit(word: string, flat: string, tokens: Set<string>): boolean {
  // Short words ("ptt", "ups", "aras") also appear inside other words ("paras", "groups"),
  // so they only match as a separate token.
  if (/\d/.test(word)) {
    // Numbers and homoglyphs ("101", "a1o1") must start a token and be followed by a letter or nothing.
    for (const t of tokens) {
      if (t.startsWith(word) && (t.length === word.length || LETTER.test(t.charAt(word.length)))) return true;
    }
    return false;
  }
  if (word.length <= 4) return tokens.has(word);
  return flat.includes(word);
}

/** The names in the table whose words appear in the entry, in table order. */
export function hints(entry: string, table: WordTable): string[] {
  const slash = entry.indexOf("/");
  const host = slash < 0 ? entry : entry.slice(0, slash);
  const flat = host.replaceAll(".", "-");
  const tokens = new Set(host.split(/[-._]/));
  return table.filter(([, words]) => words.some((w) => wordHit(w, flat, tokens))).map(([name]) => name);
}

/** The part of a name its owner picked: "cloud-dario.duckdns.org" -> "cloud-dario". */
export function chosenPart(domain: string, platforms: Set<string>): string {
  const labels = domain.split(".");
  for (let i = 1; i < labels.length - 1; i++) {
    if (platforms.has(labels.slice(i).join("."))) return labels.slice(0, i).join(".");
  }
  return domain;
}

/** "giris.akbank.com.tr" -> "akbank.com.tr". */
export function registeredDomain(host: string, secondLevel: Set<string>): string {
  const labels = host.split(".");
  const n = labels.length >= 3 && secondLevel.has(labels.slice(-2).join(".")) ? 3 : 2;
  return labels.slice(-n).join(".");
}

/** Python's round(): halves go to the even neighbour. */
export function pyRound(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : r;
}
