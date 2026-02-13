# Firestore Rules Setup

## Masalah
Dashboard admin menunjukkan error: **"Missing or insufficient permissions"**

## Solusi
Anda perlu mengupdate Firestore Security Rules di Firebase Console.

## Langkah-langkah:

### 1. Buka Firebase Console
- Kunjungi: https://console.firebase.google.com/
- Pilih project: **ebex-7fc7b**

### 2. Navigasi ke Firestore Rules
- Di sidebar kiri, klik **Firestore Database**
- Klik tab **Rules** (di bagian atas)

### 3. Copy Rules dari file `firestore.rules`
- Buka file `firestore.rules` di project ini
- Copy semua isinya

### 4. Paste ke Firebase Console
- Paste rules ke editor di Firebase Console
- Klik tombol **Publish** (warna biru)

### 5. Tunggu Deploy Selesai
- Rules akan aktif dalam beberapa detik
- Reload dashboard untuk test

## Penjelasan Rules

### Admin Access
- Email `kelvinchristianangelo@gmail.com` punya akses penuh ke semua data

### User Access
- User hanya bisa read/write data mereka sendiri
- User bisa create chat baru
- User bisa delete chat mereka sendiri
- User bisa read/write messages di chat mereka sendiri

### Security
- Semua operasi memerlukan authentication
- User tidak bisa akses data user lain
- Admin bisa akses semua data untuk monitoring

## Test
Setelah deploy rules:
1. Login ke dashboard dengan email admin
2. Dashboard harus load data tanpa error
3. User bisa create, delete, update chat mereka sendiri

## Alternative: Testing Mode (NOT RECOMMENDED FOR PRODUCTION)
Jika ingin test cepat (HANYA UNTUK DEVELOPMENT):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **WARNING**: Rules ini membuka akses ke semua authenticated users. Jangan pakai di production!
