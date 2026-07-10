# Fiyatla

Fiyatla, kullanıcıların bir tutarı istediği para birimine anında çevirmesini, bir ürünü barkod tarayarak ya da adıyla arayıp yurt dışı fiyatlarıyla karşılaştırmasını ve ürünleri hedef fiyat belirleyip takip listesine eklemesini sağlayan bir Android (Capacitor) uygulamasıdır. Türkçe, İngilizce, Almanca, Japonca ve Çince dil desteği vardır.

## Öne çıkan özellikler

- **Kur çevirici**: Frankfurter API'sinden canlı kurlarla anlık çeviri, son 7 günün mini grafiği (sparkline).
- **Ürün tarama**: Kamerayla barkod okuma ya da ürün adıyla arama (Open Food Facts + UPCitemDB).
- **Fiyat takibi**: Hedef fiyat belirleyip ürünleri takip listesine ekleme; günlük arka plan kontrolü (`@capacitor/background-runner`) ve anlık "Şimdi Kontrol Et" butonu ile gerçek fiyat verisi kontrolü (Claude'un web arama aracını kullanan kendi Vercel/Anthropic backend'imiz üzerinden - bkz. [AI fiyat arama backend'i](#ai-fiyat-arama-backendi)).
- **Yedekleme**: Takip listesi ve arama geçmişini panoya kopyalayarak ya da dosya olarak paylaşarak yedekleme/geri yükleme.
- **Bildirimler, reklamlar, analitik**: `@capacitor/local-notifications`, `@capacitor-community/admob`, `@capacitor-firebase/analytics` ve `@capacitor-firebase/crashlytics` entegrasyonu.

## Teknoloji

- **[Capacitor](https://capacitorjs.com/)** — tek sayfalık `www/index.html` içinde HTML/CSS/JS olarak yazılmış arayüz, Android WebView içinde çalışır (henüz iOS hedeflenmiyor).
- Derleme aracı yok, build adımı yok — `www/index.html` doğrudan tarayıcı/WebView tarafından yorumlanır.
- Test için [Playwright](https://playwright.dev/) (bkz. [Test Çalıştırma](#test-çalıştırma)).

## Proje yapısı

```
www/index.html          Uygulamanın tamamı (HTML + CSS + JS, tek dosya)
www/runners/pricecheck.js   Arka plan fiyat kontrolü gorevi (@capacitor/background-runner)
api/price-lookup.js     Vercel serverless function - Claude web search ile gerçek fiyat arama
android/                Native Android projesi (Capacitor tarafından yönetilir)
tests/                  Playwright regresyon testleri (bkz. aşağısı)
privacy.html, terms.html   Gizlilik politikası / kullanım şartları (Play Store listing için)
capacitor.config.json    Capacitor yapılandırması (appId, plugin ayarları)
.github/workflows/build.yml   CI: testler + debug/release APK + AAB derlemesi
```

## AI fiyat arama backend'i

Gerçek fiyat verisi UPCitemDB gibi üçüncü taraf bir fiyat API'sinden değil, kendi Vercel üzerinde barındırdığımız bir serverless function'dan (`api/price-lookup.js`) geliyor. Bu fonksiyon, Anthropic'in Claude modelini **kendi web arama (web search) aracıyla** çağırıyor - ürün adı/markasıyla güncel, gerçek satış fiyatı tekliflerini arıyor ve sonucu yapılandırılmış JSON olarak (`output_config.format` ile şemaya zorlanmış) döndürüyor. Başka bir scraping servisi ya da üçüncü taraf fiyat API'si kullanılmıyor.

Uygulama tarafında `www/index.html` içindeki `fetchRealOffers(name, brand, code)`, `PRICE_LOOKUP_API_URL` sabitinde tanımlı bu endpoint'e `{ name, brand, code }` gövdesiyle POST isteği atıyor (native platformda CORS/WebView kısıtlamalarını aşmak için `CapacitorHttp`, düz webde `fetch()` kullanılıyor - bkz. `nativePost`).

### Vercel'de kurulum

1. Vercel panelinde bu repoyu (GitHub bağlantısıyla) bir proje olarak içe aktar - `/api` klasörü otomatik olarak serverless function'lara dönüştürülür, ekstra yapılandırma gerekmez.
2. Proje ayarlarında **Environment Variables** altında şunları ekle:

   | Ortam değişkeni | Açıklama |
   |---|---|
   | `ANTHROPIC_API_KEY` | Anthropic API anahtarı. **Asla repoya commit edilmemeli** - sadece Vercel panelinden elle girilir. |
   | `APP_SHARED_SECRET` | (Opsiyonel ama önerilir) Herkese açık bu endpoint'in internetteki rastgele isteklerle kötüye kullanılmasını (ve Anthropic faturasının şişmesini) engellemek için hafif bir paylaşılan sır. Ayarlarsan, `www/index.html` içindeki `PRICE_LOOKUP_APP_SECRET` sabitine de aynı değeri yazman gerekir. |

3. Deploy tamamlandıktan sonra Vercel'in verdiği gerçek alan adını (`Domains` sekmesi, varsayılan olarak `<proje-adı>.vercel.app`) `www/index.html` içindeki `PRICE_LOOKUP_API_URL` sabitiyle eşleştiğinden emin ol - farklıysa güncelle.

`ANTHROPIC_API_KEY` client tarafına (Android APK'ya) hiçbir şekilde gömülmez; sadece bu sunucu tarafı fonksiyon içinde `process.env` üzerinden okunur.

## Geliştirme ortamı kurulumu

Gereksinimler: Node.js 22, JDK 21, Android SDK (Android Studio ile birlikte gelir).

```bash
npm install
npx cap sync android
```

`www/index.html` üzerinde değişiklik yaptıktan sonra, uygulamayı gerçek bir cihaz/emülatörde görmek için:

```bash
npx cap sync android
npx cap open android   # Android Studio'da açar, oradan çalıştırabilirsin
```

Hızlı önizleme için `www/index.html` dosyasını doğrudan bir masaüstü tarayıcısında da açabilirsin (kamera/bildirim gibi native özellikler çalışmaz, ama arayüz/mantık büyük ölçüde test edilebilir).

## Test çalıştırma

```bash
npm test
```

Bu, `tests/` altındaki Playwright tabanlı regresyon testlerini (`tests/run-all.js` üzerinden) çalıştırır — güvenlik (XSS) düzeltmeleri, veri bütünlüğü/kurtarma mantığı, para birimi/arama davranışı ve genel UI/UX regresyonlarını kapsar. Yerel makinende Playwright'ın Chromium'unu henüz indirmediysen önce:

```bash
npx playwright install chromium
```

CI (`.github/workflows/build.yml`) her push'ta bu testleri, Android build adımlarından önce çalıştırır.

## Release build (imzalı APK/AAB)

Release derlemesi (`android/app/build.gradle`'daki `signingConfigs.release`), aşağıdaki ortam değişkenlerini bekler — bunlar **asla repoya commit edilmemeli**, CI'da GitHub encrypted secrets olarak saklanır:

| Ortam değişkeni | Açıklama |
|---|---|
| `KEYSTORE_PATH` | Keystore dosyasının yolu |
| `KEYSTORE_PASSWORD` | Keystore parolası |
| `KEY_ALIAS` | Anahtar alias'ı |
| `KEY_PASSWORD` | Anahtar parolası |

Yerel olarak release build almak istersen, kendi keystore'unu oluşturup (`keytool -genkeypair ...`) bu değişkenleri kendi ortamında tanımlaman gerekir — repoya asla gerçek bir `.jks` dosyası ya da parola eklenmemeli (bkz. `.gitignore`).

## Dil desteği

Tüm kullanıcı arayüzü metinleri `www/index.html` içindeki `TRANSLATIONS` / `TRANSLATIONS_FN` objelerinde, `tr` (Türkçe, varsayılan), `en`, `de`, `ja`, `zh` anahtarlarıyla tutulur. Yeni bir metin eklerken tüm dillere karşılık gelen bir çeviri eklemek gerekir.
