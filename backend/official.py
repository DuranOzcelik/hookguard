"""
HookGuard - official brand domains

The domains the brands in hints.py really use. A name under one of them is the
brand's own site, whatever its words say; the API also adds data/tr_brands.csv.
"""

from __future__ import annotations

OFFICIAL_DOMAINS = {
    "microsoft.com", "microsoft-int.com", "microsoftonline.com", "office365.com", "outlook.com",
    "onedrive.com", "sharepoint.com", "live.com", "hotmail.com",
    "google.com", "googleapis.com", "googleusercontent.com", "gmail.com",
    "apple.com", "icloud.com", "paypal.com", "amazon.com", "amazonaws.com", "amazon.dev",
    "amazonaws.com.cn", "amazonwebservices.com.cn", "amazonaws.eu", "amazonwebservices.eu",
    "facebook.com", "instagram.com", "whatsapp.com", "whatsapp.net", "netflix.com",
    "dhl.com", "fedex.com", "ups.com", "binance.com", "coinbase.com", "metamask.io",
    "steampowered.com", "steamcommunity.com", "telegram.org", "vodafone.com",
    "turkiye.gov.tr", "ziraatbank.com.tr", "isbank.com.tr", "garantibbva.com.tr",
    "akbank.com", "yapikredi.com.tr", "halkbank.com.tr", "vakifbank.com.tr", "qnb.com.tr",
    "enpara.com", "denizbank.com", "ptt.gov.tr", "pttavm.com", "hepsiburada.com", "trendyol.com",
    "turkcell.com.tr", "vodafone.com.tr", "turktelekom.com.tr", "sgk.gov.tr", "gib.gov.tr",
    "teb.com.tr", "cepteteb.com.tr", "a101.com.tr", "bim.com.tr", "sokmarket.com.tr", "migros.com.tr",
    "istanbulkart.istanbul", "ibb.gov.tr", "ibb.istanbul", "sahibinden.com", "toki.gov.tr", "uyap.gov.tr",
    "akbank.com.tr", "kuveytturk.com.tr", "ing.com.tr", "sekerbank.com.tr", "albaraka.com.tr",
    "odeabank.com.tr", "fibabanka.com.tr", "papara.com", "ininal.com", "n11.com", "getir.com",
    "yemeksepeti.com", "mhrs.gov.tr", "yurticikargo.com", "mngkargo.com.tr", "araskargo.com.tr",
}
OFFICIAL_TLDS = {"microsoft", "google", "apple", "amazon"}  # brand-owned top-level domains


def is_official(domain: str) -> bool:
    labels = domain.split(".")
    if labels[-1] in OFFICIAL_TLDS:
        return True
    return any(".".join(labels[i:]) in OFFICIAL_DOMAINS for i in range(len(labels) - 1))
