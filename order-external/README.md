# Order External Script

Script untuk melakukan stress testing dan pengujian load terhadap endpoint `pay-in/external-transaction` pada Core Middleware API.

## Deskripsi

Script ini mengirimkan multiple request secara berurutan ke API external transaction untuk menguji:
- **Performa API**: Mengukur response time dan throughput
- **Konsistensi**: Memvalidasi bahwa setiap request menghasilkan response yang benar
- **Keandalan**: Menguji stabilitas endpoint di bawah beban
- **Autentikasi**: Memverifikasi mekanisme keamanan dengan SHA-256 verify key

Setiap request menggunakan transaction ID unik berbasis UUID untuk menghindari duplikasi dan memudahkan tracking.

## Prasyarat

- **Node.js v14.x atau lebih tinggi** (menggunakan native `crypto` dan `fetch` API)
- **CLIENT_SECRET yang valid**: Harus diperoleh dari tim middleware
- **Koneksi internet**: Akses ke `https://core-middleware.sateklopo.com`
- **API Key**: X-Api-Key yang valid untuk autentikasi

## Konfigurasi

Sebelum menjalankan script, **wajib** menyesuaikan variabel konfigurasi di dalam file `hit-order.js`:

### Kredensial API (Baris 5-6)
```javascript
const CLIENT_ID = 'client-id';         // Ganti dengan Client ID Anda
const CLIENT_SECRET = 'client-secret'; // ⚠️ WAJIB diisi dengan secret yang valid
```

### Parameter Testing (Baris 18-20)
```javascript
const n = 50;                     // Jumlah request (default: 50)
const sku = 'SUBS-ABCDEF12345';   // SKU produk yang akan ditest
```

### Endpoint API (Baris 4)
```javascript
const API_URL = 'https://core-middleware.sateklopo.com/api/v1/pay-in/external-transaction';
```

## Cara Menjalankan

### Langkah 1: Navigasi ke Direktori
```bash
cd order-external
```

### Langkah 2: Jalankan Script
```bash
node hit-order.js
```

### Langkah 3: Monitor Output
Script akan menampilkan progress real-time di console:
```
Starting 50 requests to https://core-middleware.sateklopo.com/...
Sending request 1/50...
Transaction ID: order-developer-test-1770363753659-aa07751b-...
Status: 202
Response: { status: 202, data: { order_id: 'SAWE-...', ... } }
...
Sending request 50/50...
Results saved to result-1770363788742.json
```

## Cara Kerja Script

1. **Generate Transaction ID**: Membuat ID unik dengan format `order-developer-test-{timestamp}-{uuid}`
2. **Buat Payload**: Menyusun data request dengan user_identity, sku, dan transaction_id
3. **Generate Verify Key**: Membuat SHA-256 hash dari `JSON.stringify(payload) + CLIENT_SECRET`
4. **Kirim Request**: POST ke API dengan headers autentikasi lengkap
5. **Catat Response**: Menyimpan status, response body, dan metadata
6. **Ulangi**: Iterasi sebanyak `n` kali
7. **Simpan Hasil**: Export semua hasil ke file JSON di direktori parent

## Format Output

Hasil eksekusi akan disimpan dalam file JSON dengan nama:
```
../result-{timestamp}.json
```

### Struktur Data Result

```json
[
  {
    "requestID": 1,
    "payload": {
      "user_identity": "developer@idntimes.com",
      "sku": "SUBS-ABCDEF12345",
      "transaction_id": "order-developer-test-1770363753659-..."
    },
    "verifyKeyGenerated": "4bf25738d7396e62f277c50c601d61e02cc81047...",
    "status": 202,
    "response": {
      "status": 202,
      "data": {
        "order_id": "SAWE-1FT5FXG34CJSGZG79M53-1770363757",
        "transaction_id": "order-developer-test-1770363753659-...",
        "partner_id": "saweria-9sf2u",
        "product": {
          "sku": "SUBS-ABCDEF12345",
          "name": "[SAWERIA][CODE] IDN Nonton (365 Days)",
          "type": "subscription",
          "period": { "name": "Yearly", "slug": "yearly", "days": 365 }
        },
        "status": "pending",
        "created_at": 1770363754026
      }
    },
    "timestamp": "2026-02-06T07:42:39.859Z"
  }
]
```

### Penjelasan Field

| Field | Deskripsi |
|-------|-----------|
| `requestID` | Nomor urut request (1 sampai n) |
| `payload` | Data yang dikirim ke API |
| `verifyKeyGenerated` | SHA-256 hash untuk autentikasi |
| `status` | HTTP status code (200, 202, 400, dll) |
| `response` | Full response body dari API |
| `timestamp` | Waktu eksekusi dalam format ISO 8601 |
| `error` | Pesan error (jika request gagal) |

## HTTP Headers yang Digunakan

```javascript
{
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Api-Key': '6bb2976e-6eef-46e2-814d-1d622a890540',
  'Client-Id': CLIENT_ID,
  'Verify-Key': verifyKey  // SHA-256 hash
}
```

## Expected HTTP Status Codes

| Status | Arti | Action |
|--------|------|--------|
| `202` | Accepted - Request berhasil diterima | ✅ Normal |
| `400` | Bad Request - Payload tidak valid | ⚠️ Cek format data |
| `401` | Unauthorized - Authentication gagal | ⚠️ Cek CLIENT_SECRET dan Verify-Key |
| `404` | Not Found - Endpoint tidak ditemukan | ⚠️ Cek API_URL |
| `500` | Server Error - Error di sisi server | ⚠️ Hubungi tim backend |

## Troubleshooting

### Error: "Invalid JSON response"
**Penyebab**: API tidak mengembalikan JSON valid atau timeout
**Solusi**:
- Cek koneksi internet
- Verifikasi API endpoint masih aktif
- Periksa apakah ada rate limiting

### Error: Authentication/Verify Key Failed
**Penyebab**: CLIENT_SECRET tidak valid atau verify key salah
**Solusi**:
- Pastikan `CLIENT_SECRET` benar dan tidak expired
- Verify key digenerate dari: `JSON.stringify(payload) + CLIENT_SECRET`
- Pastikan tidak ada spasi atau karakter tambahan di CLIENT_SECRET

### Request Timeout atau Lambat
**Penyebab**: Server overload atau network issue
**Solusi**:
- Kurangi nilai `n` (jumlah request)
- Tambahkan delay antar request dengan `setTimeout()`
- Cek network latency: `ping core-middleware.sateklopo.com`

### Script Tidak Berjalan
**Penyebab**: Node.js version terlalu lama
**Solusi**:
- Cek versi Node.js: `node --version`
- Update ke Node.js v14 atau lebih baru
- Pastikan file permissions: `chmod +x hit-order.js`

## Catatan Keamanan

⚠️ **PENTING**:
1. **Jangan commit CLIENT_SECRET**: Secret key tidak boleh masuk ke Git repository
2. **Gunakan .env untuk production**: Untuk deployment, pindahkan credentials ke `.env` file
3. **Rotate secrets berkala**: Ganti CLIENT_SECRET secara periodik
4. **Jaga kerahasiaan hasil test**: File `result-*.json` berisi data sensitif
5. **HTTPS only**: Pastikan selalu menggunakan HTTPS untuk keamanan data

## Tips Penggunaan

### Testing Kapasitas Server
Naikkan nilai `n` secara bertahap untuk menemukan limit:
```javascript
const n = 10;   // Start small
const n = 50;   // Medium load
const n = 100;  // High load
const n = 500;  // Stress test
```

### Testing Produk Berbeda
Ganti SKU untuk test produk lain:
```javascript
const sku = 'SUBS-ABCDEF12345';    // Subscription
```

### Menambahkan Delay Antar Request
Untuk menghindari rate limiting, tambahkan delay:
```javascript
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
```

## Analisis Hasil

Setelah mendapat file result, Anda bisa:
1. **Hitung success rate**: Berapa % request yang berhasil (status 202)
2. **Cek response time**: Analisis field `timestamp` untuk mengukur kecepatan
3. **Identifikasi error pattern**: Cari pola dari request yang gagal
4. **Validasi data**: Pastikan `order_id` dan `transaction_id` konsisten

## Lisensi

Internal use only - Core Team IDN Media

## Kontak

Untuk pertanyaan atau issue terkait script ini, hubungi Core Team Development.

---

**Terakhir diupdate**: 6 Februari 2026
