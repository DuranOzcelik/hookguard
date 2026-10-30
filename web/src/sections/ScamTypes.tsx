import { useLang } from "@shared/ui/i18n";
import { IconCard, IconCart, IconCasino, IconDocument, IconGift, IconGraph, IconParcel, IconVirus } from "@shared/ui/icons";

import { Reveal } from "./Reveal";

const ICONS = [IconParcel, IconDocument, IconCard, IconGift, IconGraph, IconCasino, IconCart, IconVirus];

type Type = { title: string; looks: string; watch: string[] };

const TEXT: Record<"en" | "tr", { title: string; lead: string; looks: string; watch: string; types: Type[] }> = {
  en: {
    title: "Common scams in Turkey",
    lead: "The messages look different, but the aim is always the same: to rush you into giving away details or money.",
    looks: "What it looks like",
    watch: "What to watch for",
    types: [
      {
        title: "Fake parcel SMS",
        looks: "“Your parcel could not be delivered because of a missing address. Tap to update your address: …”",
        watch: ["Couriers never ask for a fee or card details to update an address.", "Track your parcel in the courier's own app or website."],
      },
      {
        title: "e-Devlet and tax refunds",
        looks: "“A tax refund of 1,250 TL has been issued to you. Log in with your e-Devlet details to receive it: …”",
        watch: ["Government offices never send refund links by SMS.", "e-Devlet's only address is turkiye.gov.tr; a “refund” page asking for card details is fake."],
      },
      {
        title: "“Your bank account is suspended”",
        looks: "“Your account has been suspended for security reasons. Verify your details to reopen it: …”",
        watch: ["Banks never ask for a password, card details or a code by SMS.", "Open your bank's app yourself; if in doubt, call the number on the back of your card."],
      },
      {
        title: "Prize draws and campaigns",
        looks: "“Congratulations! You won a phone in our supermarket draw. Just pay the 29 TL shipping fee: …”",
        watch: ["You cannot win a draw you never entered.", "“Just pay the shipping” campaigns are there to steal your card details."],
      },
      {
        title: "Fake investment and crypto",
        looks: "“Earn 5% a day with the platform a famous businessman recommends! Sign up now: …”",
        watch: ["Promises of guaranteed, high returns are a sign of fraud.", "If you are told to “pay a fee first to withdraw your earnings”, pay nothing."],
      },
      {
        title: "Illegal betting",
        looks: "“500 TL trial bonus! Our new login address: …”",
        watch: ["Unlicensed betting sites are illegal; their addresses change as they are blocked.", "You may never get your money back. For support: Yeşilay 115."],
      },
      {
        title: "Fake shops",
        looks: "“80% off everything, last 3 hours! Payment by bank transfer only.”",
        watch: ["Very new shops with no contact details are usually fake.", "Legal Turkish shops show the ETBİS logo; do not trust shops that only take bank transfers."],
      },
      {
        title: "Fake virus warnings",
        looks: "“WARNING! 5 viruses found on your computer. Call the support line now: 0850 …”",
        watch: ["Virus warnings that appear in your browser are fake; your computer has no virus.", "Do not call, install nothing and give no one remote access."],
      },
    ],
  },
  tr: {
    title: "Türkiye'de sık görülen dolandırıcılık türleri",
    lead: "Mesajlar farklı görünse de amaç hep aynı: seni acele ettirip bilgi ya da para almak.",
    looks: "Nasıl görünür?",
    watch: "Neye dikkat etmeli?",
    types: [
      {
        title: "Sahte kargo SMS'i",
        looks: "“Kargonuz adres eksikliği nedeniyle teslim edilemedi. Adresinizi güncellemek için tıklayın: …”",
        watch: ["Kargo firmaları adres güncellemek için ücret ya da kart bilgisi istemez.", "Takip numarasını firmanın kendi uygulamasında ya da sitesinde sorgula."],
      },
      {
        title: "e-Devlet ve vergi iadesi",
        looks: "“Adınıza 1.250 TL vergi iadesi tanımlanmıştır. Almak için e-Devlet bilgilerinizle giriş yapın: …”",
        watch: ["Devlet kurumları iade için SMS'le link göndermez.", "e-Devlet'in tek adresi turkiye.gov.tr'dir; kart bilgisi isteyen “iade” sayfası sahtedir."],
      },
      {
        title: "“Banka hesabınız askıya alındı”",
        looks: "“Hesabınız güvenlik nedeniyle askıya alınmıştır. Yeniden açmak için bilgilerinizi doğrulayın: …”",
        watch: ["Bankalar SMS'le şifre, kart bilgisi ya da onay kodu istemez.", "Bankanın uygulamasını kendin aç; şüphedeysen kartının arkasındaki numarayı ara."],
      },
      {
        title: "Çekiliş ve kampanya",
        looks: "“Tebrikler! Market çekilişinde telefon kazandınız. Yalnızca 29 TL kargo ücretini ödeyin: …”",
        watch: ["Katılmadığın bir çekilişi kazanamazsın.", "“Sadece kargo ücreti” isteyen kampanyalar kart bilgini çalmak içindir."],
      },
      {
        title: "Sahte yatırım ve kripto",
        looks: "“Ünlü iş insanının önerdiği platformla günde %5 kazanç! Hemen kaydolun: …”",
        watch: ["Garantili ve yüksek kazanç vaadi dolandırıcılık işaretidir.", "“Kazancını çekmek için önce ücret öde” denirse hiçbir şey ödeme."],
      },
      {
        title: "Yasadışı bahis",
        looks: "“Deneme bonusu 500 TL! Güncel giriş adresimiz: …”",
        watch: ["İzinsiz bahis siteleri yasa dışıdır; adresleri kapatıldıkça değişir.", "Yatırdığın parayı geri alamayabilirsin. Destek için Yeşilay 115."],
      },
      {
        title: "Sahte alışveriş sitesi",
        looks: "“Tüm ürünlerde %80 indirim, son 3 saat! Ödeme yalnızca havale ile.”",
        watch: ["Çok yeni açılmış, iletişim bilgisi vermeyen siteler genellikle sahtedir.", "Yasal sitelerde ETBİS logosu bulunur; havale ile ödeme isteyene güvenme."],
      },
      {
        title: "Sahte virüs uyarısı",
        looks: "“UYARI! Bilgisayarınızda 5 virüs bulundu. Hemen destek hattını arayın: 0850 …”",
        watch: ["Tarayıcıda çıkan virüs uyarıları sahtedir; bilgisayarında virüs yok.", "Numarayı arama, program yükleme, kimseye uzaktan erişim verme."],
      },
    ],
  },
};

export function ScamTypes() {
  const t = TEXT[useLang()];
  return (
    <section className="section" id="scam-types" aria-labelledby="types-title">
      <div className="hg-container">
        <Reveal className="section__head">
          <h2 id="types-title">{t.title}</h2>
          <p>{t.lead}</p>
        </Reveal>
        <ul className="types-grid">
          {t.types.map(({ title, looks, watch }, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal as="li" key={title} className="hg-card type-card" delay={(i % 2) * 0.06}>
                <div className="type-card__head">
                  <span className="hg-icon-tile">
                    <Icon aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                </div>
                <p className="type-card__label">{t.looks}</p>
                <blockquote className="type-card__quote">{looks}</blockquote>
                <p className="type-card__label">{t.watch}</p>
                <ul className="type-card__list">
                  {watch.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
