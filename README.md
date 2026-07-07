# Web Site Yoneticisi

Tek bir arayuz uzerinden birden cok web sitesini kaydetmek, listelemek, favorilemek, silmek ve secilen siteyi sag taraftaki iframe alaninda calistirmak icin hazirlanan bagimsiz yazilim taslagi.

## Kullanim

1. `index.html` dosyasini acin.
2. Sol ustteki `+` dugmesiyle yeni web sitesi ekleyin.
3. Sol listeden bir site secin.
4. Secilen site sag tarafta iframe icinde acilir.
5. Iframe icinde acilmayi reddeden siteler icin `Yeni sekmede ac` dugmesini kullanin.

Kayitli site listesi tarayicinin `localStorage` alaninda saklanir. Bu nedenle ilk surum kurulum veya sunucu gerektirmeden calisir.

## Dosyalar

- `index.html`: Uygulamayi baslatan giris dosyasi
- `site-manager.html`: Ana arayuz
- `site-manager.css`: Gorsel tasarim
- `site-manager.js`: Site ekleme, silme, favorileme, arama ve disa aktarma davranislari
