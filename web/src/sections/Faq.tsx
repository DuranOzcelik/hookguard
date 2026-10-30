import { useLang } from "@shared/ui/i18n";
import { IconChevron } from "@shared/ui/icons";

import { Reveal } from "./Reveal";

const TEXT: Record<"en" | "tr", { title: string; items: { q: string; a: string[] }[] }> = {
  en: {
    title: "Frequently asked questions",
    items: [
      {
        q: "Is HookGuard safe to use?",
        a: [
          "Yes. You do not need to sign up or give any personal details, and it is free.",
          "The link you check is never opened; we only look at its address. Checking a suspicious link is much safer than tapping it.",
        ],
      },
      {
        q: "What happens to the link I paste?",
        a: [
          "The full link stays on your device. Only the domain reaches our server: from ptt-kargo-odeme.example/track?no=123, only “ptt-kargo-odeme.example”.",
          "The addresses you check are not stored. Short links (such as bit.ly) are the one exception: to see where one leads, we ask you before sending the short link itself.",
        ],
      },
      {
        q: "What does the score mean?",
        a: [
          "It is a risk score from 0 to 100; the higher, the riskier. 0–39 means “Looks safe”, 40–69 “Be careful”, and 70 or more “Dangerous”.",
          "It depends on whether the address is on known threat lists, how much its name looks like scam sites, how long the site has existed and whether it is a well-known site.",
        ],
      },
      {
        q: "Does “Looks safe” mean it is definitely safe?",
        a: [
          "No. It only means we found no known warning signs.",
          "A brand-new scam site may not be on any list yet, and a trustworthy site can be hacked. Before entering a password, card details or ID number, make sure the address in the address bar is right. No tool can give a 100% guarantee.",
        ],
      },
      {
        q: "What does the extension see and send?",
        a: [
          "The extension checks only the domain of the sites you open. It never asks our server about well-known and official sites, and recognises known scam sites from the list stored inside it.",
          "Form protection does not read or send what you type; on your device it only checks whether what you typed is a password, card number or ID number.",
        ],
      },
      {
        q: "How do short links on HookGuard work?",
        a: [
          "On the Short links page you can see where a short link leads before you click, or shorten a long link safely.",
          "We check where a link leads before shortening it and refuse dangerous ones. Whoever opens a HookGuard short link first sees a safety summary of the destination.",
        ],
      },
      {
        q: "What happens to the sites I report?",
        a: [
          "Every report is reviewed. Confirmed sites are added to the list so that other people are protected too.",
          "We do not record who reported; we keep only the address, the type you chose and your note, if any.",
        ],
      },
      {
        q: "What is family mode?",
        a: [
          "In the extension's settings you can lock betting and adult sites with a PIN. Opening a locked site asks for the PIN.",
          "Note: if the extension is removed, the lock goes too. For young children, use it together with your computer's child account settings.",
        ],
      },
    ],
  },
  tr: {
    title: "Sıkça sorulan sorular",
    items: [
      {
        q: "HookGuard'ı kullanmak güvenli mi?",
        a: [
          "Evet. Üye olman ya da kişisel bilgi vermen gerekmez; ücretsizdir.",
          "Kontrol ettiğin link açılmaz, yalnızca adresine bakılır. Bu yüzden şüpheli bir linki kontrol etmek, ona tıklamaktan çok daha güvenlidir.",
        ],
      },
      {
        q: "Yapıştırdığım linke ne oluyor?",
        a: [
          "Linkin tamamı senin cihazında kalır. Sunucumuza yalnızca alan adı gider: örneğin ptt-kargo-odeme.example/takip?no=123 linkinden yalnızca “ptt-kargo-odeme.example”.",
          "Kontrol ettiğin adresler kaydedilmez. Tek istisna kısa linklerdir (bit.ly gibi): nereye gittiğini görmek istersen kısa linki sunucuya göndermek için ayrıca onay isteriz.",
        ],
      },
      {
        q: "Puan neyi gösterir?",
        a: [
          "0 ile 100 arasında bir risk puanıdır; yükseldikçe risk artar. 0–39 “Güvenli görünüyor”, 40–69 “Dikkatli ol”, 70 ve üstü “Tehlikeli” demektir.",
          "Puan; adresin bilinen tehdit listelerinde olup olmadığına, dolandırıcılık sitelerinin adlarına ne kadar benzediğine, sitenin ne zamandır var olduğuna ve tanınmış bir site olup olmadığına göre hesaplanır.",
        ],
      },
      {
        q: "“Güvenli görünüyor” demek kesin güvenli demek mi?",
        a: [
          "Hayır. Yalnızca bilinen bir tehlike işareti bulmadığımız anlamına gelir.",
          "Yeni açılmış bir dolandırıcılık sitesi henüz hiçbir listede olmayabilir; güvenilir bir site de ele geçirilmiş olabilir. Şifre, kart ya da TC kimlik bilgisi girmeden önce adres çubuğundaki adresin doğru olduğundan emin ol. Hiçbir araç %100 garanti veremez.",
        ],
      },
      {
        q: "Eklenti neleri görüyor, neleri gönderiyor?",
        a: [
          "Eklenti, açtığın sitelerin yalnızca alan adını kontrol eder. Tanınmış ve resmi sitelerde sunucuya hiç sormaz; bilinen dolandırıcılık sitelerini de kendi içindeki listeyle tanır.",
          "Form koruması yazdıklarını okumaz ve göndermez; yalnızca yazılanın bir şifre, kart numarası ya da TC kimlik numarası olup olmadığına cihazında bakar.",
        ],
      },
      {
        q: "HookGuard'da kısa linkler nasıl çalışır?",
        a: [
          "Kısa linkler sayfasında bir kısa linkin tıklamadan nereye gittiğini görebilir ya da uzun bir linki güvenle kısaltabilirsin.",
          "Kısaltmadan önce linkin nereye gittiğine bakar, tehlikeli olanları kısaltmayız. HookGuard kısa linkini açan kişi önce gideceği sitenin güvenlik özetini görür.",
        ],
      },
      {
        q: "Bildirdiğim sitelere ne oluyor?",
        a: [
          "Her bildirim incelenir. Onaylanan siteler listeye eklenir ve diğer kullanıcılar da korunur.",
          "Bildirim yaparken kim olduğun kaydedilmez; yalnızca adres, seçtiğin tür ve varsa notun saklanır.",
        ],
      },
      {
        q: "Aile modu nedir?",
        a: [
          "Eklentinin ayarlarından bahis ve yetişkin içerikli siteleri bir PIN ile kilitleyebilirsin. Kilitli bir siteye girilmek istendiğinde PIN sorulur.",
          "Not: Eklenti kaldırılırsa kilit de kalkar. Küçük çocuklar için bilgisayardaki çocuk hesabı ayarlarıyla birlikte kullan.",
        ],
      },
    ],
  },
};

export function Faq() {
  const t = TEXT[useLang()];
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="hg-container faq">
        <Reveal className="section__head">
          <h2 id="faq-title">{t.title}</h2>
        </Reveal>
        <div className="hg-card faq__list">
          {t.items.map(({ q, a }) => (
            <details key={q} className="hg-disclosure">
              <summary>
                {q}
                <IconChevron aria-hidden="true" />
              </summary>
              <div className="hg-disclosure__body faq__answer">
                {a.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
