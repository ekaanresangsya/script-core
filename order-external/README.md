# Order External Script

Script ini digunakan untuk melakukan stress test atau multiple request ke endpoint `pay-in/external-transaction`.

## Prasyarat

- Node.js terinstall
- `CLIENT_SECRET` yang valid (harus diisi di dalam script `hit-order.js` baris 6)

## Konfigurasi

Sebelum menjalankan script, pastikan Anda telah menyesuaikan beberapa variabel konfigurasi di dalam file `hit-order.js`:

- `CLIENT_ID`: ID Client (default: `idn-app-5Feb2026`)
- `CLIENT_SECRET`: Secret Key (Wajib diisi)
- `API_URL`: URL endpoint tujuan
- `n`: Jumlah request yang ingin dikirim (default: 99)
- `user_identity`: Email user untuk testing
- `sku`: SKU product yang akan ditest

## Cara Menjalankan

Jalankan perintah berikut di terminal:

```bash
node hit-order.js
```

## Output

Hasil eksekusi akan disimpan dalam file JSON dengan format nama:
`result-{timestamp}.json`

Setiap entry dalam file result mencakup:
- `request_index`: Urutan request
- `payload`: Data yang dikirim
- `verify_key_generated`: Key verifikasi yang digenerate
- `status`: HTTP Status code response
- `response`: Body response dari API
- `timestamp`: Waktu eksekusi lokal
