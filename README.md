# Envanter Takibi

İstanbul Bilgi Üniversitesi Hazırlık Programı için barkodlu envanter takip sistemi.

## İlk Taslak

GitHub Pages etkinleştirildiğinde taslak arayüz şu adresten açılır:

https://bilgihazirlik15-maker.github.io/envanter-takibi/

Bu taslak tarayıcıda çalışır ve barkod okuma akışını, envanter listesini, ürün ekleme/çıkarma ekranını ve barkod yazdırma bölümünü gösterir. Kalıcı Google Sheet kaydı için `google-apps-script` klasöründeki dosyalar Apps Script projesine yüklenmelidir.

## Yapı

- Veri kaynağı: Google Sheets
- Online arayüz: Google Apps Script Web App
- GitHub önizleme: `index.html` ve `preview.html`
- Kaynak kod: Bu GitHub reposu

## Kurulum Özeti

### Google Sheet ile gerçek kullanım

1. Google Drive'da yeni bir Google Sheet oluşturun.
2. Sheet içinden Uzantılar > Apps Script bölümünü açın.
3. `google-apps-script` klasöründeki dosyaları Apps Script projesine aynı adlarla ekleyin.
4. `setupInventoryWorkbook` fonksiyonunu bir kez çalıştırın.
5. Dağıt > Yeni dağıtım > Web uygulaması ile yayınlayın.

İlk çalıştırmada 148 flash disk, 102 ses kayıt cihazı ve 2 kamera otomatik oluşturulur.

### GitHub Pages ile taslak gösterim

1. GitHub'da repo sayfasında Settings > Pages bölümünü açın.
2. Source olarak `Deploy from a branch` seçin.
3. Branch olarak `main`, klasör olarak `/root` seçin ve kaydedin.
4. Birkaç dakika sonra `https://bilgihazirlik15-maker.github.io/envanter-takibi/` adresini açın.
