import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { extractHost, hostHash, hostParents, matchHashes } from "@shared/hookguard";

describe("extractHost", () => {
  it.each([
    ["akbank.com.tr", "akbank.com.tr"],
    ["https://user:pass@Giris.Akbank.com.tr:8443/login?next=/hesap#x", "giris.akbank.com.tr"],
    ["http://a101-hediye.xyz/kampanya/form.php?tc=12345678901", "a101-hediye.xyz"],
    ["hxxps://evil[.]example[.]com/x", "evil.example.com"],
    ["ödeme-akbank.com", "xn--deme-akbank-qfb.com"],
    ["http://198.51.100.7/panel", "198.51.100.7"],
    ["https://[2001:db8::1]/x", "2001:db8::1"],
    ["  www.trendyol.com.  ", "www.trendyol.com"],
  ])("%s -> %s", (input, host) => {
    expect(extractHost(input)).toBe(host);
  });

  it.each(["", "localhost", "not a domain", "javascript:alert(1)", "ftp://files.example.com", "data:text/html,x"])(
    "rejects %s",
    (input) => {
      expect(extractHost(input)).toBeNull();
    },
  );
});

describe("hashes", () => {
  it("match the API: first 16 hex characters of SHA-256", async () => {
    const expected = createHash("sha256").update("a101-hediye.xyz").digest("hex").slice(0, 16);
    expect(await hostHash("a101-hediye.xyz")).toBe(expected);
  });

  it("are checked for the host and its parents", async () => {
    expect(hostParents("a.b.example.com")).toEqual(["a.b.example.com", "b.example.com", "example.com"]);
    const listed = new Set([await hostHash("kampanya-ptt.com")]);
    expect(await matchHashes("odeme.kampanya-ptt.com", listed)).toBe("kampanya-ptt.com");
    expect(await matchHashes("ptt.gov.tr", listed)).toBeNull();
  });
});

describe("form protection checks", async () => {
  const { luhnValid, tcknValid } = await import("@shared/hookguard");
  it("recognises card numbers by the Luhn check", () => {
    expect(luhnValid("4111111111111111")).toBe(true);
    expect(luhnValid("4111111111111112")).toBe(false);
    expect(luhnValid("12345")).toBe(false);
  });
  it("recognises Turkish identity numbers by their check digits", () => {
    expect(tcknValid("10000000146")).toBe(true);
    expect(tcknValid("10000000147")).toBe(false);
    expect(tcknValid("01234567890")).toBe(false);
    expect(tcknValid("5551234567")).toBe(false);
  });
});

describe("links", async () => {
  const { isShortLink, unwrapLink } = await import("@shared/hookguard");
  it("unwraps mail and chat redirects", () => {
    expect(unwrapLink("https://www.google.com/url?q=https://ptt-kargo.example/x&sa=D")).toBe("https://ptt-kargo.example/x");
    expect(unwrapLink("https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fa.example%2F&data=1")).toBe("https://a.example/");
    expect(unwrapLink("https://l.facebook.com/l.php?u=https%3A%2F%2Fb.example%2F")).toBe("https://b.example/");
    expect(unwrapLink("https://www.google.com/url?q=javascript:alert(1)")).toBe("https://www.google.com/url?q=javascript:alert(1)");
  });
  it("knows link shorteners", () => {
    expect(isShortLink("bit.ly")).toBe(true);
    expect(isShortLink("bitly.example")).toBe(false);
  });
});

describe("categories raise what people see, not the score", async () => {
  const { displayLevel } = await import("@shared/content");
  it("never shows an illegal betting site as safe", () => {
    expect(displayLevel("low", { id: "gambling", confidence: "high" })).toBe("high");
    expect(displayLevel("low", { id: "gambling", confidence: "medium" })).toBe("medium");
    expect(displayLevel("high", { id: "shopping", confidence: "medium" })).toBe("high");
    expect(displayLevel("low", { id: "adult", confidence: "high" })).toBe("low");
    expect(displayLevel("medium", null)).toBe("medium");
  });
});
