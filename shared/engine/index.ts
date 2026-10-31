/**
 * HookGuard on the device: the API's score (backend/scoring.py) and category guess
 * (backend/categories.py) computed in the browser, so that nothing is sent anywhere.
 *
 * It sees what the name and the lists show: the known-threat list, official and popular
 * domains, shared hosts, the brand and lure words and the name model. It cannot look up DNS
 * or registration dates, so it never gives the age reasons; popular means the allowlist
 * (the top 10,000), not the API's top 100,000. Otherwise a result is the API's, reason for
 * reason; web/src/engine.parity.test.ts checks that against cases scored in Python.
 */

import type { Lang } from "../content";
import { hostHash, hostParents, isIp, type Category, type CheckResult, type HashList, type Reason } from "../hookguard";
import { NameModel, entropy, type ModelData } from "./model";
import { chosenPart, hints, pyRound, registeredDomain, type WordTable } from "./names";
import {
  CATEGORY_LABELS,
  CATEGORY_REASONS,
  LIST_CATEGORIES,
  OTHER_LIST_CATEGORY,
  REASONS,
  type CategoryId,
  type CategoryReason,
  type ReasonCode,
} from "./text";

const HIGH = 70;
const MEDIUM = 40;
const ORDER = { danger: 0, warning: 1, safe: 2, info: 3 };

/** engine.json, written by tools/build_static.py. */
export interface EngineData {
  version: string;
  model: ModelData | null;
  brands: WordTable;
  lures: WordTable;
  shared_platforms: string[];
  shared_hosts: string[];
  user_content: string[];
  official: Record<string, string>;
  official_tlds: string[];
  second_level: string[];
  categories: {
    legal_betting: string[];
    illegal_betting_brands: string[];
    gambling_words: string[];
    gambling_hints: string[];
    investment_words: string[];
    shopping_words: string[];
    adult_substrings: string[];
    adult_tokens: string[];
    community: Record<string, "gambling" | "adult">;
  };
}

/** blocklist.json also says which entries are not scams (malware, attack sources). */
export interface BlockList extends HashList {
  categories?: Record<string, string>;
}

/** A hash list ready for lookups. */
export interface HashSet {
  hashes: Set<string>;
  hexChars: number;
  categories?: Record<string, string>;
}

export interface Lists {
  blocklist: HashSet | null;
  allowlist: HashSet | null;
}

export function hashSet(list: BlockList): HashSet {
  return { hashes: new Set(list.hashes), hexChars: list.hex_chars, categories: list.categories };
}

export const level = (score: number) => (score >= HIGH ? "high" : score >= MEDIUM ? "medium" : "low");

function modelPoints(p: number, threshold: number): number {
  if (p >= threshold) return pyRound(50 + (10 * (p - threshold)) / (1 - threshold));
  if (p < 0.3) return 0;
  return pyRound((40 * (p - 0.3)) / (threshold - 0.3));
}

export class Engine {
  private readonly model: NameModel | null;
  private readonly platforms: Set<string>;
  private readonly shared: Set<string>;
  private readonly userContent: Set<string>;
  private readonly officialTlds: Set<string>;
  private readonly secondLevel: Set<string>;
  private readonly legalBetting: Set<string>;
  private readonly adultTokens: Set<string>;
  private readonly official: Map<string, string>;
  private readonly community: Map<string, "gambling" | "adult">;

  constructor(readonly data: EngineData) {
    this.model = data.model ? new NameModel(data.model) : null;
    this.platforms = new Set(data.shared_platforms);
    this.shared = new Set(data.shared_hosts);
    this.userContent = new Set(data.user_content);
    this.officialTlds = new Set(data.official_tlds);
    this.secondLevel = new Set(data.second_level);
    this.legalBetting = new Set(data.categories.legal_betting);
    this.adultTokens = new Set(data.categories.adult_tokens);
    this.official = new Map(Object.entries(data.official));
    this.community = new Map(Object.entries(data.categories.community));
  }

  registeredDomain(host: string): string {
    return registeredDomain(host, this.secondLevel);
  }

  officialBrand(host: string): string | null {
    if (this.officialTlds.has(host.split(".").pop() ?? "")) return host;
    for (const name of hostParents(host)) {
      if (this.userContent.has(name)) return null;
      const brand = this.official.get(name);
      if (brand !== undefined) return brand;
    }
    return null;
  }

  sharedHost(host: string): string | null {
    return hostParents(host).slice(1).find((name) => this.shared.has(name)) ?? null;
  }

  /** The model's probability for a name, scored as the API scores it (backend/model.py). */
  modelScore(host: string): number | null {
    if (!this.model || isIp(host)) return null;
    const name = host.startsWith("www.") ? host.slice(4) : host;
    const part = chosenPart(name, this.platforms);
    const view = part === name ? name : `${part}.com`;
    const extra = [
      view.length / 50,
      view.split(".").length / 5,
      (view.match(/\d/g) ?? []).length / 10,
      (view.match(/-/g) ?? []).length / 5,
      entropy(view) / 5,
      hints(view, this.data.brands).length ? 1 : 0,
      hints(view, this.data.lures).length ? 1 : 0,
    ];
    return this.model.probability(view, extra);
  }

  /** The 0-100 score and its reasons, and a category guess: the API's /api/check without DNS and WHOIS. */
  async check(host: string, lists: Lists, lang: Lang): Promise<CheckResult> {
    const hashes = new Map<string, string>();
    const hashOf = async (name: string, hexChars: number) => {
      const key = `${hexChars}:${name}`;
      if (!hashes.has(key)) hashes.set(key, await hostHash(name, hexChars));
      return hashes.get(key)!;
    };
    const inList = async (list: HashSet | null, name: string) => Boolean(list?.hashes.has(await hashOf(name, list.hexChars)));
    const firstListed = async (list: HashSet | null, names: string[]) => {
      for (const name of names) if (await inList(list, name)) return name;
      return null;
    };

    const ip = isIp(host);
    const parents = hostParents(host);
    const domain = ip ? host : this.registeredDomain(host);
    const listed = await firstListed(lists.blocklist, parents);
    const official = this.officialBrand(host);
    const shared = ip ? null : this.sharedHost(host);
    let popular = false;
    let parent: string | null = null;
    if (!ip && !shared) {
      if (host === domain || host === `www.${domain}`) popular = await inList(lists.allowlist, domain);
      else parent = await firstListed(lists.allowlist, parents.slice(1));
    }
    const trusted = Boolean(official || popular);
    const p = this.modelScore(host);
    const threshold = this.model?.threshold ?? null;

    const text = REASONS[lang];
    const reasons: Reason[] = [];
    const add = (code: ReasonCode, points: number, severity: Reason["severity"], values: Record<string, string> = {}) =>
      reasons.push({ code, points, severity, text: text[code](values) });

    let score = 0;
    if (ip) {
      score += 25;
      add("ip_host", 25, "warning");
    }
    if (shared) {
      score += 5;
      add("shared_host", 5, "warning", { host: shared });
    }
    if (parent) {
      score -= 15;
      add("popular_parent", -15, "safe", { parent });
    }
    if (p !== null && threshold !== null && !trusted) {
      const points = modelPoints(p, threshold);
      score += points;
      const code = p >= threshold ? "model_high" : points ? "model_mid" : "model_low";
      add(code, points, code === "model_high" ? "danger" : points ? "warning" : "info");
    }
    if (!ip && !official) {
      const brands = hints(host, this.data.brands);
      if (brands.length) {
        score += 10;
        add("brand", 10, "warning", { brands: brands.map((b) => `“${b}”`).join(", ") });
      }
      const lures = hints(host, this.data.lures);
      if (lures.length && !trusted) {
        score += 5;
        add("lure", 5, "warning", { words: lures.join(", ") });
      }
    }
    score = Math.max(0, Math.min(100, score));

    const override = (code: ReasonCode, next: number, severity: Reason["severity"], values: Record<string, string> = {}) => {
      add(code, next - score, severity, values);
      score = next;
    };
    if (official) override("official", Math.min(score, 5), "safe", { brand: official });
    else if (popular) override("popular", Math.min(score, 15), "safe");
    let usom: CheckResult["details"]["usom"] = null;
    if (listed && lists.blocklist) {
      const code = lists.blocklist.categories?.[await hashOf(listed, lists.blocklist.hexChars)] ?? "PH";
      const category = LIST_CATEGORIES[lang][code] ?? OTHER_LIST_CATEGORY[lang];
      usom = { entry: listed, listed_utc: "", category: code, usom_id: "" };
      if (listed === host || listed === host.replace(/^www\./, "")) override("usom_listed", Math.max(score, 95), "danger", { category });
      else override("usom_parent", Math.max(score, 90), "danger", { parent: listed, category });
    }

    // A listing decides the score even when the other evidence had already reached it.
    reasons.sort(
      (a, b) =>
        Number(!a.code.startsWith("usom")) - Number(!b.code.startsWith("usom")) ||
        ORDER[a.severity] - ORDER[b.severity] ||
        Math.abs(b.points) - Math.abs(a.points),
    );
    return {
      domain: host,
      score,
      level: level(score),
      reasons,
      category: await this.classify(host, official, lists, lang),
      checked_utc: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      details: {
        registered_domain: domain,
        model_score: p === null ? null : Math.round(p * 1e4) / 1e4,
        model_threshold: threshold === null ? null : Math.round(threshold * 1e4) / 1e4,
        usom,
        official_brand: official,
        shared_host: shared,
        tranco_rank: null,
        dns: null,
        registration: null,
      },
    };
  }

  /** backend/categories.py guess() and classify(), with the registration date unknown. */
  private async classify(host: string, official: string | null, lists: Lists, lang: Lang): Promise<Category | null> {
    const c = this.data.categories;
    const parents = hostParents(host);
    if (isIp(host) || parents.some((p) => this.legalBetting.has(p))) return null;
    const domain = this.registeredDomain(host);
    let sub = host.slice(0, host.length - domain.length).replace(/\.+$/, "");
    if (sub.startsWith("www")) sub = sub.slice(3);
    sub = sub.replace(/^\.+|\.+$/g, "");
    const label = (sub ? `${sub}.` : "") + domain.split(".")[0];
    const flat = label.replace(/[^a-z0-9]/g, "");
    const tokens = new Set(label.split(/[^a-z]+/).filter(Boolean));
    const trusted = Boolean(official);
    const popular = Boolean(lists.allowlist?.hashes.has(await hostHash(domain, lists.allowlist.hexChars)));

    const found = ((): [CategoryId, Category["confidence"], CategoryReason] | null => {
      const community = parents.map((p) => this.community.get(p)).find(Boolean);
      if (community) return [community, "high", "community"];
      if (!trusted) {
        if (c.illegal_betting_brands.some((b) => flat.includes(b))) return ["gambling", "high", "gambling_brand"];
        const mirror = /\d{2,4}$/.test(flat) || c.gambling_hints.some((h) => flat.includes(h));
        // "bet" alone is too common (alphabet, better, bethesda): it counts with a number or a betting hint.
        const bet = /bet\d/.test(flat) || (/(^|[^a-z])bet|bet([^a-z]|$)/.test(label) && mirror);
        if (c.gambling_words.some((w) => flat.includes(w)) || bet)
          return mirror ? ["gambling", "high", "gambling_mirror"] : ["gambling", "medium", "gambling_word"];
        if (c.adult_substrings.some((s) => flat.includes(s)) || [...tokens].some((t) => this.adultTokens.has(t)) || label.startsWith("sex"))
          return ["adult", "high", "adult"];
      }
      if (trusted || popular) return null;
      // Registration dates are unknown here, so a site always counts as new or unknown, and never as a new shop.
      if (c.investment_words.some((w) => flat.includes(w))) return ["investment", "medium", "investment"];
      return null;
    })();
    if (!found) return null;
    const [id, confidence, code] = found;
    return { id, label: CATEGORY_LABELS[lang][id], confidence, reasons: [CATEGORY_REASONS[lang][code]] };
  }
}

/** A checker for the web page: loads engine.json and the two lists from a folder once, then checks on the device. */
export function deviceChecker(base: string): (host: string, lang: Lang) => Promise<CheckResult> {
  let ready: Promise<{ engine: Engine; lists: Lists }> | null = null;
  const load = async () => {
    const get = async <T>(name: string): Promise<T> => {
      const response = await fetch(`${base}${name}`);
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
      return response.json();
    };
    const [data, blocklist, allowlist] = await Promise.all([
      get<EngineData>("engine.json"),
      get<BlockList>("blocklist.json"),
      get<BlockList>("allowlist.json"),
    ]);
    return { engine: new Engine(data), lists: { blocklist: hashSet(blocklist), allowlist: hashSet(allowlist) } };
  };
  return async (host, lang) => {
    ready ??= load().catch((err) => {
      ready = null; // try again next time
      throw err;
    });
    const { engine, lists } = await ready;
    return engine.check(host, lists, lang);
  };
}
