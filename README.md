# Börtü Böcek (profesyonel proje sürümü)

## Klasörler
- `public/`  → oyunun kendisi (sim.js = oyun kuralları, render.js = çizim, game.js = menü ve kontroller)
- `server/server.js` → çevrimiçi sunucu (ek paket gerekmez, sadece Node.js)
- `render.yaml` → ücretsiz yayın ayarı (Render)
- `capacitor.config.json` → Android uygulaması ayarı

Oyun kuralları sunucuda çalışır. Herkes aynı oyunu görür, hile yapılamaz.

## 1. Bilgisayarında dene (5 dakika)
1. https://nodejs.org adresinden Node.js (LTS) kur.
2. Bu klasörde bir terminal aç ve şunu yaz: `node server/server.js`
3. Tarayıcıda `http://localhost:3000` aç. Tek ve İki kişi hemen oynanır.
4. Online denemek için iki sekme aç: 🌐 Online seç, aynı oda kodunu yaz, birinde "Oda kur", diğerinde "Katıl". Kurucu "Başla"ya basar.

## 2. İnternete koy (ücretsiz)
Önerim: **Render** (ayarlar hazır).
1. Bu klasörü GitHub'a yükle (github.com → New repository → dosyaları sürükle).
2. render.com'da hesap aç → New → Blueprint → GitHub deponu seç. `render.yaml` her şeyi kendisi ayarlar.
3. Birkaç dakika sonra `https://bortu-bocek-xxxx.onrender.com` gibi bir adresin olur. Oyun orada açılır, arkadaşların aynı adresi açıp oda kodu ile girer.

**Ücretsiz sürümün sınırları (dürüst olalım):**
- 15 dakika kimse oyun oynamazsa sunucu uyur. İlk giren yaklaşık 1 dakika bekler. Oyun sırasında uyumaz.
- Ayda 750 saat verir. Bu tek bir sunucunun 7/24 çalışmasına yetecek kadardır, ama uyku yüzünden gerçek 7/24 aktiflik garanti değildir.
- Uyumasın istersen ücretsiz bir izleme servisiyle (ör. UptimeRobot) `https://ADRESIN/health` adresini 5 dakikada bir açtırabilirsin. Platform kuralları değişebilir, garanti yok.
- Gerçek 7/24 için ücretli en ucuz plan ya da kendi sunucun gerekir. Oracle Cloud'un "Always Free" sanal sunucusu da var ama kart ister, kapasite bulmak zor olabilir, çok boşta kalan sunucuyu geri alabiliyor ve 2026'da limitlerini düşürdü.

## 3. Android uygulaması (Google Play için)
1. `public/config.js` içine sunucu adresini yaz: `window.BB_SERVER = 'wss://bortu-bocek-xxxx.onrender.com';`
2. Bilgisayarında Node.js ve **Android Studio** kurulu olsun.
3. Bu klasörde sırayla:
   - `npm install @capacitor/core @capacitor/cli @capacitor/android`
   - `npx cap add android`
   - `npx cap sync`
   - `npx cap open android` (Android Studio açılır; Build → Generate Signed Bundle / APK ile AAB üret)
4. Play Console'da hesap aç (tek seferlik 25 dolar, kimlik doğrulaması ister).
5. **Önemli kural:** 13 Kasım 2023'ten sonra açılan kişisel hesaplarda, yayından önce **en az 12 test kullanıcısı 14 gün boyunca kapalı testte** olmalı. Kurumsal hesapta bu şart yok ama D-U-N-S numarası ister. Yayın en az 3 hafta sonra olur.
6. Mağaza için gerekenler: simge, ekran görüntüleri, açıklama, gizlilik politikası, yaş derecelendirmesi.

## Henüz olmayanlar (sıradaki işler)
- Gerçek telefonlarda deneme ve ince ayar (denge, dokunmatik kontrol)
- Ses, müzik, titreşim
- Hesap, skor tablosu, mağaza içi satın alma
- Çevrimiçide gecikmeyi gizleyen tahmin (şu an kendi böceğin yaklaşık 0,1 sn gecikmeli görünebilir)
