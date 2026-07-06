# Envanter Takibi - Google Sheets Altyapısı

Bu klasör, envanter sitesini tüm bilgisayarlardan erişilebilir yapmak için Google Apps Script web uygulaması olarak hazırlanmıştır.

## Kurulum

1. Google Drive'da yeni bir Google Sheet oluşturun.
2. Sheet adını `İstanbul Bilgi Üniversitesi - Envanter Takibi` yapın.
3. Google Sheet içinde `Uzantılar > Apps Script` menüsünü açın.
4. Bu klasördeki dosyaları Apps Script projesine aynı adlarla ekleyin:
   - `Code.gs`
   - `Index.html`
   - `Client.html`
   - `Styles.html`
5. Apps Script'te `setupInventoryWorkbook` fonksiyonunu bir kez çalıştırın ve izinleri onaylayın.
6. `Dağıt > Yeni dağıtım > Web uygulaması` seçin.
7. `Şu kişi olarak çalıştır`: Ben
8. `Erişimi olanlar`: Kurum hesabı varsa kurum kullanıcıları, yoksa linke sahip herkes.
9. Yayınlanan web uygulaması linkini envanter ekranı olarak kullanın.

İlk çalıştırmada Google Sheet içinde `Items`, `Movements` ve `Settings` sayfaları oluşturulur. Başlangıç envanteri 148 flash disk, 102 ses kayıt cihazı ve 2 kamera olarak gelir.
