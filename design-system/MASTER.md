# HookGuard Tasarım Sistemi (MASTER)

Tek doğruluk kaynağı. Kapsam: web sitesi (`web/`), eklentinin popup'ı, uyarı sayfası (`warning.html`) ve sayfa içi uyarı şeridi. Bir sayfaya özel kural gerekirse `design-system/pages/<sayfa>.md` açılır ve yalnızca orada yazanlar bu dosyayı ezer.

Kaynak: ui-ux-pro-max tasarım sistemi aracı ("Minimalism & Swiss" stili, "Hero + Features + CTA" yapısı, "Trust teal" paleti, erişilebilirlik odaklı yazı tipi araması), HookGuard'ın hedef kitlesine göre uyarlandı. Revizyon 2'de (2026-10-30) görsel yön aracın "Aurora UI" stiline ve Bricolage Grotesque başlıklarına geçti, beş palet ve İngilizce birincil dil eklendi (§2–§4). Aracın önerdiği Lora/Raleway ve OLED siyah koyu tema alınmadı.

---

## 1. Kime, ne için

SMS'le şüpheli link alan anne-babalar, yaşlılar, öğrenciler. Teknolojiden pek anlamazlar, linki çoğunlukla telefondaki mesajdan kopyalayıp gelirler, bir kararı birkaç saniyede vermek isterler: "Tıklayayım mı, tıklamayayım mı?"

**İlkeler**

1. **Önce mesaj, sonra sayı.** Sonucu başlık söyler ("Tehlikeli"); puan halkası yalnızca destekler.
2. **Ne anlama geliyor + ne yapmalısın.** Her ekran kullanıcıya bir sonraki adımı söyler.
3. **Sade Türkçe, teknik terim yok.** Bkz. §10 sözlük.
4. **Sakin güven.** Korkutmaz, yön gösterir. "Hacker" estetiği yok.
5. **Renk tek başına anlam taşımaz.** Her durum = renk + ikon + başlık.
6. **Mobil önce.** Tasarım 375 px'te başlar, masaüstüne genişler.
7. **Gizlilik görünür.** "Sadece alan adı gönderilir" notu her giriş alanının yanında durur.

---

## 2. Marka ve görsel yön (revizyon 2, 2026-10-30)

İlk turkuaz tema beğenilmedi; yön **Aurora UI**'ya döndü (ui-ux-pro-max "Aurora UI" stili: akan, ışıklı mesh gradyanlar, modern SaaS ve premium ürünler için). Okunabilirlik kuralları (§1, §11) aynen geçerli; aurora yalnızca zeminde ve vurgularda, içerik sade kalır.

- **Logo:** kalkan içinde kanca, aynı SVG yolları. Kalkan artık paletin gradyanıyla (`--brand` → `--brand-2`) dolu, kanca `--on-brand`.
- **Ad:** "HookGuard", bitişik, G büyük.
- **Özgün dokunuşlar:**
  - hero'da yavaşça kayan üç renkli aurora ışığı ve ince gren;
  - başlığın ikinci yarısı gradyan yazı ("you click." / "emin ol.");
  - masaüstünde dolandırıcı bir SMS'i "Tehlikeli" diye işaretleyen telefon çizimi;
  - cam kartlar ve gradyan kenarlı link kutusu.

---

## 3. Renkler

Renk iki katmandır:

1. **Nötr yüzeyler ve sabit durum renkleri:** `tokens.css`.
2. **Marka paleti:** `palettes.css` (betikle üretildi). Kullanıcı seçer; seçim `<html data-palette>` ile uygulanır. Tema, `data-theme` ya da cihazın ayarıyla açık veya koyu olur.

**Paletler.** Hepsi ölçüldü: marka yazısı ve buton metni, her yüzeyde ve iki temada en az 4,5:1.

| Palet | Açık: marka / ikinci renk | Koyu: marka / ikinci renk | Ruh |
|---|---|---|---|
| **Aurora** (varsayılan) | `#5B3DF5` / `#0369A1` | `#A99CFF` / `#67E8F9` | elektrik mor → derin gök |
| Okyanus | `#1D4ED8` / `#0E7490` | `#86AEFF` / `#67E8F9` | mavi → camgöbeği |
| Orkide | `#A21CAF` / `#6D28D9` | `#F0A3FF` / `#C4B5FD` | fuşya → mor |
| Lagün | `#0F766E` / `#0369A1` | `#2DD4BF` / `#7DD3FC` | eski turkuaz, isteyene |
| Grafit | `#18181B` / `#52525B` | `#F4F4F5` / `#A1A1AA` | tek renk, sade |

Her palet ayrıca üç ışık rengi tanımlar (`--glow-a/b/c`, RGB üçlüsü olarak). Zemin gradyanı ve parlamalar bunlardan hesaplanır.

**Nötrler.**

| Token | Açık | Koyu |
|---|---|---|
| `--bg` | `#F6F7FB` | `#0A0B14` |
| `--surface-1` | `#FFFFFF` | `#121422` |
| `--surface-2` | `#EFF0F7` | `#1A1C2E` |
| `--surface-3` | `#E5E6F1` | `#24273C` |
| `--surface-card` (cam kart) | beyaz, %82 | `#121422`, %76 |
| `--fg` | `#14152B` (16,7:1) | `#ECEDF7` (16,8:1) |
| `--fg-muted` | `#545670` (7,1:1) | `#A7A9C4` (7,9:1) |
| `--border-strong` | `#8587A0` (3,5:1) | `#646788` |

**Durum renkleri** değişmedi (yeşil, turuncu, kırmızı) ve paletten bağımsızdır. Marka renkleri bilinçli olarak bu üç renkten uzak tutuldu.

**Zemin derinliği:**

- Düz renk zemin.
- Üç radyal ışık: sol üst, sağ üst, alt.
- Dikey geçiş.
- 160 px'lik SVG gren dokusu.

Hepsi `body::before` üzerinde sabit bir katmandır; kaydırırken kaymaz ve döşeme izi bırakmaz. Hero'daki hareketli ışıklar alta doğru maskeyle sönümlenir.

**Uyarı:** `--brand-gradient`, `:root` üzerinde çözülür. Palet önizlemesi gibi yerel bir kapsamda gradyan gerekiyorsa `linear-gradient(120deg, var(--brand), var(--brand-2))` doğrudan yazılır.

---

## 4. Yazı tipi

| Rol | Yazı tipi | Neden |
|---|---|---|
| Başlıklar | **Bricolage Grotesque** (değişken; opsz, wdth, wght) | Modern ve karakterli bir grotesk; latin-ext Türkçe harfleri kapsar. Harf aralığı `-0.025em`, satır yüksekliği 1,1. |
| Metin | **Atkinson Hyperlegible Next** | Az gören okurlar için tasarlandı; gövde metni ve arayüz. |
| Alan adları | **Atkinson Hyperlegible Mono** | `a1o1` ile `a101` farkını görünür kılar. |

Hepsi `@fontsource-variable` paketleriyle projeye gömülür; Google'a istek gitmez.

Boyutlar:
- `--text-3xl`: 40 → 72 px (hero).
- `--text-2xl`: 28 → 36 px.
- Diğerleri §4'ün önceki değerleriyle aynı; en küçük boyut 16 px.

**Dil:** İngilizce birincil (varsayılan), Türkçe seçenek. Bütün metinler `shared/content.ts` ve bileşenlerdeki `TEXT = { en, tr }` sözlüklerindedir.
- Web'de dil, üst menüdeki EN/TR düğmesiyle seçilir ve `localStorage`'da tutulur.
- Eklentide dil ayarlardan seçilir; API'ye `lang` olarak geçer.
- §10'daki sade dil ve yasak kelimeler kuralı iki dil için de geçerlidir.

## 5. Boşluk, ızgara, köşe, gölge

- **Boşluk** (4 px tabanlı, ferah): `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64 · `20` 80 · `24` 96 px.
- **Yerleşim:**
  - `--container` 1120 px, `--reading` 680 px.
  - Kenar boşluğu: mobilde 16 px, tablette 24 px, masaüstünde 32 px.
  - Kırılma noktaları: 375, 768, 1024, 1280 px.
  - Bölümler arası boşluk: mobilde 64 px, masaüstünde 96 px.
- **Köşe:** `--radius-sm` 8 · `md` 12 · `lg` 16 (kart) · `xl` 24 (sonuç kartı, hero kutusu) · `pill` 999.
- **Gölge:**
  - Açık tema: `--shadow-1` hafif (kart), `--shadow-2` yükseltilmiş (hover, sonuç kartı), `--shadow-3` menü ve popover.
  - Koyu tema: aynı adlar; daha derin, `rgb(0 0 0 / 0.35–0.5)`, artı üst iç ışık.
- **Kontrol yükseklikleri:**
  - `--control-h` 48 px (buton, çip, akordiyon satırı en az 48).
  - `--control-h-lg` 56 px (ana buton).
  - `--input-h-hero` 64 px (hero'daki link kutusu; mobilde 56).
- **Dokunma hedefi:** En az 44×44 px, hedefler arası en az 8 px.

---

## 6. Durum sistemi (çekirdek)

API'nin `level` değeri arayüzde üç duruma eşlenir. Başlık, ikon ve renk her yerde (web, popup, uyarı sayfası, şerit) aynıdır.

| API `level` | Başlık | İkon (Solar) | Token | Tek cümlelik anlam |
|---|---|---|---|---|
| `low` | **Güvenli görünüyor** | `shield-check-bold-duotone` | `--safe-*` | "Bilinen bir tehlike işareti bulmadık." |
| `medium` | **Dikkatli ol** | `danger-triangle-bold-duotone` | `--caution-*` | "Bu adreste dolandırıcılık sitelerine benzeyen işaretler var." |
| `high` | **Tehlikeli** | `shield-warning-bold-duotone` | `--danger-*` | "Bu adres büyük olasılıkla bir dolandırıcılık sitesi." |

- "Güvenli" kelimesi tek başına hiç kullanılmaz; her zaman "Güvenli görünüyor".
- **Gerekçe maddeleri:** API'nin `severity` değerine göre küçük ikon alır. Puan katkısı (+58 gibi) **gösterilmez**.

  | `severity` | İkon | Renk |
  |---|---|---|
  | `danger` | `danger-circle-bold` | `--danger-fg` |
  | `warning` | `danger-triangle-bold` | `--caution-fg` |
  | `safe` | `check-circle-bold` | `--safe-fg` |
  | `info` | `info-circle-bold` | `--fg-muted` |

- **Puan halkası:** İkincil öğedir; başlığın yanında küçük durur (72–96 px). Rengi durumun dolu tonudur. Ortasında sayı ve altında "/ 100" yazar.

---

## 7. Bileşenler

- **Buton.**
  - Türler: birincil (`--brand` dolu), ikincil (`--surface-1` zemin + `--border-strong` kenar), metin bağlantısı.
  - Ana eylem 56 px, diğerleri 48 px yüksekliğinde; etiket 18 px, 700 ağırlık. İkonlu butonda ikon 24 px, solda.
  - Hover'da renk koyulaşır (200 ms), basılıyken %98 ölçeklenir.
  - Devre dışı buton %50 opaklıkta ve imleç değişmez.
- **Link kutusu (hero).**
  - Üstünde görünür bir etiket durur ("Şüpheli linki buraya yapıştır"); yer tutucu tek başına etiket değildir.
  - Yükseklik 64 px (mobilde 56), yazı 20 px, kenar 2 px `--border-strong`, köşe `--radius-lg`.
  - İçinde solda `link-round-angle-linear` ikonu, doluyken sağda temizle (×) düğmesi.
  - Mobilde kutu ve "Kontrol et" butonu alt alta, buton tam genişlik.
  - Altında gizlilik notu: `lock-keyhole-minimalistic-bold-duotone` ikonu ve 16 px metin.
  - Hata mesajı kutunun hemen altında, `--danger-fg` renginde ve ikonla.
- **Örnek çip.**
  - En az 44 px yükseklik, `--radius-pill`, `--surface-2` zemin, alan adı mono yazı tipinde.
  - Örnek alan adları **sahte** olur; dolandırıcılık örneklerinde ayrılmış `.example` uzantısı kullanılır. Gerçek resmi siteler yalnızca "güvenli görünüyor" örneği olarak yer alabilir.
- **Kart.**
  - `--surface-1` zemin, 1 px `--border` kenar, `--radius-lg` köşe, `--shadow-1` gölge, `--space-6` iç boşluk.
  - Koyu temada üst iç ışık eklenir.
  - Özellik ve dolandırıcılık türü kartlarında 48 px duotone ikon, `--brand-soft` zemin üstünde 64 px kare içinde durur.
- **Sonuç kartı** (yukarıdan aşağı):
  1. **Durum bandı:** `--{durum}-soft` zemin, sol kenarda 6 px dolu şerit, 48 px durum ikonu, `--text-2xl` başlık, mono alan adı, sağda puan halkası.
  2. **"Ne anlama geliyor?"**: tek cümle.
  3. **"Neden?"**: gerekçe listesi.
  4. **"Ne yapmalısın?"**: 2–4 numaralı somut adım.
  5. **Yalnız "Tehlikeli" durumda:** "Bu linke tıkladıysan ve bilgi girdiysen" kutusu, `--danger-soft` zeminde.
  6. **"Bu linki gönderen kişiyi uyar"** butonu (WhatsApp'ta paylaşır). Mesajda yalnızca alan adı geçer, linkin tamamı geçmez.
  7. **"Ayrıntılar"**: kapalı akordiyon, sade etiketlerle.
- **Akordiyon:** Yerel `<details>`/`<summary>` öğeleri. Satır en az 56 px; sağda `alt-arrow-down-linear` ok ikonu açılınca 180° döner. Klavye ile kullanılabilir.
- **Üst menü:**
  - Yapışkan, 64 px; zemin `--bg` + %80 opaklık + bulanıklaştırma.
  - Solda logo, ortada menü, sağda "Eklentiyi ekle" (birincil buton) ve tema seçici (Sistem / Açık / Koyu).
  - 768 px altında hamburger (`hamburger-menu-linear`). Menü tam genişlik açılır, Esc ile kapanır, odak menü içinde kalır.
- **Alt bilgi:** Gizlilik, iletişim (yanında küçük "Lisanslar" bağlantısı), sorumluluk reddi. Ayrı atıf paneli yok. 16 px, `--fg-muted`.
- **Eklenti ekranları:**
  - Popup 380 px genişlikte; sonuç kartının sıkıştırılmış hâlidir (bant + "Neden?" + "Ne yapmalısın?" + ayrıntı bağlantısı).
  - Uyarı sayfası, web sitesindeki "Tehlikeli" sonuç kartının tam sayfa hâlidir. Ana eylem "Güvenli sayfaya dön", birincil butondur. "Riski anlıyorum, yine de aç" küçük, ikincil bir metin bağlantısıdır.
  - Sayfa içi şerit, Shadow DOM içinde aynı token'ları kullanır; zemin `--caution-solid` ya da `--danger-solid`, yazı onların "dolu üstü" tonudur.

---

## 8. İkonlar

- **Set:** Yalnızca **Solar** (480 Design, 9.000'den fazla ikon). Lucide ve Heroicons kullanılmaz.
- **Neden Iconoir değil:** Iconoir'ın yalnızca 1,5 px ince çizgili hâli var. Solar'ın dolu/duotone stilleri az gören kullanıcılar için daha kolay tanınır.
- **Lisans:** CC BY 4.0. Atıf `THIRD_PARTY_NOTICES.md` dosyasındadır; alt bilgideki "Lisanslar" bağlantısı oraya gider.
- **Yükleme:** `unplugin-icons` + `@iconify-json/solar`, derleme sırasında React bileşeni olarak gömülür. Çalışırken internetten ikon çekilmez.
- **Stil kuralları:**
  - Durum ve özellik ikonları: `*-bold-duotone`.
  - Arayüz kontrolleri (menü, ok, kapat, kopyala): `*-linear`.
  - Gerekçe maddeleri: `*-bold`.
- **Boyutlar:** 20, 24, 32, 48 px.
- **Erişilebilirlik:**
  - Süs amaçlı ikon `aria-hidden="true"` alır.
  - Yalnız ikondan oluşan butonun mutlaka `aria-label`'ı olur.
  - Emoji ikon olarak kullanılmaz.

Doğrulanmış ikon adları:

- **Durum:** `shield-check-bold-duotone`, `danger-triangle-bold-duotone`, `shield-warning-bold-duotone`
- **Gerekçe:** `danger-circle-bold`, `danger-triangle-bold`, `check-circle-bold`, `info-circle-bold`
- **Arayüz:** `link-round-angle-linear`, `close-circle-linear`, `hamburger-menu-linear`, `alt-arrow-down-linear`, `arrow-right-linear`, `copy-linear`, `share-linear`, `chat-round-line-linear`, `sun-2-linear`, `moon-linear`, `monitor-linear`, `question-circle-linear`, `undo-left-round-linear`
- **Nasıl çalışır:** `clipboard-text-linear` → `cpu-bolt-bold-duotone` → `checklist-minimalistic-bold-duotone`
- **Gizlilik ve eklenti:** `lock-keyhole-minimalistic-bold-duotone`, `shield-keyhole-bold-duotone`, `widget-add-bold-duotone`
- **Dolandırıcılık türleri:**

  | Tür | İkon |
  |---|---|
  | Kargo | `delivery-bold-duotone` |
  | e-Devlet / vergi | `document-text-bold-duotone` |
  | Banka | `card-bold-duotone` |
  | Çekiliş / kampanya | `gift-bold-duotone` |
  | Yatırım | `graph-up-bold-duotone` |
  | SMS | `chat-round-dots-bold-duotone` |

- **"Tıkladıysan" kutusu:** `phone-calling-bold-duotone`, `key-bold-duotone`

---

## 9. Hareket

- **Kütüphane:** `motion` (`motion/react`).
- **Süreler:**

  | Token | Süre |
  |---|---|
  | `--dur-fast` | 150 ms |
  | `--dur-base` | 250 ms |
  | `--dur-slow` | 400 ms |
  | halka dolumu | 900 ms |

- **Eğriler:**
  - Giriş: `--ease-out` = `cubic-bezier(0.22, 1, 0.36, 1)`.
  - Çıkış girişten hızlıdır: süre × 0,7.
  - Bilgi içeren arayüzde zıplayan (`back`, `bounce`) eğri kullanılmaz. Aracın önerdiği `back.out` bu yüzden alınmadı.
- **Tanımlı animasyonlar:**
  - **Sonuç kartı girişi:** saydamlık 0 → 1 ve 16 px aşağıdan yukarı, 300 ms. İçindeki bölümler 60 ms arayla sırayla gelir.
  - **Puan halkası:** kart geldikten sonra 0'dan puana kadar 900 ms'de dolar; ortadaki sayı da birlikte artar.
  - **Hero:** arka plandaki turkuaz ışık 20 sn'lik döngüde çok yavaş kayar; kalkan logosu ilk açılışta bir kez belirir. Paralaks yok.
  - **Kontrol sırasında:** buton içinde dönen gösterge ve kutunun altında "Kontrol ediliyor…" yazısı. Sonuç en az 400 ms gösterilir, böylece ekran titremez.
  - **Akordiyon ve mobil menü:** yükseklik değil, saydamlık ve kayma animasyonu kullanılır.
- **`prefers-reduced-motion: reduce`:** Tüm animasyonlar kapanır, son hâl hemen gösterilir. Halka dolu çizilir, arka plan sabit kalır.

---

## 10. Dil ve metin

- **Hitap:** "sen". Kısa cümle, etken çatı. Her uyarının arkasından bir eylem gelir.
- **Kesin hüküm yok:** "Hiçbir araç %100 garanti veremez" fikri gerekli yerlerde tekrarlanır.
- **Sayılar:** Türkçe biçimde yazılır (5.105; 0,98).
- **Kullanıcıya görünen metinlerde yasak kelimeler:** USOM, model, DNS, WHOIS, RDAP, Tranco, hash, API, eşik, oltalama skoru.

**Sözlük**

| Teknik | Arayüzde |
|---|---|
| USOM listesi | "bilinen dolandırıcılık siteleri listesi"; ayrıntılarda **"Tehdit listesi"** |
| Model puanı | **"Benzerlik skoru"**: "daha önce dolandırıcılıkta kullanılmış sitelerin adlarına benzerlik" |
| Tranco sırası | **"Popülerlik"** |
| Kayıt tarihi (WHOIS/RDAP) | "Site ne zamandır var" / "Kuruluş tarihi" |
| DNS çözülüyor / yok | "Site şu an açılabiliyor" / "Site şu an açılmıyor" |
| Paylaşımlı platform | "Herkesin ücretsiz site açabildiği bir hizmetin üzerinde" |
| Oltalama / phishing | "dolandırıcılık sitesi" (ilk geçişte gerekirse "sahte site") |
| Alan adı | "alan adı" (ör. `ptt.gov.tr`); gizlilik notunda "linkin tamamı değil, yalnızca alan adı" |

**Hiç kullanılmayacaklar:**
- korku dili ("Hacklendin!", "Hemen!!!", tamamı büyük harf);
- "hacker" görselleri (kapüşonlu kişi, matrix yağmuru, neon yeşil üstüne siyah);
- sahte istatistik, sahte kullanıcı yorumu, sahte "X kişi korundu" sayacı.

---

## 11. Erişilebilirlik (zorunlu)

- **Kontrast:**
  - Metin en az 4,5:1, büyük başlık en az 3:1.
  - Kontrol kenarı ve odak halkası en az 3:1.
  - §3'teki tüm çiftler ölçüldü; koyu temada çoğu 7:1'in üstünde (AAA).
- **Odak:** Her etkileşimli öğede 3 px `--focus` halka ve 2 px boşluk. Odak halkası hiçbir yerde kaldırılmaz.
- **Hedef boyutu:** En az 44×44, ana öğeler 48 px ve üstü.
- **Sonuç bölgesi:** `aria-live="polite"`. Sonuç gelince odak sonuç başlığına taşınır.
- **Yapı:**
  - Başlık sırası h1 → h2 → h3, atlama yok.
  - Form alanlarının görünür etiketi vardır.
  - Hata mesajı alanın yanında durur ve `aria-describedby` ile alana bağlanır.
- **Yakınlaştırma ve taşma:** Yakınlaştırma kapatılmaz. 320 px genişlikte yatay kaydırma olmaz. Metin %200 büyütülünce de bozulmaz.
- **Renk tek başına anlam taşımaz:** Her durum renk + ikon + başlık ile verilir.

---

## 12. Uygulama

- **`shared/design/tokens.css`:** Tüm token'lar burada tanımlıdır.
  - Seçiciler: `:root, :host` (açık); `[data-theme="dark"]` ve `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]), :host }` (koyu).
  - `:host` seçicisi, Shadow DOM'daki şeridin token'ları almasını sağlar.
- **`shared/design/base.css`:** Sıfırlama, gövde zemini (3 katman) ve yazı tipi kuralları.
- **Uygulamalar:** `web/` ve `extension/` bu iki dosyayı aynen içe aktarır ve kendi renk ya da ölçülerini tanımlamaz.
- **Tema:** Web'de Sistem / Açık / Koyu seçici vardır; seçim `localStorage`'da tutulur. Eklenti sistem temasını izler.
- **Kontrol:** Derlemeden önce bileşen CSS'lerinde `#` renk ve `px` aranır (token dosyaları hariç); bulunanlar token'a taşınır.

---

## 13. Uygulamada eklenenler (onaylı sisteme ek)

- **Kategoriler ve durum:** Bahis, sahte yatırım, sahte alışveriş ve sahte virüs uyarısı kategorileri risk puanını değiştirmez. Değiştirdikleri tek şey kullanıcının gördüğü durumdur (`displayLevel`, `shared/content.ts`):
  - Yasadışı bahis (yüksek güven) ve sahte virüs uyarısı **Tehlikeli** gösterilir.
  - Sahte yatırım, sahte alışveriş ve orta güvenli bahis tahmini en az **Dikkatli ol** gösterilir.
  - Yetişkin içerik yalnızca nötr bir not alır.
  - Durumu kategori yükselttiyse puan halkası gösterilmez, çünkü sayı artık durumu anlatmıyor.
- **Ton sınıfları** (`.tone-safe`, `.tone-caution`, `.tone-danger`, `.tone-info`, `.tone-brand`) `tokens.css` içindedir, böylece her Shadow DOM'da çalışır.
- **Yeni token'lar:**
  - `--scrim`: modal arka planı.
  - `--label-col`: ayrıntı etiket sütunu.
- **Sayfa içi bileşenler** (eklenti, Shadow DOM):
  - Uyarı şeridi: dolu durum rengi; "Neden?", "Sayfadan çık" ve kapat butonları.
  - Form uyarısı: modal, üstünde durum rengi şerit.
  - Kısa link ipucu: 16 px yazı.
  - Link rozetleri: e-postadaki metinle birlikte ölçeklensin diye `em` ile boyutlanır. Bu, "en az 16 px" kuralının tek bilinçli istisnasıdır. Güvenli rozet yalnızca ikondur; "Dikkat" ve "Tehlikeli" yazılıdır.
- **Yazı tipi:** Shadow DOM'a sayfa yazı tipleri ulaşmaz. Şerit, modal, ipucu ve rozet sistem yazı tipiyle görünür. Eklentinin kendi sayfaları (popup, uyarı, ayarlar) Atkinson kullanır.
- **Ek ikonlar:**
  - Ham SVG (rozet ve ipucu): `shield-check-bold`, `danger-triangle-bold`, `shield-warning-bold`, `link-round-angle-bold`.
  - Diğer: `ticket-sale-bold-duotone` (bahis), `cart-large-2-bold-duotone`, `bug-bold-duotone`, `password-minimalistic-input-bold-duotone`, `download-minimalistic-bold-duotone`, `users-group-two-rounded-bold-duotone`, `bell-bing-bold-duotone`, `flag-bold-duotone`, `settings-linear`, `refresh-linear`.
- **Anahtar (`.hg-switch`):** Ayarlarda `role="switch"` olan onay kutusu, yanında başlık ve açıklamayla.
- **Uyarı sayfası eylem sırası:** Önce "Güvenli sayfaya dön" (birincil), sonra "Bu linki gönderen kişiyi uyar", sonra "Yanlış uyarı mı? Bildir". "Riski anlıyorum, yine de aç" kartın altında, küçük bir metin bağlantısıdır.

---

## 14. Teslim öncesi kontrol listesi

- [ ] İkonlar Solar; emoji yok; yalnız ikonlu butonlarda `aria-label` var.
- [ ] Hiçbir arayüz metninde USOM, model, DNS, WHOIS, Tranco geçmiyor.
- [ ] Puan katkısı (+N) hiçbir yerde gösterilmiyor.
- [ ] Gövde metni en az 17 px; arayüzde 16 px'ten küçük metin yok.
- [ ] Açık ve koyu temada metin kontrastı en az 4,5:1, kontrol kenarları en az 3:1.
- [ ] Odak halkaları görünüyor; klavyeyle tüm akış yapılabiliyor (menü, kontrol, akordiyon, paylaş).
- [ ] `prefers-reduced-motion` açıkken animasyon yok.
- [ ] 375 / 768 / 1024 / 1440 px'te yatay kaydırma yok; ekran görüntüleri alındı.
- [ ] Web ve eklenti (popup, uyarı sayfası, şerit) aynı token'ları kullanıyor.
- [ ] Sahte istatistik ve sahte yorum yok.
