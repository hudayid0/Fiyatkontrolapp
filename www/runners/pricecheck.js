// Fiyatla - arka plan fiyat kontrolu runner'i (@capacitor/background-runner)
//
// Bu dosya webview'den (index.html) AYRI, izole bir JS ortaminda calisir;
// DOM'a ve index.html'in fonksiyonlarina erisimi yoktur. Webview tarafi,
// takip listesi ve guncel kurlar degistikce 'syncData' olayini tetikleyerek
// bu verileri CapacitorKV'ye (native SharedPreferences tabanli kalici depo)
// yazar. Periyodik 'checkPrices' olayi ise bu depodan okuyup UPCitemDB'nin
// ucretsiz lookup API'sinden gelen gercek satici fiyat tekliflerini (offers)
// hedef fiyatla karsilastirir.
//
// ONEMLI SINIRLAMA: UPCitemDB'nin ucretsiz "trial" API'si her barkod icin
// offers (fiyat teklifi) dondurmez - kapsam agirlikli olarak ABD perakende
// satici verisidir. Bircok urun icin (ozellikle ABD disi barkodlar) offers
// bos gelebilir; bu durumda o urun icin sessizce atlanir, yanlis/simule bir
// fiyat uydurulmaz.

addEventListener('syncData', (resolve, reject, args) => {
  try {
    CapacitorKV.set('tracked_items', JSON.stringify((args && args.items) || []));
    CapacitorKV.set('rates_to_eur', JSON.stringify((args && args.rates) || {}));
    resolve();
  } catch (e) {
    reject(e);
  }
});

addEventListener('checkPrices', async (resolve, reject, args) => {
  try {
    const itemsEntry = CapacitorKV.get('tracked_items');
    const items = itemsEntry && itemsEntry.value ? JSON.parse(itemsEntry.value) : [];
    if (!items || items.length === 0) {
      resolve();
      return;
    }

    const ratesEntry = CapacitorKV.get('rates_to_eur');
    const ratesToEur = ratesEntry && ratesEntry.value ? JSON.parse(ratesEntry.value) : {};

    const notifiedEntry = CapacitorKV.get('notified_prices');
    const notifiedPrices = notifiedEntry && notifiedEntry.value ? JSON.parse(notifiedEntry.value) : {};

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || !item.code || typeof item.targetPrice !== 'number') continue;

      try {
        const res = await fetch('https://api.upcitemdb.com/prod/trial/lookup?upc=' + item.code);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.items || data.items.length === 0) continue;

        const offers = data.items[0].offers || [];
        if (offers.length === 0) continue;

        let lowestEur = null;
        for (let j = 0; j < offers.length; j++) {
          const offer = offers[j];
          if (!offer || typeof offer.price !== 'number' || offer.price <= 0) continue;
          const currency = (offer.currency || 'USD').toUpperCase();
          const rate = ratesToEur[currency];
          if (!rate) continue;
          const priceEur = offer.price * rate;
          if (lowestEur === null || priceEur < lowestEur) lowestEur = priceEur;
        }
        if (lowestEur === null) continue;

        const lowestEurKey = lowestEur.toFixed(2);
        if (lowestEur <= item.targetPrice && notifiedPrices[item.id] !== lowestEurKey) {
          CapacitorNotifications.schedule([
            {
              id: 600000 + i,
              title: 'Fiyatla',
              body: (item.name || 'Urun') + ': hedef fiyata ulasti! Guncel: EUR ' + lowestEurKey,
            },
          ]);
          notifiedPrices[item.id] = lowestEurKey;
        }
      } catch (itemErr) {
        console.error('checkPrices: urun kontrolu basarisiz - ' + itemErr.message);
      }
    }

    CapacitorKV.set('notified_prices', JSON.stringify(notifiedPrices));
    resolve();
  } catch (e) {
    reject(e);
  }
});
