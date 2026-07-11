# Fiyatla

Fiyatla, kullanıcıların bir tutarı istediği para birimine anında çevirmesini, bir ürünü barkod tarayarak ya da adıyla arayıp yurt dışı fiyatlarıyla karşılaştırmasını ve ürünleri hedef fiyat belirleyip takip listesine eklemesini sağlayan bir Android (Capacitor) uygulamasıdır. Türkçe, İngilizce, Almanca, Japonca ve Çince dil desteği vardır.

## Öne çıkan özellikler

- **Kur çevirici**: Frankfurter API'sinden canlı kurlarla anlık çeviri, son 7 günün mini grafiği (sparkline).
- **Ürün tarama**: Kamerayla barkod okuma ya da ürün adıyla arama (Open Food Facts + UPCitemDB).
- **Fiyat takibi**: Hedef fiyat belirleyip ürünleri takip listesine ekleme; günlük arka plan kontrolü (`@capacitor/background-runner`) ve anlık "Şimdi Kontrol Et" butonu ile gerçek fiyat verisi kontrolü (ayrı, private bir backend üzerinden - bkz. [Fiyat arama backend'i](#fiyat-arama-backendi)).
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
android/                Native Android projesi (Capacitor tarafından yönetilir)
tests/                  Playwright regresyon testleri (bkz. aşağısı)
privacy.html, terms.html   Gizlilik politikası / kullanım şartları (Play Store listing için)
capacitor.config.json    Capacitor yapılandırması (appId, plugin ayarları)
.github/workflows/build.yml   CI: testler + debug/release APK + AAB derlemesi
```

## Fiyat arama backend'i

Gerçek fiyat verisi UPCitemDB gibi üçüncü taraf bir fiyat API'sinden değil, ayrı ve **private** tutulan [`fiyatla-backend`](https://github.com/hudayid0/fiyatla-backend) reposundan geliyor. Backend'in iç mantığı (kullandığı model, prompt, JSON şeması) bilinçli olarak bu (public) repoda yer almıyor - burada sadece istemci tarafındaki entegrasyon kodu var.

Uygulama tarafında `www/index.html` içindeki `fetchRealOffers(name, brand, code)`, `PRICE_LOOKUP_API_URL` sabitinde tanımlı backend endpoint'ine `{ name, brand, code }` gövdesiyle POST isteği atıyor (native platformda CORS/WebView kısıtlamalarını aşmak için `CapacitorHttp`, düz webde `fetch()` kullanılıyor - bkz. `nativePost`). Backend'in kendisi (kurulum adımları, ortam değişkenleri, Vercel deploy talimatları dahil) `fiyatla-backend` reposunda belgeleniyor.

`PRICE_LOOKUP_API_URL` `www/index.html` içinde doğrudan tanımlı (backend'in gerçek Vercel alan adı). `APP_SHARED_SECRET` ise - keystore parolası gibi - **asla bu repoya commit edilmez**: `www/index.html`, sayfa yüklenirken `www/local-config.js` (gitignore'da) içindeki `window.FIYATLA_APP_SECRET` değerini okur.

Yerel kurulum:
```bash
cp www/local-config.example.js www/local-config.js
# www/local-config.js içindeki FIYATLA_APP_SECRET'ı, fiyatla-backend'de
# Vercel panelinde tanımladığın APP_SHARED_SECRET ile aynı değere ayarla.
```
`www/local-config.js` yoksa (fresh checkout, CI) uygulama sorunsuz çalışmaya devam eder, sadece bu secret boş kalır ve backend isteğe `X-App-Secret` header'ı eklenmez. Android derlemesi için bu dosyanın `npx cap sync android` çalıştırılmadan önce `www/` içinde gerçek değerle var olması gerekir (webDir `www` olduğu için build'e otomatik dahil olur).

Anthropic API anahtarı bu repoya hiçbir zaman girmez; o sadece `fiyatla-backend`'in kendi sunucu tarafı kodunda `process.env` üzerinden okunur.

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
