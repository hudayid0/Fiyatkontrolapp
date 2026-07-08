
const CURRENCIES = ['TRY','USD','GBP','EUR','JPY','CHF','CNY'];

const CURRENCY_NAMES = {
  TRY: {tr:'Türk Lirası', en:'Turkish Lira', ja:'トルコリラ', zh:'土耳其里拉'},
  USD: {tr:'ABD Doları', en:'US Dollar', ja:'米ドル', zh:'美元'},
  GBP: {tr:'İngiliz Sterlini', en:'British Pound', ja:'英ポンド', zh:'英镑'},
  EUR: {tr:'Euro', en:'Euro', ja:'ユーロ', zh:'欧元'},
  JPY: {tr:'Japon Yeni', en:'Japanese Yen', ja:'日本円', zh:'日元'},
  CHF: {tr:'İsviçre Frangı', en:'Swiss Franc', ja:'スイスフラン', zh:'瑞士法郎'},
  CNY: {tr:'Çin Yuanı', en:'Chinese Yuan', ja:'中国元', zh:'人民币'},
};
function ccyName(code){
  const n = CURRENCY_NAMES[code];
  return n ? (n[state.lang] || n.tr) : code;
}

const RATE_DATE = '2 Temmuz 2026';
const RATES_TO_EUR = {
  EUR: 1,
  USD: 0.8773,
  GBP: 1.1673,
  JPY: 0.005403,
  CHF: 1.0870,
  TRY: 0.018778,
  CNY: 0.1288,
};

let ratesLive = false;
let ratesFromCache = false;
let ratesLastUpdated = null;

const RATES_CACHE_KEY = 'fiyatla_last_live_rates';

function saveRatesToCache(){
  try{
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({
      rates: RATES_TO_EUR,
      timestamp: new Date().toISOString(),
    }));
  }catch(e){}
}

function loadRatesFromCache(){
  try{
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

async function fetchLiveRates(){
  try{
    const res = await fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=USD,GBP,JPY,CHF,TRY,CNY');
    if(!res.ok) throw new Error('API hatasi');
    const data = await res.json();
    const rates = data.rates;
    for(const code of Object.keys(rates)){
      if(rates[code] > 0){
        RATES_TO_EUR[code] = 1 / rates[code];
      }
    }
    ratesLive = true;
    ratesFromCache = false;
    ratesLastUpdated = new Date();
    saveRatesToCache();
  }catch(e){
    ratesLive = false;
    window.lastRateError = e.message;
    const cached = loadRatesFromCache();
    if(cached){
      for(const code of Object.keys(cached.rates)){
        RATES_TO_EUR[code] = cached.rates[code];
      }
      ratesFromCache = true;
      ratesLastUpdated = new Date(cached.timestamp);
    }else{
      ratesFromCache = false;
    }
    console.log('Canli kur alinamadi:', e.message);
  }
  render();
}

function rateStatusLabel(){
  if(ratesLive && ratesLastUpdated){
    const hh = String(ratesLastUpdated.getHours()).padStart(2,'0');
    const mm = String(ratesLastUpdated.getMinutes()).padStart(2,'0');
    const labels = {
      tr: `Canlı kur · saat ${hh}:${mm} itibarıyla`,
      en: `Live rate · as of ${hh}:${mm}`,
      ja: `ライブレート · ${hh}:${mm}時点`,
      zh: `实时汇率 · 截至 ${hh}:${mm}`,
    };
    return labels[state.lang] || labels.tr;
  }
  if(ratesFromCache && ratesLastUpdated){
    const dd = String(ratesLastUpdated.getDate()).padStart(2,'0');
    const mo = String(ratesLastUpdated.getMonth()+1).padStart(2,'0');
    const hh = String(ratesLastUpdated.getHours()).padStart(2,'0');
    const mm = String(ratesLastUpdated.getMinutes()).padStart(2,'0');
    const labelsCache = {
      tr: `Bağlantı yok · son kur: ${dd}.${mo} ${hh}:${mm}`,
      en: `Offline · last rate: ${dd}.${mo} ${hh}:${mm}`,
      ja: `オフライン · 最終レート: ${dd}.${mo} ${hh}:${mm}`,
      zh: `离线 · 最后汇率: ${dd}.${mo} ${hh}:${mm}`,
    };
    return labelsCache[state.lang] || labelsCache.tr;
  }
  const labels2 = {
    tr: `Sabit kur (bağlantı yok) · ${RATE_DATE}`,
    en: `Fixed rate (offline) · ${RATE_DATE}`,
    ja: `固定レート(オフライン) · ${RATE_DATE}`,
    zh: `固定汇率(离线) · ${RATE_DATE}`,
  };
  return labels2[state.lang] || labels2.tr;
}

function convertAmount(amount, fromCode, toCode){
  const eurValue = amount * RATES_TO_EUR[fromCode];
  return eurValue / RATES_TO_EUR[toCode];
}
function crossRate(fromCode, toCode){
  return RATES_TO_EUR[fromCode] / RATES_TO_EUR[toCode];
}

const LANG_TO_CCY = { tr:'TRY', en:'USD', ja:'JPY', zh:'CNY', de:'EUR' };

const TRANSLATIONS = {
  eyebrowHome: {de:'Kurs & Preischeck', tr:'Kur & Fiyat Kontrol', en:'Currency & Price Check', ja:'為替・価格チェック', zh:'汇率与价格查询'},
  homeTitle: {de:'Wie viel kostet es im Ausland?', tr:'Yurtdışında ne kadar tutuyor?', en:'How much is it abroad?', ja:'海外ではいくら?', zh:'国外价格是多少?'},
  homeSub: {de:'Wandle deinen Preis sofort in jede Waehrung um, oder scanne ein Produkt, um Preise im Ausland zu vergleichen.', tr:'Elindeki fiyatı istediğin para birimine anında çevir, ya da ürünü tarat, yurtdışı fiyatlarla karşılaştır.', en:'Instantly convert your price to any currency, or scan a product to compare foreign prices.', ja:'価格を好きな通貨に即座に変換するか、商品をスキャンして海外価格と比較します。', zh:'立即将价格转换为任意货币,或扫描商品与国外价格比较。'},
  card1Num: {de:'01 SCHNELLER UMRECHNER', tr:'01 · HIZLI ÇEVİRİCİ', en:'01 · QUICK CONVERTER', ja:'01・クイック変換', zh:'01・快速换算'},
  card1Title: {de:'Preis eingeben, Kurs sehen', tr:'Fiyat gir, kuru gör', en:'Enter price, see rate', ja:'価格を入力', zh:'输入价格'},
  card1Desc: {de:'Waehle einen Betrag und zwei Waehrungen, berechne den Gegenwert mit dem aktuellen Kurs.', tr:'Bir tutar ve iki para birimi seç, anlık kur ile karşılığını hesapla.', en:'Choose an amount and two currencies, calculate the live conversion instantly.', ja:'金額と2つの通貨を選択し、即座に換算します。', zh:'选择金额和两种货币,即时计算换算结果。'},
  card2Num: {de:'02 PRODUKTSCAN', tr:'02 · ÜRÜN TARAMA', en:'02 · PRODUCT SCAN', ja:'02・商品スキャン', zh:'02・商品扫描'},
  card2Title: {de:'Barcode scannen, vergleichen', tr:'Barkodu tara, karşılaştır', en:'Scan barcode, compare', ja:'バーコードをスキャン', zh:'扫描条码'},
  card2Desc: {de:'Scanne den Barcode mit der Kamera, erkenne das Produkt und vergleiche es mit Auslandspreisen.', tr:'Kamerayla barkodu oku, ürünü tanı ve yurtdışı fiyatlarıyla karşılaştır.', en:'Read the barcode with your camera and compare foreign prices.', ja:'カメラでバーコードを読み取り、海外価格と比較します。', zh:'用相机扫描条码并与国外价格比较。'},
  card3Num: {de:'03 MEINE WATCHLISTE', tr:'03 · TAKİP LİSTEM', en:'03 · MY WATCHLIST', ja:'03・ウォッチリスト', zh:'03・我的关注列表'},
  card3Title: {de:'Preiserinnerungen', tr:'🔔 Fiyat hatırlatıcıları', en:'🔔 Price reminders', ja:'🔔 価格リマインダー', zh:'🔔 价格提醒'},
  card3Desc: {de:'Erhalte eine taegliche Erinnerung, deine verfolgten Produkte erneut zu pruefen.', tr:"Takip ettiğin ürünler için günlük 'tekrar kontrol et' hatırlatması al.", en:"Get a daily 'check again' reminder for products you track.", ja:'追跡商品について毎日「再確認」リマインダーを受け取ります。', zh:'为您关注的商品每天接收"重新检查"提醒。'},
  footerHome: {de:'Demo-Prototyp - echte Daten stammen teilweise aus Live-APIs', tr:"demo prototip · gerçek veriler kısmi olarak canlı API'lerden gelir", en:'demo prototype · some data comes from live APIs', ja:'デモ・一部データはライブAPIより', zh:'演示原型・部分数据来自实时API'},

  back: {de:'Zurueck', tr:'← Geri', en:'← Back', ja:'← 戻る', zh:'← 返回'},
  convertEyebrow: {de:'SCHNELLER UMRECHNER', tr:'01 · Hızlı Çevirici', en:'01 · Quick Converter', ja:'01・クイック変換', zh:'01・快速换算'},
  convertTitle: {de:'Preis umrechnen', tr:'Fiyat çevir', en:'Convert price', ja:'価格を変換', zh:'转换价格'},
  amountLabel: {de:'Betrag', tr:'Tutar', en:'Amount', ja:'金額', zh:'金额'},
  fromLabel: {de:'Von', tr:'Kimden', en:'From', ja:'から', zh:'从'},
  toLabel: {de:'Zu', tr:'Kime', en:'To', ja:'へ', zh:'到'},
  convertBtn: {de:'Umrechnen', tr:'Çevir', en:'Convert', ja:'変換', zh:'转换'},
  footerConvert: {de:'Kurse basieren auf EZB-Referenzdaten', tr:'Kurlar ECB referans verilerine göre sabitlenmiştir', en:'Rates fixed per ECB reference data', ja:'レートはECB基準で固定', zh:'汇率根据欧洲央行参考数据固定'},

  scanEyebrow: {de:'PRODUKTSCAN', tr:'02 · Ürün Tarama', en:'02 · Product Scan', ja:'02・商品スキャン', zh:'02・商品扫描'},
  scanTitle: {de:'Produkt finden', tr:'Ürünü bul', en:'Find the product', ja:'商品を検索', zh:'查找商品'},
  scanSub: {de:'Scanne einen Barcode oder suche nach dem Produktnamen.', tr:'Kamera izni ver, barkod numarasını gir ya da ürün adıyla ara.', en:'Grant camera access, enter a barcode, or search by name.', ja:'カメラ許可、バーコード入力、または名前で検索。', zh:'授予相机权限,输入条码,或按名称搜索。'},
  camOpenBtn: {de:'Kamera oeffnen', tr:'Kamerayı Aç', en:'Open Camera', ja:'カメラを開く', zh:'打开相机'},
  orManual: {de:'oder manuell eingeben', tr:'veya elle gir', en:'or enter manually', ja:'または手動入力', zh:'或手动输入'},
  tabBarcode: {de:'Barcode', tr:'Barkod', en:'Barcode', ja:'バーコード', zh:'条码'},
  tabName: {de:'Produktname', tr:'Ürün Adı', en:'Product Name', ja:'商品名', zh:'商品名称'},
  findProductBtn: {de:'Produkt finden', tr:'Ürünü Bul', en:'Find Product', ja:'検索', zh:'查找商品'},
  searchBtn: {de:'Suchen', tr:'Ara', en:'Search', ja:'検索', zh:'搜索'},
  recentSearches: {de:'Letzte Suchen', tr:'Son aramalar', en:'Recent searches', ja:'最近の検索', zh:'最近搜索'},
  footerScan: {de:'Produktdaten stammen von Open Food Facts und UPCitemdb', tr:'Ürün verisi: Open Food Facts', en:'Product data: Open Food Facts', ja:'商品データ: Open Food Facts', zh:'商品数据: Open Food Facts'},

  trackingEyebrow: {de:'Preisverfolgung', tr:'03 · Takip Listem', en:'03 · My Watchlist', ja:'03・ウォッチリスト', zh:'03・我的关注列表'},
  trackingTitle: {de:'Meine Watchliste', tr:'🔔 Fiyat hatırlatıcıları', en:'🔔 Price reminders', ja:'🔔 価格リマインダー', zh:'🔔 价格提醒'},
  trackingSub: {de:'Regelmaessige Erinnerungsbenachrichtigungen fuer verfolgte Produkte.', tr:'Takip ettiğin ürünler için düzenli aralıklarla hatırlatma bildirimi gönderilir.', en:'You get reminder notifications at regular intervals for tracked products.', ja:'追跡商品について定期的にリマインダー通知が送られます。', zh:'系统会定期为您关注的商品发送提醒通知。'},
  trackEmpty: {de:'Du verfolgst noch keine Produkte.', tr:'Henüz takip ettiğin bir ürün yok.', en:'No tracked products yet.', ja:'まだ追跡中の商品はありません。', zh:'暂无关注的商品。'},
  dropBtn: {de:'Entfernen', tr:'Bırak', en:'Remove', ja:'削除', zh:'移除'},
  footerTracking: {de:'Erinnerungen werden lokal auf deinem Geraet geplant', tr:'Bildirimler: Capacitor Local Notifications', en:'Notifications: Capacitor Local Notifications', ja:'通知: Capacitor Local Notifications', zh:'通知: Capacitor Local Notifications'},

  camStartHint: {de:'Tippe, um die Kamera zu starten', tr:'Kamerayı başlatmak için dokun', en:'Tap to start camera', ja:'タップしてカメラを起動', zh:'点击启动相机'},
  camOpenBtn2: {de:'Kamera oeffnen', tr:'Kamerayı Aç', en:'Open Camera', ja:'カメラを開く', zh:'打开相机'},
  camCloseBtn: {de:'Kamera schliessen', tr:'Kamerayı Kapat', en:'Close Camera', ja:'カメラを閉じる', zh:'关闭相机'},
  barcodeLabel: {de:'Barcode-Nummer', tr:'Barkod (EAN/UPC)', en:'Barcode (EAN/UPC)', ja:'バーコード (EAN/UPC)', zh:'条码 (EAN/UPC)'},
  barcodeHintDefault: {de:'Barcode eingeben oder scannen', tr:'8, 12, 13 ya da 14 haneli bir sayı olmalı.', en:'Must be 8, 12, 13, or 14 digits.', ja:'8、12、13、または14桁である必要があります。', zh:'必须为8、12、13或14位数字。'},
  barcodeHintValid: {de:'Gueltiges Barcode-Format', tr:'✓ Geçerli format', en:'✓ Valid format', ja:'✓ 有効な形式', zh:'✓ 格式有效'},
  productNameLabel: {de:'Produktname', tr:'Ürün adı', en:'Product name', ja:'商品名', zh:'商品名称'},
  enterBarcodeMsg: {de:'Bitte gib einen Barcode ein.', tr:'Bir barkod numarası gir.', en:'Enter a barcode number.', ja:'バーコード番号を入力してください。', zh:'请输入条码号。'},
  searchingProduct: {de:'Produkt wird gesucht...', tr:'Ürün aranıyor...', en:'Searching product...', ja:'商品を検索中...', zh:'正在搜索商品...'},
  barcodeNotFoundMsg: {de:'Produkt nicht gefunden.', tr:'Bu barkod veritabanında bulunamadı. Ürün adını biliyorsan "Ürün Adı" sekmesinden aramayı dene.', en:'This barcode was not found. If you know the product name, try the "Product Name" tab.', ja:'このバーコードは見つかりませんでした。商品名がわかる場合は「商品名」タブでお試しください。', zh:'未找到此条码。如果您知道商品名称,请尝试"商品名称"标签。'},
  enterProductNameMsg: {de:'Bitte gib einen Produktnamen ein.', tr:'Bir ürün adı gir.', en:'Enter a product name.', ja:'商品名を入力してください。', zh:'请输入商品名称。'},
  searchingText: {de:'Wird gesucht...', tr:'Aranıyor...', en:'Searching...', ja:'検索中...', zh:'搜索中...'},
  nameSearchUnstable: {de:'Die Namenssuche ist derzeit instabil. Bitte nutze den Barcode.', tr:'Ürün adıyla arama şu an güvenilir çalışmıyor. En sağlam yol: "Barkod" sekmesine geçip kamerayla veya elle barkod ile aramak.', en:'Name search is currently unreliable. Best option: switch to the "Barcode" tab and search by barcode instead.', ja:'名前検索は現在不安定です。「バーコード」タブでの検索をお勧めします。', zh:'名称搜索目前不稳定。建议切换到"条码"标签进行搜索。'},
  trackModalEyebrow: {de:'Preisverfolgung', tr:'🔔 Fiyat Takibi', en:'🔔 Price Tracking', ja:'🔔 価格追跡', zh:'🔔 价格追踪'},
  trackModalSub: {de:'Gib deinen Zielpreis ein (Euro) - du bekommst eine Erinnerung, wenn dieser Preis erreicht wird.', tr:'Hedef fiyatını gir (€) — bu fiyata ulaşınca hatırlatma alırsın.', en:'Enter your target price (€) — you will get a reminder when it is reached.', ja:'目標価格を入力してください(€)。到達するとリマインダーが届きます。', zh:'输入目标价格(€)——达到后您将收到提醒。'},
  trackVazgec: {de:'Abbrechen', tr:'Vazgeç', en:'Cancel', ja:'キャンセル', zh:'取消'},
  trackConfirm: {de:'Verfolgen', tr:'Takip Et', en:'Track', ja:'追跡する', zh:'追踪'},
  trackNoPermission: {de:'Benachrichtigungsberechtigung nicht erteilt.', tr:'Ürün takip listesine eklendi. Bildirim izni verilmediği için hatırlatma gönderilemeyecek.', en:'Product added to watchlist. Since notification permission was not granted, reminders cannot be sent.', ja:'商品はウォッチリストに追加されました。通知の許可がないためリマインダーは送信されません。', zh:'商品已加入关注列表。由于未授予通知权限,将无法发送提醒。'},
  adSponsored: {de:'GESPONSERT', tr:'SPONSORLU', en:'SPONSORED', ja:'スポンサー', zh:'赞助'},
  adPlaceholderText: {de:'Werbeplatzhalter', tr:'Reklam alanı — gerçek uygulamada AdMob banner burada görünür', en:'Ad space — a real AdMob banner appears here in the real app', ja:'広告スペース — 実際のアプリではここにAdMobバナーが表示されます', zh:'广告位——实际应用中此处会显示AdMob横幅'},
  compareStoreCountry: {de:'Geschaeft / Land', tr:'Mağaza / Ülke', en:'Store / Country', ja:'店舗・国', zh:'商店/国家'},
  comparePrice: {de:'Preis', tr:'Fiyat', en:'Price', ja:'価格', zh:'价格'},
  compareNote1: {de:'Diese Vergleichstabelle nutzt Beispiel-(simulierte) Daten. Fuer echte Preise muessten offizielle Store-APIs angebunden werden.', tr:'Not: Bu karşılaştırma tablosu örnek (simüle) verilerle çalışıyor. Gerçek fiyatlar için resmi mağaza API\'lerinin bağlanması gerekiyor.', en:'Note: This comparison table uses sample (simulated) data. Real prices require connecting official store APIs.', ja:'注: この比較表はサンプル(シミュレーション)データを使用しています。実際の価格には公式店舗APIの連携が必要です。', zh:'注:此比较表使用示例(模拟)数据。真实价格需要连接官方商店API。'},
  compareNote2: {de:'Preise koennen je nach Geschaeft variieren.', tr:'"Git" linkleri affiliate/ortaklık bağlantılarıdır — bir mağazadan alışveriş yaparsan küçük bir komisyon kazanabiliriz, senin ödediğin fiyatı değiştirmez.', en:'"Go" links are affiliate links — if you shop through a store we may earn a small commission, at no extra cost to you.', ja:'「移動」リンクはアフィリエイトリンクです。購入すると少額の手数料を得ることがありますが、あなたの支払額は変わりません。', zh:'"前往"链接为联盟链接——如果您通过商店购物,我们可能获得少量佣金,不会增加您的费用。'},
  goBtn: {de:'Los', tr:'Git', en:'Go', ja:'移動', zh:'前往'},
  galleryBtn: {de:'Aus Galerie waehlen', tr:'Galeriden Seç', en:'Choose from Gallery', ja:'ギャラリーから選択', zh:'从相册选择'},
  galleryNoBarcode: {tr:'Görselde barkod bulunamadı. Farklı bir fotoğraf dene ya da elle gir.', en:'No barcode found in the image. Try another photo or enter manually.', ja:'画像にバーコードが見つかりませんでした。別の写真を試すか手動で入力してください。', zh:'图片中未找到条码。请尝试其他照片或手动输入。'},
  galleryUnsupported: {de:'Dieses Geraet unterstuetzt das Scannen von Barcodes aus Bildern nicht.', tr:'Bu cihaz görselden barkod okumayı desteklemiyor.', en:'This device does not support scanning barcodes from images.', ja:'このデバイスは画像からのバーコード読み取りに対応していません。', zh:'此设备不支持从图片扫描条码。'},
  searchingWiderDb: {de:'Suche in weiteren Produktkategorien...', tr:'Diğer ürün kategorilerinde aranıyor...', en:'Searching other product categories...', ja:'他の商品カテゴリを検索中...', zh:'正在搜索其他商品类别...'},
  invalidBarcodeChecksum: {de:'Diese Barcode-Nummer scheint ungueltig zu sein.', tr:'Bu barkod numarası geçersiz görünüyor (kontrol basamağı tutmuyor). Numarayı kontrol et.', en:'This barcode number appears invalid (checksum mismatch). Please check the number.', ja:'このバーコード番号は無効のようです(チェックデジットが一致しません)。番号を確認してください。', zh:'此条码号似乎无效(校验位不匹配)。请检查号码。'},
  editBtn: {de:'Bearbeiten', tr:'Düzenle', en:'Edit', ja:'編集', zh:'编辑'},
  experimentalTag: {de:'Beta', tr:'Beta', en:'Beta', ja:'Beta', zh:'Beta'},
  sourceOff: {de:'Quelle: Open Food Facts', tr:'Kaynak: Open Food Facts', en:'Source: Open Food Facts', ja:'情報源: Open Food Facts', zh:'来源: Open Food Facts'},
  sourceUpc: {de:'Quelle: UPCitemdb (Community-Daten, ungeprueft)', tr:'Kaynak: UPCitemdb (topluluk verisi, doğrulanmamış)', en:'Source: UPCitemdb (community data, unverified)', ja:'情報源: UPCitemdb(コミュニティデータ、未検証)', zh:'来源: UPCitemdb(社区数据,未经验证)'},
  rateTitle: {de:'Gefaellt dir Fiyatla?', tr:'Fiyatla\'yı beğendin mi?', en:'Enjoying Fiyatla?', ja:'Fiyatlaを気に入りましたか?', zh:'喜欢Fiyatla吗?'},
  rateMessage: {de:'Wir wuerden uns ueber eine 5-Sterne-Bewertung im Play Store freuen.', tr:'Play Store\'da bize 5 yıldız verirsen çok mutlu oluruz — bu, uygulamanın daha fazla kişiye ulaşmasına yardımcı olur.', en:'We would love a 5-star rating on the Play Store — it helps the app reach more people.', ja:'Playストアで5つ星評価をいただけると嬉しいです。より多くの人に届く助けになります。', zh:'如果您能在Play商店给我们5星评价,我们将非常感激——这有助于让更多人发现这个应用。'},
  rateNowBtn: {de:'Jetzt bewerten', tr:'Değerlendir', en:'Rate now', ja:'評価する', zh:'立即评价'},
  rateLaterBtn: {de:'Vielleicht spaeter', tr:'Daha sonra', en:'Maybe later', ja:'後で', zh:'稍后'},
  rateNeverBtn: {de:'Nicht mehr fragen', tr:'Bir daha sorma', en:"Don't ask again", ja:'今後表示しない', zh:'不再询问'},
  themeToggleAria: {de:'Design wechseln', tr:'Tema değiştir', en:'Change theme', ja:'テーマを変更', zh:'切换主题'},
  ariaSwap: {de:'Waehrungsrichtung tauschen', tr:'Para birimlerinin yönünü değiştir', en:'Swap currency direction', ja:'通貨の方向を切り替え', zh:'切换货币方向'},
  onboardingTitle: {de:'Willkommen bei Fiyatla', tr:'Fiyatla\'ya hoş geldin', en:'Welcome to Fiyatla', ja:'Fiyatlaへようこそ', zh:'欢迎使用Fiyatla'},
  onboardingIntro: {de:'Hier sind drei Dinge, die du tun kannst:', tr:'Üç şeyi hızlıca yapabilirsin:', en:'Here are three things you can do:', ja:'できることは主に3つです:', zh:'您可以快速完成三件事:'},
  onboardingPoint1: {de:'Rechne sofort einen Betrag in jede Waehrung um', tr:'💱 Bir tutarı istediğin para birimine anında çevir', en:'💱 Instantly convert an amount to any currency', ja:'💱 金額を好きな通貨に即座に変換', zh:'💱 立即将金额转换为任意货币'},
  onboardingPoint2: {de:'Finde ein Produkt durch Scannen eines Barcodes oder Suche nach Namen', tr:'📷 Barkod tarayarak ya da ürün adıyla arayarak ürün bul', en:'📷 Find a product by scanning a barcode or searching by name', ja:'📷 バーコードをスキャンするか商品名で検索して商品を見つける', zh:'📷 通过扫描条码或按名称搜索来查找商品'},
  onboardingPoint3: {de:'Fuege Produkte zu deiner Watchliste hinzu und erhalte Erinnerungen', tr:'🔔 Beğendiğin ürünleri takip listene ekle, hatırlatma al', en:'🔔 Add products you like to your watchlist and get reminders', ja:'🔔 気に入った商品をウォッチリストに追加してリマインダーを受け取る', zh:'🔔 将您喜欢的商品添加到关注列表并接收提醒'},
  onboardingStartBtn: {de:'Los geht\'s', tr:'Başlayalım', en:"Let's go", ja:'始めましょう', zh:'开始使用'},
  updateAvailableMsg: {de:'Eine neue Version ist verfuegbar. Du kannst im Play Store aktualisieren.', tr:'Yeni bir sürüm mevcut. Play Store\'dan güncelleyebilirsin.', en:'A new version is available. You can update from the Play Store.', ja:'新しいバージョンが利用可能です。Playストアから更新できます。', zh:'有新版本可用。您可以从Play商店更新。'},
  updateDismissBtn: {de:'Schliessen', tr:'Kapat', en:'Dismiss', ja:'閉じる', zh:'关闭'},
  camPermissionDenied: {de:'Kamerazugriff wurde nicht gewaehrt. Aktiviere ihn in den Einstellungen oder gib den Barcode manuell ein.', tr:'Kamera izni verilmedi. Ayarlardan izin verebilir ya da barkodu elle girebilirsin.', en:'Camera permission was not granted. You can enable it in settings, or enter the barcode manually.', ja:'カメラの許可が拒否されました。設定で許可するか、バーコードを手動で入力してください。', zh:'未授予相机权限。您可以在设置中启用,或手动输入条码。'},
  camGenericError: {de:'Kamera konnte nicht aufgerufen werden. Du kannst den Barcode manuell eingeben.', tr:'Kameraya erişilemedi. Barkodu elle girebilirsin.', en:'Could not access the camera. You can enter the barcode manually.', ja:'カメラにアクセスできませんでした。バーコードを手動で入力できます。', zh:'无法访问相机。您可以手动输入条码。'},
  notifPermissionDenied: {de:'Benachrichtigungsberechtigung nicht erteilt. Das Produkt wurde zur Watchliste hinzugefuegt, aber du erhaeltst keine Erinnerungen.', tr:'Bildirim izni verilmedi. Ürünü takip listene ekledik ama hatırlatma alamayacaksın.', en:'Notification permission was not granted. The product was added to your watchlist, but you will not receive reminders.', ja:'通知の許可が拒否されました。商品はウォッチリストに追加されましたが、リマインダーは届きません。', zh:'未授予通知权限。商品已添加到您的关注列表,但您将不会收到提醒。'},
  refreshBtn: {de:'Aktualisieren', tr:'Yenile', en:'Refresh', ja:'更新', zh:'刷新'},
  exportBtn: {de:'Sichern', tr:'Yedekle', en:'Backup', ja:'バックアップ', zh:'备份'},
  importBtn: {de:'Wiederherstellen', tr:'Geri Yükle', en:'Restore', ja:'復元', zh:'恢复'},
  exportSuccess: {de:'Sicherung in die Zwischenablage kopiert.', tr:'Yedek panoya kopyalandı. İstediğin bir yere (not, e-posta) kaydedebilirsin.', en:'Backup copied to clipboard. You can save it anywhere (notes, email).', ja:'バックアップがクリップボードにコピーされました。', zh:'备份已复制到剪贴板。'},
  importPrompt: {de:'Fuege deinen Sicherungstext hier ein:', tr:'Yedek metnini buraya yapıştır:', en:'Paste your backup text here:', ja:'バックアップテキストをここに貼り付けてください:', zh:'请在此粘贴备份文本:'},
  importSuccess: {de:'Wiederherstellung erfolgreich.', tr:'Geri yükleme başarılı.', en:'Restore successful.', ja:'復元に成功しました。', zh:'恢复成功。'},
  importError: {de:'Ungueltiger Sicherungstext.', tr:'Geçersiz yedek metni.', en:'Invalid backup text.', ja:'無効なバックアップテキストです。', zh:'备份文本无效。'},
  settingsMenuLabel: {de:'Info', tr:'Bilgi', en:'Info', ja:'情報', zh:'信息'},
  settingsTitle: {de:'Info', tr:'Bilgi', en:'Info', ja:'情報', zh:'信息'},
  settingsSub: {de:'Datenschutz und ueber die App.', tr:'Gizlilik ve uygulama hakkında.', en:'Privacy and about the app.', ja:'プライバシーとアプリについて。', zh:'隐私和关于应用。'},
  privacyPolicyLink: {de:'Datenschutzerklaerung ansehen', tr:'Gizlilik Politikasını Görüntüle', en:'View Privacy Policy', ja:'プライバシーポリシーを見る', zh:'查看隐私政策'},
  managePrivacyBtn: {de:'Werbeeinstellungen verwalten', tr:'Reklam Tercihlerini Yönet', en:'Manage Ad Preferences', ja:'広告設定を管理', zh:'管理广告偏好'},
  contactLabel: {de:'Kontakt', tr:'İletişim', en:'Contact', ja:'お問い合わせ', zh:'联系我们'},
  batteryTipTitle: {de:'Erhaeltst du keine Erinnerungen?', tr:'🔋 Bildirimler gelmiyor mu?', en:'🔋 Not receiving reminders?', ja:'🔋 リマインダーが届きませんか?', zh:'🔋 未收到提醒?'},
  batteryTipBody: {de:'Auf manchen Telefonen (Xiaomi, Huawei, Samsung usw.) koennen Akkusparfunktionen Erinnerungen blockieren. Nimm Fiyatla in den Akku-Einstellungen von Einschraenkungen aus.', tr:'Bazı telefonlarda (Xiaomi, Huawei, Samsung vb.) pil tasarrufu ayarları hatırlatmaları engelleyebilir. Telefon Ayarları > Pil > Fiyatla\'ya gidip pil kısıtlamasını kaldırmanı öneririz.', en:'On some phones (Xiaomi, Huawei, Samsung, etc.) battery-saving settings may block reminders. We recommend going to Phone Settings > Battery > Fiyatla and removing battery restrictions.', ja:'一部の端末(Xiaomi、Huawei、Samsungなど)ではバッテリー節約設定によりリマインダーがブロックされることがあります。', zh:'在某些手机(小米、华为、三星等)上,省电设置可能会阻止提醒。建议前往手机设置>电池>Fiyatla并解除电池限制。'},
  shareBtn: {de:'Teilen', tr:'Paylaş', en:'Share', ja:'共有', zh:'分享'},
  termsLink: {de:'Nutzungsbedingungen ansehen', tr:'Kullanım Şartlarını Görüntüle', en:'View Terms of Service', ja:'利用規約を見る', zh:'查看服务条款'},
  feedbackBtn: {de:'Feedback senden', tr:'💬 Öneri / Hata Bildir', en:'💬 Send Feedback', ja:'💬 フィードバックを送る', zh:'💬 发送反馈'},
  clearDataBtn: {de:'Alle Daten loeschen', tr:'🗑️ Tüm Verileri Temizle', en:'🗑️ Clear All Data', ja:'🗑️ すべてのデータを削除', zh:'🗑️ 清除所有数据'},
  clearDataTitle: {de:'Bist du sicher?', tr:'Emin misin?', en:'Are you sure?', ja:'よろしいですか?', zh:'您确定吗?'},
  clearDataWarning: {de:'Deine Watchliste, dein Suchverlauf und alle Einstellungen werden dauerhaft geloescht. Dies kann nicht rueckgaengig gemacht werden.', tr:'Takip listen, arama geçmişin ve tüm tercihlerin kalıcı olarak silinecek. Bu işlem geri alınamaz.', en:'Your watchlist, search history, and all preferences will be permanently deleted. This cannot be undone.', ja:'ウォッチリスト、検索履歴、すべての設定が完全に削除されます。この操作は元に戻せません。', zh:'您的关注列表、搜索历史和所有偏好设置将被永久删除。此操作无法撤销。'},
  clearDataConfirmBtn: {de:'Ja, loeschen', tr:'Evet, Sil', en:'Yes, Delete', ja:'はい、削除します', zh:'是的,删除'},
  offlineMessage: {de:'Keine Internetverbindung. Manche Funktionen funktionieren moeglicherweise nicht.', tr:'📡 İnternet bağlantın yok. Bazı özellikler çalışmayabilir.', en:'📡 No internet connection. Some features may not work.', ja:'📡 インターネット接続がありません。一部の機能が動作しない場合があります。', zh:'📡 没有网络连接。某些功能可能无法使用。'},
  invalidAmountRange: {de:'Bitte gib einen gueltigen (positiven, angemessenen) Betrag ein.', tr:'Lütfen geçerli (pozitif ve makul büyüklükte) bir tutar gir.', en:'Please enter a valid (positive, reasonable) amount.', ja:'有効な(正の、妥当な範囲の)金額を入力してください。', zh:'请输入有效的(正数且合理范围内的)金额。'},
  hapticLabel: {de:'Haptisches Feedback', tr:'Dokunma Geri Bildirimi', en:'Haptic Feedback', ja:'触覚フィードバック', zh:'触觉反馈'},
  stateOn: {de:'An', tr:'Açık', en:'On', ja:'オン', zh:'开'},
  stateOff: {de:'Aus', tr:'Kapalı', en:'Off', ja:'オフ', zh:'关'},
};

const TRANSLATIONS_FN = {
  invalidBarcodeFormat: (len) => ({
    tr: `Geçersiz barkod formatı: ${len} hane girildi. Barkodlar genelde 8, 12, 13 ya da 14 hanelidir.`,
    en: `Invalid barcode format: ${len} digits entered. Barcodes are usually 8, 12, 13, or 14 digits.`,
    ja: `無効なバーコード形式: ${len}桁入力されました。通常は8、12、13、14桁です。`,
    zh: `条码格式无效:输入了${len}位。条码通常为8、12、13或14位。`,
  }),
  barcodeHintInvalid: (len) => ({
    tr: `${len} hane girildi — 8, 12, 13 ya da 14 hane olmalı.`,
    en: `${len} digits entered — must be 8, 12, 13, or 14.`,
    ja: `${len}桁入力されました — 8、12、13、14桁である必要があります。`,
    zh: `已输入${len}位——必须为8、12、13或14位。`,
  }),
  productFetchError: (msg) => ({
    tr: `Ürün bilgisi alınamadı: ${msg}`,
    en: `Could not fetch product info: ${msg}`,
    ja: `商品情報を取得できませんでした: ${msg}`,
    zh: `无法获取商品信息:${msg}`,
  }),
  noResultsFor: (query) => ({
    tr: `"${query}" için sonuç bulunamadı. Farklı bir arama terimi dene ya da barkod ile ara.`,
    en: `No results for "${query}". Try a different search term or search by barcode.`,
    ja: `「${query}」の結果が見つかりません。別の検索語かバーコードでお試しください。`,
    zh: `未找到"${query}"的结果。请尝试其他搜索词或使用条码搜索。`,
  }),
  trackScheduleError: (msg) => ({
    tr: `Ürün takip listesine eklendi ama bildirim planlanamadı: ${msg}`,
    en: `Product added to watchlist but reminder could not be scheduled: ${msg}`,
    ja: `商品は追加されましたが、リマインダーを設定できませんでした: ${msg}`,
    zh: `商品已添加但无法设置提醒:${msg}`,
  }),
  trackSuccess: (name) => ({
    tr: `"${name}" takip listesine eklendi. Her gün hatırlatma bildirimi alacaksın.`,
    en: `"${name}" added to your watchlist. You will get a daily reminder.`,
    ja: `「${name}」がウォッチリストに追加されました。毎日リマインダーが届きます。`,
    zh: `"${name}"已加入关注列表。您将每天收到提醒。`,
  }),
  compareMatch: (score) => ({
    tr: `%${score} eşleşme`,
    en: `${score}% match`,
    ja: `一致度 ${score}%`,
    zh: `匹配度 ${score}%`,
  }),
};

function td(key, ...args){
  const entry = TRANSLATIONS_FN[key];
  if(!entry) return key;
  const result = entry(...args);
  return result[state.lang] || result.tr;
}

function t(key){
  const entry = TRANSLATIONS[key];
  if(!entry) return key;
  return entry[state.lang] || entry.tr;
}

function setLanguage(lang){
  state.lang = lang;
  try{ localStorage.setItem('fiyatla_lang', lang); }catch(e){}
  document.documentElement.lang = lang;
  const defaultCcy = LANG_TO_CCY[lang];
  if(defaultCcy){
    state.fromCcy = defaultCcy;
    state.toCcy = defaultCcy === 'EUR' ? 'USD' : 'EUR';
  }
  render();
}

function renderLangBar(){
  const langs = [
    {code:'tr', flag:'🇹🇷', name:'Türkçe'},
    {code:'en', flag:'🇬🇧', name:'English'},
    {code:'de', flag:'🇩🇪', name:'Deutsch'},
    {code:'ja', flag:'🇯🇵', name:'日本語'},
    {code:'zh', flag:'🇨🇳', name:'中文'},
  ];
  return `<div class="lang-bar">
    <button class="theme-btn" onclick="goTo('settings')" aria-label="${t('settingsMenuLabel')}">ℹ️</button>
    <button class="theme-btn" onclick="cycleTheme()" aria-label="${t('themeToggleAria')}">${themeIcon()}</button>
    ${langs.map(l => `<button class="lang-btn ${state.lang===l.code?'active':''}" onclick="setLanguage('${l.code}')" aria-label="${l.name}">${l.flag}</button>`).join('')}
  </div>`;
}

let savedLang = 'tr';
try{ savedLang = localStorage.getItem('fiyatla_lang') || 'tr'; }catch(e){}
let savedThemeOverride = null;
try{ savedThemeOverride = localStorage.getItem('fiyatla_theme_override') || null; }catch(e){}

let state = { screen: 'home', stream: null, fromCcy: 'TRY', toCcy: 'EUR', lang: savedLang, themeOverride: savedThemeOverride };

function systemPrefersDark(){
  try{
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }catch(e){
    return true;
  }
}

function resolvedTheme(){
  return state.themeOverride || (systemPrefersDark() ? 'dark' : 'light');
}

function applyTheme(){
  const app = document.getElementById('app');
  if(!app) return;
  if(resolvedTheme() === 'light'){
    app.classList.add('light-theme');
  }else{
    app.classList.remove('light-theme');
  }
  updateStatusBar();
}

async function updateStatusBar(){
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.StatusBar) return;
  try{
    const isLight = resolvedTheme() === 'light';
    await window.Capacitor.Plugins.StatusBar.setStyle({ style: isLight ? 'LIGHT' : 'DARK' });
    await window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: isLight ? '#FAF8F4' : '#0F1B1E' });
  }catch(e){}
}

function cycleTheme(){
  const current = state.themeOverride;
  let next;
  if(current === null) next = 'light';
  else if(current === 'light') next = 'dark';
  else next = null;
  state.themeOverride = next;
  try{
    if(next) localStorage.setItem('fiyatla_theme_override', next);
    else localStorage.removeItem('fiyatla_theme_override');
  }catch(e){}
  render();
}

function themeIcon(){
  if(state.themeOverride === 'light') return '☀️';
  if(state.themeOverride === 'dark') return '🌙';
  return '🖥️';
}

if(window.matchMedia){
  try{
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if(state.themeOverride === null) render();
    });
  }catch(e){}
}

function renderAdCloseButton(){
  let el = document.getElementById('ad-close-wrap');
  if(!adsEnabled){
    if(el) el.remove();
    return;
  }
  if(!el){
    el = document.createElement('div');
    el.id = 'ad-close-wrap';
    el.className = 'ad-close-wrap';
    document.body.insertBefore(el, document.body.firstChild);
  }
  const closeLabels = {tr:'Reklamı kapat', en:'Close ad', ja:'広告を閉じる', zh:'关闭广告'};
  const label = closeLabels[state.lang] || closeLabels.tr;
  el.innerHTML = `<button class="ad-close-btn" onclick="toggleAds()">${label} ✕</button>`;
}

let animateNextRender = false;

function render(){
  const app = document.getElementById('app');
  try{
    applyTheme();
    let content = '';
    if(state.screen === 'home') content = renderHome();
    else if(state.screen === 'convert') content = renderConvert();
    else if(state.screen === 'scan') content = renderScan();
    else if(state.screen === 'tracking') content = renderTracking();
    else if(state.screen === 'settings') content = renderSettings();
    if(animateNextRender){
      app.innerHTML = '<div class="screen-anim">' + content + '</div>';
      animateNextRender = false;
    }else{
      app.innerHTML = content;
    }
    attachHandlers();
  }catch(err){
    console.log('Render hatasi:', err.message);
    try{
      state.screen = 'home';
      app.innerHTML = '<div style="padding:40px 24px; text-align:center;"><p style="font-size:15px; margin-bottom:16px;">Bir şeyler ters gitti.</p><button class="primary" onclick="location.reload()">Yeniden Başlat</button></div>';
    }catch(e2){}
  }
}

function renderTicker(){
  const eurItems = Object.entries(RATES_TO_EUR)
    .filter(([code]) => code !== 'TRY')
    .map(([code, rate]) => `<span>1 ${code} = <b>€${rate.toFixed(4)}</b></span>`);
  const tryItems = Object.entries(RATES_TO_EUR)
    .filter(([code]) => code !== 'TRY')
    .map(([code]) => {
      const inTry = convertAmount(1, code, 'TRY');
      return `<span>1 ${code} = <b>₺${inTry.toFixed(2)}</b></span>`;
    });
  const html = [...eurItems, ...tryItems].join('');
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${html}${html}</div></div>`;
}

function sendFeedback(){
  const subject = encodeURIComponent('Fiyatla - Geri Bildirim (v' + APP_VERSION + ')');
  const body = encodeURIComponent('Merhaba,\n\n');
  window.open('mailto:support.fiyatla@gmail.com?subject=' + subject + '&body=' + body, '_system');
}

function confirmClearAllData(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'clear-data-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <p class="eyebrow" id="modal-a11y-title">⚠️ ${t('clearDataTitle')}</p>
      <p class="modal-sub">${t('clearDataWarning')}</p>
      <div class="modal-actions">
        <button class="modal-btn-secondary" onclick="closeClearDataModal()">${t('trackVazgec')}</button>
        <button class="modal-btn-primary" style="background:var(--danger); color:#fff;" onclick="executeClearAllData()">${t('clearDataConfirmBtn')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
}

function closeClearDataModal(){
  const el = document.getElementById('clear-data-modal-overlay');
  if(el){
    if(el._a11yCleanup) el._a11yCleanup();
    el.remove();
  }
}

function executeClearAllData(){
  try{
    localStorage.clear();
  }catch(e){}
  location.reload();
}

function manageAdPrivacy(){
  if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob){
    window.Capacitor.Plugins.AdMob.showPrivacyOptionsForm().catch(e => {
      console.log('Gizlilik formu gosterilemedi:', e.message);
    });
  }
}

function renderSettings(){
  return `${renderLangBar()}
    <header class="top">
      <button class="backbtn" onclick="goTo('home')">← Geri</button>
      <p class="eyebrow">${t('settingsMenuLabel')}</p>
      <h1>${t('settingsTitle')}</h1>
      <p class="sub">${t('settingsSub')}</p>
    </header>
    <main>
      <div class="card">
        <button class="primary" style="background:var(--surface-2); color:var(--text); box-shadow:none; border:1px solid var(--line);" onclick="window.open('https://hudayid0.github.io/Fiyatkontrolapp/privacy.html', '_system')">${t('privacyPolicyLink')}</button>
      </div>
      <div class="card" style="margin-top:12px;">
        <button class="primary" style="background:var(--surface-2); color:var(--text); box-shadow:none; border:1px solid var(--line);" onclick="window.open('https://hudayid0.github.io/Fiyatkontrolapp/terms.html', '_system')">${t('termsLink')}</button>
      </div>
      ${window.adConsentAvailable ? `
      <div class="card" style="margin-top:12px;">
        <button class="primary" style="background:var(--surface-2); color:var(--text); box-shadow:none; border:1px solid var(--line);" onclick="manageAdPrivacy()">${t('managePrivacyBtn')}</button>
      </div>
      ` : ''}
      <div class="card" style="margin-top:12px;">
        <p style="font-weight:600; margin-bottom:4px;">${t('batteryTipTitle')}</p>
        <p class="sub" style="font-size:13px;">${t('batteryTipBody')}</p>
      </div>
      <div class="card" style="margin-top:12px;">
        <button class="primary" style="background:var(--surface-2); color:var(--text); box-shadow:none; border:1px solid var(--line);" onclick="sendFeedback()">${t('feedbackBtn')}</button>
      </div>
      <div class="card" style="margin-top:12px; text-align:center;">
        <p class="sub">${t('contactLabel')}: <a href="mailto:support.fiyatla@gmail.com" style="color:var(--gold-soft);">support.fiyatla@gmail.com</a></p>
        <p class="sub" style="margin-top:6px;">Fiyatla v${APP_VERSION}</p>
      </div>
      <div class="card" style="margin-top:12px;">
        <button class="primary" style="background:var(--surface-2); color:var(--danger); box-shadow:none; border:1px solid var(--danger);" onclick="confirmClearAllData()">${t('clearDataBtn')}</button>
      </div>
    </main>
  `;
}

function renderHome(){
  return `
    ${renderLangBar()}
    ${renderTicker()}
    <header class="top">
      <p class="eyebrow">${t('eyebrowHome')}</p>
      <h1>${t('homeTitle')}</h1>
      <p class="sub">${t('homeSub')}</p>
    </header>
    <main>
      <div class="card gold" onclick="goTo('convert')">
        <span class="num">${t('card1Num')}</span>
        <h2>${t('card1Title')}</h2>
        <p>${t('card1Desc')}</p>
      </div>
      <div class="card teal" onclick="goTo('scan')">
        <span class="num">${t('card2Num')}</span>
        <h2>${t('card2Title')}</h2>
        <p>${t('card2Desc')}</p>
      </div>
      <div class="card" onclick="goTo('tracking')" style="border-left:3px solid var(--gold-soft);">
        <span class="num">${t('card3Num')}</span>
        <h2>${t('card3Title')}</h2>
        <p>${t('card3Desc')}</p>
      </div>
    </main>
    <footer>${t('footerHome')} · v${APP_VERSION}</footer>
  `;
}

function renderConvert(){
  return `
    <header class="top">
      <button class="backbtn" onclick="goTo('home')">${t('back')}</button>
      <p class="eyebrow">${t('convertEyebrow')}</p>
      <h1>${t('convertTitle')}</h1>
    </header>
    <main>
      <div>
        <label>${t('amountLabel')}</label>
        <input type="number" id="amount" placeholder="1500" inputmode="decimal" value="${state.lastAmount || ''}" oninput="state.lastAmount = this.value" />
      </div>
      <div class="row" style="align-items:end;">
        <div style="flex:1;">
          <label>${t('fromLabel')}</label>
          <select id="from-currency" onchange="onCurrencyChange()">
            ${CURRENCIES.map(code=>`<option value="${code}" ${code===state.fromCcy?'selected':''}>${ccyName(code)} (${code})</option>`).join('')}
          </select>
        </div>
        <button class="swap-btn" onclick="swapCurrencies()" aria-label="${t('ariaSwap')}">⇄</button>
        <div style="flex:1;">
          <label>${t('toLabel')}</label>
          <select id="to-currency" onchange="onCurrencyChange()">
            ${CURRENCIES.map(code=>`<option value="${code}" ${code===state.toCcy?'selected':''}>${ccyName(code)} (${code})</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="primary" onclick="doConvert()">${t('convertBtn')}</button>
      <div id="convert-result" aria-live="polite" aria-atomic="true"></div>
    </main>
    <footer>${rateStatusLabel()}</footer>
  `;
}

function renderScan(){
  const mode = state.searchMode || 'barcode';
  const history = state.searchHistory || [];
  return `
    <header class="top">
      <button class="backbtn" onclick="goTo('home')">← Geri</button>
      <p class="eyebrow">${t('scanEyebrow')}</p>
      <h1>${t('scanTitle')}</h1>
      <p class="sub">${t('scanSub')}</p>
    </header>
    <main>
      <div class="scan-box" id="scan-box">
        <p class="cam-msg" id="cam-msg">${t('camStartHint')}</p>
      </div>
      <div class="row">
        <button class="primary teal-btn" id="cam-btn" style="flex:1;" onclick="startCamera()">${t('camOpenBtn')}</button>
        <button class="primary" style="flex:1; background:var(--surface-2); color:var(--text); box-shadow:none; border:1px solid var(--line);" onclick="document.getElementById('gallery-input').click()">${t('galleryBtn')}</button>
      </div>
      <input type="file" accept="image/*" id="gallery-input" style="display:none;" onchange="handleGalleryImage(event)" />
      <div class="divider">${t('orManual')}</div>

      <div class="tabs">
        <button class="tab-btn ${mode==='barcode'?'active':''}" onclick="setSearchMode('barcode')" role="tab" aria-selected="${mode==='barcode'}">${t('tabBarcode')}</button>
        <button class="tab-btn ${mode==='name'?'active':''}" onclick="setSearchMode('name')" role="tab" aria-selected="${mode==='name'}">${t('tabName')} <span style="font-size:9px; opacity:0.65;">(${t('experimentalTag')})</span></button>
      </div>

      <div class="tab-content-anim">
      ${mode === 'barcode' ? `
        <div>
          <label>${t('barcodeLabel')}</label>
          <input type="text" id="barcode" placeholder="Örn. 4006381333931" inputmode="numeric" maxlength="14" />
          <div class="hint" id="barcode-hint">${t('barcodeHintDefault')}</div>
        </div>
        <button class="primary" onclick="lookupBarcode()">${t('findProductBtn')}</button>
      ` : `
        <div>
          <label>${t('productNameLabel')}</label>
          <input type="text" id="product-name" placeholder="Örn. Nutella 400g" />
        </div>
        <button class="primary" onclick="searchByName()">${t('searchBtn')}</button>
      `}
      </div>

      <div id="scan-result" aria-live="polite" aria-atomic="true"></div>

      ${history.length ? `
        <div class="history-block">
          <label>${t('recentSearches')}</label>
          <div class="history-chips">
            ${history.map(h => `<button class="chip" onclick="rerunHistory('${h.mode}','${h.value.replace(/'/g,"\\'")}')">${h.value}</button>`).join('')}
          </div>
        </div>
      ` : ''}
    </main>
    <footer>${t('footerScan')}</footer>
  `;
}

function attachHandlers(){
  const inp = document.getElementById('amount');
  if(inp){
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter') doConvert(); });
    if(state.lastAmount) doConvert();
  }

  const bc = document.getElementById('barcode');
  if(bc){
    bc.addEventListener('keydown', e=>{ if(e.key==='Enter') lookupBarcode(); });
    bc.addEventListener('input', e=>{
      e.target.value = e.target.value.replace(/[^0-9]/g,'');
      const hint = document.getElementById('barcode-hint');
      if(!hint) return;
      const len = e.target.value.length;
      const valid = [8,12,13,14].includes(len);
      if(len === 0){
        hint.textContent = t('barcodeHintDefault');
        hint.classList.remove('warn');
      }else if(valid){
        hint.textContent = t('barcodeHintValid');
        hint.classList.remove('warn');
      }else{
        hint.textContent = td('barcodeHintInvalid', len);
        hint.classList.add('warn');
      }
    });
  }

  const pn = document.getElementById('product-name');
  if(pn) pn.addEventListener('keydown', e=>{ if(e.key==='Enter') searchByName(); });
}

function setSearchMode(mode){
  state.searchMode = mode;
  render();
}

function addToHistory(mode, value){
  if(!state.searchHistory) state.searchHistory = [];
  state.searchHistory = state.searchHistory.filter(h => h.value !== value);
  state.searchHistory.unshift({mode, value});
  state.searchHistory = state.searchHistory.slice(0, 6);
}

function rerunHistory(mode, value){
  state.searchMode = mode;
  render();
  if(mode === 'barcode'){
    document.getElementById('barcode').value = value;
    lookupBarcode();
  }else{
    document.getElementById('product-name').value = value;
    searchByName();
  }
}

function goTo(screen){
  stopCamera();
  state.screen = screen;
  animateNextRender = true;
  render();
}

// ---- Screen 1: currency conversion (static/frozen rates, no network call) ----
function onCurrencyChange(){
  state.fromCcy = document.getElementById('from-currency').value;
  state.toCcy = document.getElementById('to-currency').value;
}

function swapCurrencies(){
  const tmp = state.fromCcy;
  state.fromCcy = state.toCcy;
  state.toCcy = tmp;
  render();
}

function doConvert(){
  if(!debounceAction('doConvert', 300)) return;
  const amount = parseFloat(document.getElementById('amount').value);
  const from = document.getElementById('from-currency').value;
  const to = document.getElementById('to-currency').value;
  state.fromCcy = from;
  state.toCcy = to;
  const resultBox = document.getElementById('convert-result');
  if(!amount || amount <= 0 || amount > 1000000000000){
    resultBox.innerHTML = `<div class="error">${t('invalidAmountRange')}</div>`;
    return;
  }
  if(from === to){
    resultBox.innerHTML = `<div class="error">Lütfen farklı iki para birimi seç.</div>`;
    return;
  }
  const converted = convertAmount(amount, from, to);
  const rate = crossRate(from, to);
  const shareMsg = `${amount} ${from} = ${converted.toFixed(2)} ${to} (Fiyatla ile hesaplandı)`;
  resultBox.innerHTML = `
    <div class="result">
      <div class="big">${converted.toFixed(2)} ${to}</div>
      <div class="small">${amount} ${from} · kur: 1 ${from} = ${rate.toFixed(4)} ${to}</div>
      <div class="small" style="margin-top:6px;">${rateStatusLabel()}</div>
      <button id="convert-share-btn" class="chip" style="margin-top:10px;">📤 ${t('shareBtn')}</button>
    </div>
  `;
  const shareBtn = document.getElementById('convert-share-btn');
  if(shareBtn) shareBtn.onclick = () => shareText(shareMsg);
}

// ---- Screen 2: camera + barcode ----
async function toggleTorch(){
  if(!state.torchTrack) return;
  state.torchOn = !state.torchOn;
  try{
    await state.torchTrack.applyConstraints({advanced: [{torch: state.torchOn}]});
    const btn = document.getElementById('torch-btn');
    if(btn) btn.textContent = state.torchOn ? '🔦✅' : '🔦';
  }catch(e){
    console.log('Torch degistirilemedi:', e.message);
  }
}

async function startCamera(){
  const box = document.getElementById('scan-box');
  const btn = document.getElementById('cam-btn');
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    state.stream = stream;
    box.innerHTML = `<video id="video" autoplay playsinline muted></video><div class="scan-frame"></div><button id="torch-btn" class="chip" style="position:absolute; bottom:12px; right:12px; display:none; z-index:5;" onclick="toggleTorch()">🔦</button>`;
    const video = document.getElementById('video');
    video.srcObject = stream;
    const camTrack = stream.getVideoTracks()[0];
    state.torchTrack = camTrack;
    state.torchOn = false;
    try{
      const caps = camTrack.getCapabilities ? camTrack.getCapabilities() : {};
      if(caps.torch){
        const torchBtn = document.getElementById('torch-btn');
        if(torchBtn) torchBtn.style.display = 'block';
      }
    }catch(e){}
    btn.textContent = t('camCloseBtn');
    btn.setAttribute('onclick','stopCamera(); resetCamBox();');

    if('BarcodeDetector' in window){
      const detector = new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
      const scanLoop = async () => {
        if(!state.stream) return;
        try{
          const codes = await detector.detect(video);
          if(codes.length > 0){
            document.getElementById('barcode').value = codes[0].rawValue;
            stopCamera();
            resetCamBox();
            lookupBarcode();
            return;
          }
        }catch(e){}
        if(state.stream) requestAnimationFrame(scanLoop);
      };
      requestAnimationFrame(scanLoop);
    }
  }catch(err){
    let camMsg = t('camGenericError');
    if(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError'){
      camMsg = t('camPermissionDenied');
    }
    box.innerHTML = `<p class="cam-msg">${camMsg}</p>`;
    console.log('Kamera hatasi:', err.name, err.message);
  }
}

function stopCamera(){
  if(state.stream){
    state.stream.getTracks().forEach(t=>t.stop());
    state.stream = null;
  }
}

function resetCamBox(){
  const box = document.getElementById('scan-box');
  const btn = document.getElementById('cam-btn');
  if(!box) return;
  box.innerHTML = `<p class="cam-msg">${t('camStartHint')}</p>`;
  if(btn){ btn.textContent = t('camOpenBtn'); btn.setAttribute('onclick','startCamera()'); }
}

// ---- Product lookup (Open Food Facts - real API) ----
function testCrashlytics(){
  if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseCrashlytics){
    window.Capacitor.Plugins.FirebaseCrashlytics.crash({message: 'Test crash from Fiyatla'});
  }else{
    alert('FirebaseCrashlytics eklentisi bulunamadi. Native tarafta kurulu mu kontrol et.');
  }
}

function maybeShowOnboarding(openCount){
  if(openCount !== 1) return;
  showOnboardingModal();
}

function showOnboardingModal(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'onboarding-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <p class="eyebrow" id="modal-a11y-title">👋 ${t('onboardingTitle')}</p>
      <p class="modal-sub">${t('onboardingIntro')}</p>
      <p class="modal-sub" style="margin-top:8px;">${t('onboardingPoint1')}</p>
      <p class="modal-sub" style="margin-top:8px;">${t('onboardingPoint2')}</p>
      <p class="modal-sub" style="margin-top:8px;">${t('onboardingPoint3')}</p>
      <div class="modal-actions" style="margin-top:16px;">
        <button class="modal-btn-primary" style="width:100%;" onclick="closeOnboardingModal()">${t('onboardingStartBtn')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
}

function closeOnboardingModal(){
  const el = document.getElementById('onboarding-modal-overlay');
  if(el){
    if(el._a11yCleanup) el._a11yCleanup();
    el.remove();
  }
}

const APP_VERSION = '1.0.0';

async function checkForUpdate(){
  try{
    const res = await fetch('https://raw.githubusercontent.com/hudayid0/Fiyatkontrolapp/main/package.json');
    if(!res.ok) return;
    const data = await res.json();
    const latest = data.version;
    if(!latest || latest === APP_VERSION) return;
    const dismissedFor = localStorage.getItem('fiyatla_update_dismissed');
    if(dismissedFor === latest) return;
    showUpdateBanner(latest);
  }catch(e){}
}

function showUpdateBanner(latestVersion){
  const existing = document.getElementById('update-banner');
  if(existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'update-banner';
  el.style.cssText = 'position:fixed; bottom:0; left:0; right:0; background:var(--gold); color:#1C1400; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; gap:10px; z-index:1800; font-size:13px;';
  el.innerHTML = `
    <span>${t('updateAvailableMsg')}</span>
    <button style="background:transparent; border:none; font-weight:700; text-decoration:underline; color:#1C1400; white-space:nowrap;" onclick="dismissUpdateBanner('${latestVersion}')">${t('updateDismissBtn')}</button>
  `;
  document.body.appendChild(el);
}

function dismissUpdateBanner(version){
  try{ localStorage.setItem('fiyatla_update_dismissed', version); }catch(e){}
  const el = document.getElementById('update-banner');
  if(el) el.remove();
}

function showOfflineBanner(){
  if(document.getElementById('offline-banner')) return;
  const el = document.createElement('div');
  el.id = 'offline-banner';
  el.style.cssText = 'position:fixed; bottom:0; left:0; right:0; background:var(--danger); color:#fff; padding:10px 16px; text-align:center; font-size:13px; z-index:1900;';
  el.textContent = t('offlineMessage');
  document.body.appendChild(el);
}

function hideOfflineBanner(){
  const el = document.getElementById('offline-banner');
  if(el) el.remove();
}

function setupOfflineDetection(){
  window.addEventListener('online', hideOfflineBanner);
  window.addEventListener('offline', showOfflineBanner);
  if(navigator.onLine === false) showOfflineBanner();
}

function getAppOpenCount(){
  let count = 1;
  try{
    count = parseInt(localStorage.getItem('fiyatla_open_count') || '0', 10) + 1;
    localStorage.setItem('fiyatla_open_count', String(count));
  }catch(e){}
  return count;
}

function maybeShowRatePrompt(openCount){
  try{
    const status = localStorage.getItem('fiyatla_rate_status');
    if(status === 'rated' || status === 'never') return;
    if(openCount < 5) return;
    const laterCount = parseInt(localStorage.getItem('fiyatla_rate_later_count') || '0', 10);
    if(laterCount && openCount < laterCount + 10) return;
    showRateModal();
  }catch(e){}
}

function showRateModal(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'rate-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <p class="eyebrow" id="modal-a11y-title">⭐ ${t('rateTitle')}</p>
      <p class="modal-sub">${t('rateMessage')}</p>
      <div class="modal-actions">
        <button class="modal-btn-secondary" onclick="rateLater()">${t('rateLaterBtn')}</button>
        <button class="modal-btn-primary" onclick="rateNow()">${t('rateNowBtn')}</button>
      </div>
      <button class="chip" style="margin-top:12px; width:100%; text-align:center;" onclick="rateNever()">${t('rateNeverBtn')}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
}

function closeRateModal(){
  const el = document.getElementById('rate-modal-overlay');
  if(el){
    if(el._a11yCleanup) el._a11yCleanup();
    el.remove();
  }
}

function rateNow(){
  try{ localStorage.setItem('fiyatla_rate_status', 'rated'); }catch(e){}
  closeRateModal();
  window.open('https://play.google.com/store/apps/details?id=com.hudayi.fiyatkontrol', '_system');
}

function rateLater(){
  try{
    const count = parseInt(localStorage.getItem('fiyatla_open_count') || '0', 10);
    localStorage.setItem('fiyatla_rate_later_count', String(count));
  }catch(e){}
  closeRateModal();
}

function rateNever(){
  try{ localStorage.setItem('fiyatla_rate_status', 'never'); }catch(e){}
  closeRateModal();
}

function editTrackedItem(id){
  const items = getTrackedItems();
  const item = items.find(i => i.id === id);
  if(!item) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'track-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <p class="eyebrow">${t('trackModalEyebrow')}</p>
      <h3 class="modal-title" id="modal-a11y-title">${item.name}</h3>
      <p class="modal-sub">${t('trackModalSub')}</p>
      <input type="number" id="target-price-input" value="${item.targetPrice.toFixed(2)}" step="0.01" inputmode="decimal" />
      <div class="modal-actions">
        <button class="modal-btn-secondary" onclick="closeTrackModal()">${t('trackVazgec')}</button>
        <button class="modal-btn-primary" onclick="confirmEditTrackedItem('${id}')">${t('trackConfirm')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
}

async function confirmEditTrackedItem(id){
  const input = document.getElementById('target-price-input');
  const target = parseFloat(input.value.replace(',', '.'));
  if(isNaN(target) || target <= 0){
    input.style.borderColor = 'var(--danger)';
    return;
  }
  closeTrackModal();
  const items = getTrackedItems();
  const item = items.find(i => i.id === id);
  if(!item) return;
  item.targetPrice = target;

  if(item.notifId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications){
    try{
      await window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: item.notifId }] });
    }catch(e){}
  }

  const granted = await requestNotificationPermission();
  if(granted && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications){
    const newNotifId = Math.floor(Date.now() % 100000);
    try{
      await window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          id: newNotifId,
          title: 'Fiyat Takibi - Fiyatla',
          body: `${item.name} için fiyatları tekrar kontrol etme zamanı geldi (hedefin: €${target.toFixed(2)})`,
          schedule: { at: new Date(Date.now() + 24*60*60*1000), repeats: true, every: 'day' },
        }]
      });
      item.notifId = newNotifId;
    }catch(e){}
  }
  saveTrackedItems(items);
  render();
}

async function exportBackup(){
  const items = getTrackedItems();
  const backupObj = {
    app: 'fiyatla',
    version: 1,
    exportedAt: new Date().toISOString(),
    tracked: items,
  };
  const text = btoa(unescape(encodeURIComponent(JSON.stringify(backupObj))));
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast(t('exportSuccess'));
  }catch(e){
    console.log('Export hatasi:', e.message);
  }
}

function importBackup(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'import-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <p class="eyebrow" id="modal-a11y-title">${t('importBtn')}</p>
      <p class="modal-sub">${t('importPrompt')}</p>
      <textarea id="import-text-input" rows="4" style="width:100%; border-radius:10px; border:1px solid var(--line); background:var(--surface); color:var(--text); padding:10px; font-size:13px; margin-top:8px;"></textarea>
      <div class="modal-actions">
        <button class="modal-btn-secondary" onclick="closeImportModal()">${t('trackVazgec')}</button>
        <button class="modal-btn-primary" onclick="confirmImportBackup()">${t('importBtn')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
}

function closeImportModal(){
  const el = document.getElementById('import-modal-overlay');
  if(el){
    if(el._a11yCleanup) el._a11yCleanup();
    el.remove();
  }
}

function confirmImportBackup(){
  const input = document.getElementById('import-text-input');
  const raw = input.value.trim();
  try{
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json);
    if(!data || data.app !== 'fiyatla' || !Array.isArray(data.tracked)){
      throw new Error('gecersiz');
    }
    saveTrackedItems(data.tracked);
    closeImportModal();
    showToast(t('importSuccess'));
    render();
  }catch(e){
    input.style.borderColor = 'var(--danger)';
    showToast(t('importError'));
  }
}

async function refreshProduct(code){
  try{ localStorage.removeItem('fiyatla_cache_' + code); }catch(e){}
  state.searchMode = 'barcode';
  render();
  const bcInput = document.getElementById('barcode');
  if(bcInput) bcInput.value = code;
  lookupBarcode();
}

window.__lastActionTime = {};
function debounceAction(key, delayMs){
  delayMs = delayMs || 800;
  const now = Date.now();
  const last = window.__lastActionTime[key] || 0;
  if(now - last < delayMs) return false;
  window.__lastActionTime[key] = now;
  return true;
}

async function shareText(text){
  try{
    if(navigator.share){
      await navigator.share({ text: text });
    }else if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      showToast(t('exportSuccess'));
    }
  }catch(e){
    // kullanici paylasim penceresini iptal etmis olabilir, sorun degil
  }
}

function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidBarcodeChecksum(code){
  const digits = code.split('').map(Number);
  const n = digits.length;
  const checkDigit = digits[n-1];
  let sum = 0;
  let weight = 3;
  for(let i = n-2; i >= 0; i--){
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

function cleanupExpiredCache(){
  try{
    const now = Date.now();
    const keysToRemove = [];
    for(let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if(key && key.indexOf('fiyatla_cache_') === 0){
        try{
          const entry = JSON.parse(localStorage.getItem(key));
          if(!entry || (now - entry.timestamp > 24 * 60 * 60 * 1000)){
            keysToRemove.push(key);
          }
        }catch(e){
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }catch(e){}
}

const PRODUCT_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedProduct(code){
  try{
    const raw = localStorage.getItem('fiyatla_cache_' + code);
    if(!raw) return null;
    const entry = JSON.parse(raw);
    if(Date.now() - entry.timestamp > PRODUCT_CACHE_TTL) return null;
    return entry.product;
  }catch(e){
    return null;
  }
}

function setCachedProduct(code, product){
  try{
    localStorage.setItem('fiyatla_cache_' + code, JSON.stringify({product, timestamp: Date.now()}));
  }catch(e){}
}

async function tryUpcItemDb(code){
  try{
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
    if(!res.ok) return false;
    const data = await res.json();
    if(!data.items || data.items.length === 0) return false;
    const item = data.items[0];
    const normalized = {
      product_name: item.title || item.model || 'Bilinmeyen urun',
      brands: item.brand || '-',
      image_front_small_url: (item.images && item.images[0]) || '',
    };
    renderProductResult(normalized, code);
    return true;
  }catch(e){
    return false;
  }
}

async function lookupBarcode(){
  if(!debounceAction('lookupBarcode')) return;
  const code = document.getElementById('barcode').value.trim();
  const box = document.getElementById('scan-result');
  if(!code){
    box.innerHTML = `<div class="error">${t('enterBarcodeMsg')}</div>`;
    return;
  }
  if(![8,12,13,14].includes(code.length)){
    box.innerHTML = `<div class="error">${td('invalidBarcodeFormat', code.length)}</div>`;
    return;
  }
  if(!isValidBarcodeChecksum(code)){
    console.log('Checksum uyusmuyor, farkli bir barkod standardi olabilir (orn. Code128) - arama yine de deneniyor.');
  }
  addToHistory('barcode', code);
  const cached = getCachedProduct(code);
  if(cached){
    renderProductResult(cached, code);
    return;
  }
  box.innerHTML = `<div class="result"><span class="spinner"></span>${t('searchingProduct')}</div>`;
  try{
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = await res.json();
    if(data.status !== 1){
      box.innerHTML = `<div class="result"><span class="spinner"></span>${t('searchingWiderDb')}</div>`;
      const found = await tryUpcItemDb(code);
      if(!found){
        box.innerHTML = `<div class="error">${t('barcodeNotFoundMsg')}</div>`;
      }
      return;
    }
    renderProductResult(data.product, code);
  }catch(err){
    box.innerHTML = `<div class="error">${td('productFetchError', err.message)}</div>`;
  }
}

// ---- Product search by name (Open Food Facts search API) ----
async function searchByName(){
  if(!debounceAction('searchByName')) return;
  const query = document.getElementById('product-name').value.trim();
  const box = document.getElementById('scan-result');
  if(!query){
    box.innerHTML = `<div class="error">${t('enterProductNameMsg')}</div>`;
    return;
  }
  addToHistory('name', query);
  box.innerHTML = `<div class="result"><span class="spinner"></span>${t('searchingText')}</div>`;
  try{
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=5`;
    const res = await fetch(url);
    const data = await res.json();
    const products = (data.hits || data.products || []).filter(p => p.product_name);
    if(products.length === 0){
      box.innerHTML = `<div class="error">${td('noResultsFor', query)}</div>`;
      return;
    }
    box.innerHTML = `
      <div class="result-list">
        ${products.map((p,i) => `
          <button class="result-item" onclick='selectSearchResult(${i})'>
            ${p.image_front_small_url ? `<img src="${p.image_front_small_url}">` : `<div style="width:44px;height:44px;border-radius:7px;background:var(--surface-2);"></div>`}
            <div>
              <div class="rname">${escapeHtml(p.product_name)}</div>
              <div class="rbrand">${escapeHtml(p.brands || '-')} - ${escapeHtml(p.code)}</div>
            </div>
          </button>
        `).join('')}
      </div>
    `;
    state.lastSearchResults = products;
  }catch(err){
    box.innerHTML = `<div class="error">${t('nameSearchUnstable')}</div>`;
  }
}

function selectSearchResult(index){
  const p = state.lastSearchResults[index];
  renderProductResult(p, p.code);
}

function renderProductResult(p, code){
  setCachedProduct(code, p);
  const box = document.getElementById('scan-result');
  const name = escapeHtml(p.product_name || p.generic_name || 'Bilinmeyen ürün');
  const brand = escapeHtml(p.brands || '—');
  const img = p.image_front_small_url || p.image_url || '';
  const comparison = buildComparison(name, brand);
  const safeName = name.replace(/'/g, "\\'");
  const safeBrand = brand.replace(/'/g, "\\'");
  box.innerHTML = `
    <div class="product-card">
      ${img ? `<img src="${img}" alt="${name}">` : `<div style="width:56px;height:56px;border-radius:8px;background:var(--surface-2);"></div>`}
      <div style="flex:1;">
        <div class="pname">${name}</div>
        <div class="pbrand">${brand} · barkod ${code}</div>
        <div class="pbrand" style="opacity:0.7; margin-top:2px;">${p._source === 'upcitemdb' ? t('sourceUpc') : t('sourceOff')}
          <button style="background:none; border:none; text-decoration:underline; color:var(--gold-soft); font-size:11px; cursor:pointer; margin-left:6px;" onclick="refreshProduct('${code}')">↻ ${t('refreshBtn')}</button>
          <button id="product-share-btn" style="background:none; border:none; text-decoration:underline; color:var(--gold-soft); font-size:11px; cursor:pointer; margin-left:6px;">📤 ${t('shareBtn')}</button>
        </div>
      </div>
    </div>
    <button class="primary" style="background:var(--surface-2); color:var(--gold-soft); box-shadow:none; border:1px solid var(--line);" onclick="promptTrackProduct('${safeName}', '${safeBrand}', '${code}')">🔔 Bu ürünü takip et</button>
    ${comparison}
  `;

  const shareBtn2 = document.getElementById('product-share-btn');
  if(shareBtn2) shareBtn2.onclick = () => shareText(`${name} - ${brand} (Fiyatla ile bulundu)`);
}

// ---- Fuzzy matching demo ----
function levenshtein(a, b){
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}
function similarity(a, b){
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return Math.round((1 - dist/maxLen) * 100);
}

// NOTE: Gerçek yurtdışı fiyatları için resmi ürün/fiyat API'leri (ör. Amazon Product
// Advertising API, PriceAPI) entegre edilmelidir. Bu prototipte, aynı ürün adının
// yurtdışı mağazalarında hafif farklı yazılmış hallerini simüle edip fuzzy matching
// ile eşleştirme mantığını göstermek için örnek veriler kullanılıyor.
const AFFILIATE_IDS = {
  'amazon.de': 'SENIN_ID-21',
  'amazon.fr': 'SENIN_ID-21',
  'amazon.co.uk': 'SENIN_ID-21',
  'hepsiburada.com': '',
};

function buildAffiliateUrl(storeDomain, query){
  const searchUrl = `https://www.${storeDomain}/s?k=${encodeURIComponent(query)}`;
  const affId = AFFILIATE_IDS[storeDomain];
  return affId ? `${searchUrl}&tag=${affId}` : searchUrl;
}

function renderAdBanner(){
  return `
    <div class="ad-banner">
      <span class="ad-label">${t('adSponsored')}</span>
      <div class="ad-placeholder">${t('adPlaceholderText')}</div>
    </div>
  `;
}

function buildComparison(name, brand){
  const query = `${brand} ${name}`.trim();
  const variants = [
    {country:'🇩🇪 Almanya', store:'amazon.de', label: `${brand} ${name}`.trim(), priceEur: +(Math.random()*8+4).toFixed(2)},
    {country:'🇫🇷 Fransa', store:'amazon.fr', label: `${name} - ${brand}`.trim(), priceEur: +(Math.random()*8+4).toFixed(2)},
    {country:'🇬🇧 İngiltere', store:'amazon.co.uk', label: `${name}, ${brand}`.trim(), priceEur: +(Math.random()*8+4).toFixed(2)},
    {country:'🇹🇷 Türkiye', store:'hepsiburada.com', label: `${brand} ${name} TR`.trim(), priceEur: +(Math.random()*8+4).toFixed(2)},
  ];
  variants.forEach(v => {
    v.score = similarity(query, v.label);
    v.url = buildAffiliateUrl(v.store, query);
  });
  const minPrice = Math.min(...variants.map(v=>v.priceEur));
  const rows = variants.map(v => `
    <tr>
      <td class="name-col">
        ${v.country}<span class="match-tag ${v.score>=80?'match-high':'match-mid'}">${td('compareMatch', v.score)}</span>
        <div class="store-name">${v.store}</div>
      </td>
      <td class="${v.priceEur===minPrice?'cheapest':''}">€ ${v.priceEur.toFixed(2)}</td>
      <td>
        <a class="go-btn" href="${v.url}" target="_blank" rel="sponsored noopener">${t('goBtn')}</a>
      </td>
    </tr>
  `).join('');
  return `
    <table class="compare">
      <thead><tr><th>${t('compareStoreCountry')}</th><th>${t('comparePrice')}</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="note">
      ${t('compareNote1')}<br><br>
      ${t('compareNote2')}
    </div>
    ${renderAdBanner()}
  `;
}

function renderTracking(){
  const tracked = getTrackedItems();
  return `
    <header class="top">
      <button class="backbtn" onclick="goTo('home')">← Geri</button>
      <p class="eyebrow">${t('trackingEyebrow')}</p>
      <h1>${t('trackingTitle')}</h1>
      <p class="sub">${t('trackingSub')}</p>
        <div class="row" style="margin-top:10px;">
          <button class="chip" style="flex:1;" onclick="exportBackup()">💾 ${t('exportBtn')}</button>
          <button class="chip" style="flex:1;" onclick="importBackup()">📥 ${t('importBtn')}</button>
        </div>
    </header>
    <main>
      ${tracked.length === 0 ? `
        <div class="note">Henüz takip ettiğin bir ürün yok. Bir ürün aradıktan sonra sonuç ekranındaki "🔔 Bu ürünü takip et" butonuna dokunarak ekleyebilirsin.</div>
      ` : tracked.map(item => `
        <div class="product-card">
          <div style="flex:1;">
            <div class="pname">${item.name}</div>
            <div class="pbrand">${item.brand} · hedef fiyat: € ${item.targetPrice.toFixed(2)}</div>
          </div>
          <button class="go-btn" onclick="editTrackedItem('${item.id}')">${t('editBtn')}</button>
          <button class="go-btn" onclick="untrackProduct('${item.id}')">${t('dropBtn')}</button>
        </div>
      `).join('')}
      <div class="note">
        Not: Fiyat verisi şu an simüle edildiği için gerçek zamanlı "fiyat düştü" tespiti yapılamıyor. Bu hatırlatma, telefonunun bildirim sistemi üzerinden düzenli aralıklarla "tekrar kontrol et" mesajı gönderir.
      </div>
    </main>
    <footer>${t('footerTracking')}</footer>
  `;
}

const TRACKING_KEY = 'fiyatla_tracked_items';

function getTrackedItems(){
  try{
    return JSON.parse(localStorage.getItem(TRACKING_KEY) || '[]');
  }catch(e){
    return [];
  }
}

function saveTrackedItems(items){
  localStorage.setItem(TRACKING_KEY, JSON.stringify(items));
}

async function requestNotificationPermission(){
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications){
    showToast(t('notifPermissionDenied'));
    return false;
  }
  try{
    const current = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
    if(current.display === 'granted') return true;
    const req = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
    if(req.display !== 'granted'){
      showToast(t('notifPermissionDenied'));
      return false;
    }
    return true;
  }catch(e){
    showToast(t('notifPermissionDenied'));
    return false;
  }
}

async function trackProduct(name, brand, code, targetPrice){
  const items = getTrackedItems();
  const id = `${code}_${Date.now()}`;
  const notifId = Math.floor(Date.now() % 100000);
  items.push({ id, name, brand, code, targetPrice, notifId });
  saveTrackedItems(items);

  const granted = await requestNotificationPermission();
  if(!granted){
    return;
  }
  try{
    await window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        id: notifId,
        title: 'Fiyat Takibi - Fiyatla',
        body: `${name} için fiyatları tekrar kontrol etme zamanı geldi (hedefin: €${targetPrice.toFixed(2)})`,
        schedule: { at: new Date(Date.now() + 24*60*60*1000), repeats: true, every: 'day' },
      }]
    });
    showToast(td('trackSuccess', name));
  }catch(e){
    showToast(td('trackScheduleError', e.message));
  }
}

async function untrackProduct(id){
  let items = getTrackedItems();
  const item = items.find(i => i.id === id);
  if(item && item.notifId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications){
    window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: item.notifId }] }).catch(()=>{});
  }
  items = items.filter(i => i.id !== id);
  saveTrackedItems(items);
  render();
}

function promptTrackProduct(name, brand, code){
  const safeName2 = name.replace(/'/g, "\\'");
  const safeBrand2 = brand.replace(/'/g, "\\'");
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'track-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <p class="eyebrow">${t('trackModalEyebrow')}</p>
      <h3 class="modal-title" id="modal-a11y-title">${name}</h3>
      <p class="modal-sub">${t('trackModalSub')}</p>
      <input type="number" id="target-price-input" value="5.00" step="0.01" inputmode="decimal" />
      <div class="modal-actions">
        <button class="modal-btn-secondary" onclick="closeTrackModal()">${t('trackVazgec')}</button>
        <button class="modal-btn-primary" onclick="confirmTrackProduct('${safeName2}','${safeBrand2}','${code}')">${t('trackConfirm')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
}

function initModalA11y(overlay){
  const previouslyFocused = document.activeElement;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-a11y-title');
  const focusables = overlay.querySelectorAll('button, input, [tabindex]');
  if(focusables.length) focusables[0].focus();
  function trap(e){
    if(e.key === 'Escape'){
      overlay.querySelector('.modal-btn-secondary, .chip')?.click();
    }else if(e.key === 'Tab' && focusables.length){
      const first = focusables[0];
      const last = focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault();
        last.focus();
      }else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault();
        first.focus();
      }
    }
  }
  overlay.addEventListener('keydown', trap);
  overlay._a11yCleanup = () => {
    overlay.removeEventListener('keydown', trap);
    if(previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  };
}

function closeTrackModal(){
  const overlay = document.getElementById('track-modal-overlay');
  if(overlay){
    if(overlay._a11yCleanup) overlay._a11yCleanup();
    overlay.remove();
  }
}

function confirmTrackProduct(name, brand, code){
  const input = document.getElementById('target-price-input');
  const target = parseFloat(input.value.replace(',', '.'));
  if(isNaN(target) || target <= 0){
    input.style.borderColor = 'var(--danger)';
    return;
  }
  closeTrackModal();
  trackProduct(name, brand, code, target);
}

// ---- AdMob entegrasyonu ----
// NOT: Bu asagidaki ID'ler Google'in resmi TEST ID'leridir, gercek para
// kazandirmaz. Gercek AdMob hesabini actiktan sonra bu ID'leri kendi
// gercek App ID ve Ad Unit ID'lerinle degistirmen gerekiyor.
const ADMOB_BANNER_ID = 'ca-app-pub-3346239396398803/8779821335';
let admobReady = false;

const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-3346239396398803/8620837997';

async function showInterstitialOnce(){
  if(!admobReady || !window.Capacitor.Plugins.AdMob) return;
  try{
    window.__interstitialActive = true;
    await window.Capacitor.Plugins.AdMob.prepareInterstitial({
      adId: ADMOB_INTERSTITIAL_ID,
      isTesting: false,
    });
    setTimeout(async () => {
      try{
        await window.Capacitor.Plugins.AdMob.showInterstitial();
      }catch(e){
        window.__interstitialActive = false;
        console.log('Interstitial gosterilemedi:', e.message);
      }
    }, 1500);
  }catch(e){
    window.__interstitialActive = false;
    console.log('Interstitial hazirlanamadi:', e.message);
  }
}

function setupInterstitialListener(){
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.AdMob) return;
  window.Capacitor.Plugins.AdMob.addListener('interstitialAdDismissed', () => {
    window.__interstitialActive = false;
    if(window.__pendingRatePromptCount !== null && window.__pendingRatePromptCount !== undefined){
      const count = window.__pendingRatePromptCount;
      window.__pendingRatePromptCount = null;
      maybeShowRatePrompt(count);
    }
  });
  window.Capacitor.Plugins.AdMob.addListener('interstitialAdFailedToShow', () => {
    window.__interstitialActive = false;
  });
}

async function handleConsent(){
  window.adConsentAvailable = false;
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.AdMob) return;
  try{
    const consentInfo = await window.Capacitor.Plugins.AdMob.requestConsentInfo();
    window.adConsentAvailable = !!consentInfo.isConsentFormAvailable;
    if(consentInfo.isConsentFormAvailable && consentInfo.status === 'REQUIRED'){
      await window.Capacitor.Plugins.AdMob.showConsentForm();
    }
  }catch(e){
    console.log('Consent alinamadi:', e.message);
  }
}

async function initAdMob(){
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.AdMob){
    maybeShowOnboarding(window.fiyatlaOpenCount);
    return;
  }
  try{
    await window.Capacitor.Plugins.AdMob.initialize({
      testingDevices: [],
      initializeForTesting: false,
    });
    admobReady = true;
    await handleConsent();
    maybeShowOnboarding(window.fiyatlaOpenCount);
    setupAdSizeListener();
    setupInterstitialListener();
    showBannerAd();
    if(window.fiyatlaOpenCount > 1 && shouldShowInterstitial()) showInterstitialOnce();
  }catch(e){
    console.log('AdMob baslatilamadi:', e.message);
    maybeShowOnboarding(window.fiyatlaOpenCount);
  }
}

let adsEnabled = true;
try{ adsEnabled = localStorage.getItem('fiyatla_ads_enabled') !== 'false'; }catch(e){}

function toggleAds(){
  adsEnabled = !adsEnabled;
  try{ localStorage.setItem('fiyatla_ads_enabled', adsEnabled ? 'true' : 'false'); }catch(e){}
  if(adsEnabled) showBannerAd(); else hideBannerAd();
  render();
}

function setupAdSizeListener(){
  window.adDebugInfo = 'listener kurulmadi (AdMob yok)';
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.AdMob) return;
  window.adDebugInfo = 'listener kuruldu, olay bekleniyor';
  try{
    window.Capacitor.Plugins.AdMob.addListener('bannerAdSizeChanged', (info) => {
      window.adDebugInfo = 'olay geldi: ' + JSON.stringify(info);
      if(info && info.height){
        document.documentElement.style.setProperty('--ad-height', Math.max(info.height - 6, 0) + 'px');
      }
      render();
    });
  }catch(e){
    window.adDebugInfo = 'hata: ' + e.message;
  }
}

async function showBannerAd(){
  if(!adsEnabled) return;
  if(!admobReady || !window.Capacitor.Plugins.AdMob) return;
  try{
    await window.Capacitor.Plugins.AdMob.showBanner({
      adId: ADMOB_BANNER_ID,
      adSize: 'ADAPTIVE_BANNER',
      position: 'TOP_CENTER',
      margin: 0,
      isTesting: false,
    });
  }catch(e){
    console.log('Banner gosterilemedi:', e.message);
  }
}

async function hideBannerAd(){
  if(!admobReady || !window.Capacitor.Plugins.AdMob) return;
  try{
    await window.Capacitor.Plugins.AdMob.hideBanner();
  }catch(e){}
}

async function handleGalleryImage(event){
  const file = event.target.files[0];
  if(!file) return;
  const box = document.getElementById('scan-result');
  if(!('BarcodeDetector' in window)){
    box.innerHTML = `<div class="error">${t('galleryUnsupported')}</div>`;
    event.target.value = '';
    return;
  }
  box.innerHTML = `<div class="result"><span class="spinner"></span>${t('searchingProduct')}</div>`;
  try{
    const bitmap = await createImageBitmap(file);
    const detector = new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
    const codes = await detector.detect(bitmap);
    if(codes.length === 0){
      box.innerHTML = `<div class="error">${t('galleryNoBarcode')}</div>`;
      event.target.value = '';
      return;
    }
    const rawValue = codes[0].rawValue;
    state.searchMode = 'barcode';
    render();
    document.getElementById('barcode').value = rawValue;
    lookupBarcode();
  }catch(e){
    box.innerHTML = `<div class="error">${td('productFetchError', e.message)}</div>`;
  }
  event.target.value = '';
}

function shouldShowInterstitial(){
  try{
    const last = parseInt(localStorage.getItem('fiyatla_last_interstitial') || '0', 10);
    const now = Date.now();
    if(now - last < 10 * 60 * 1000) return false;
    localStorage.setItem('fiyatla_last_interstitial', String(now));
    return true;
  }catch(e){
    return true;
  }
}

window.addEventListener('error', (event) => {
  try{
    if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseCrashlytics){
      window.Capacitor.Plugins.FirebaseCrashlytics.recordException({
        message: 'Global hata: ' + (event.message || 'bilinmeyen hata'),
      });
    }
  }catch(e){}
});

window.addEventListener('unhandledrejection', (event) => {
  try{
    if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseCrashlytics){
      const reason = (event.reason && event.reason.message) ? event.reason.message : String(event.reason);
      window.Capacitor.Plugins.FirebaseCrashlytics.recordException({
        message: 'Yakalanmamis Promise hatasi: ' + reason,
      });
    }
  }catch(e){}
});

window.__pendingRatePromptCount = null;
window.fiyatlaOpenCount = getAppOpenCount();
cleanupExpiredCache();
initAdMob();
fetchLiveRates();
setupBackButton();
setupDeepLinks();
setupOfflineDetection();
checkForUpdate();
setTimeout(() => {
  if(window.__interstitialActive){
    window.__pendingRatePromptCount = window.fiyatlaOpenCount;
  }else{
    maybeShowRatePrompt(window.fiyatlaOpenCount);
  }
}, 2500);

let lastBackPress = 0;

function showToast(message){
  const existing = document.getElementById('app-toast');
  if(existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'app-toast';
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 1800);
}

function exitToastMessage(){
  const msgs = {
    tr: 'Çıkmak için tekrar dokun',
    en: 'Tap again to exit',
    ja: 'もう一度タップして終了',
    zh: '再次点击退出',
  };
  return msgs[state.lang] || msgs.tr;
}

function handleDeepLinkUrl(url){
  if(!url) return;
  if(url.indexOf('scan') !== -1) goTo('scan');
  else if(url.indexOf('convert') !== -1) goTo('convert');
  else if(url.indexOf('tracking') !== -1) goTo('tracking');
}

async function setupDeepLinks(){
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.App) return;
  window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
    handleDeepLinkUrl(data && data.url);
  });
  try{
    const launch = await window.Capacitor.Plugins.App.getLaunchUrl();
    if(launch && launch.url){
      handleDeepLinkUrl(launch.url);
    }
  }catch(e){}
}

function setupBackButton(){
  if(!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.App) return;
  window.Capacitor.Plugins.App.addListener('backButton', () => {
    if(state.screen !== 'home'){
      goTo('home');
      return;
    }
    const now = Date.now();
    if(now - lastBackPress < 2000){
      window.Capacitor.Plugins.App.exitApp();
    }else{
      lastBackPress = now;
      showToast(exitToastMessage());
    }
  });
}

render();
