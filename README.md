# EbexAI - Smart Chatbot with Data Collection

AI chatbot dengan sistem data collection lengkap untuk cybersecurity research dan user behavior analysis.

## 🚀 Features

### User Features (Frontend)
- **Multi-Authentication**: Email/Password, Google, Anonymous login
- **AI Chatbot**: Powered by Google Gemini AI
- **Clean UI**: Responsive design untuk desktop & mobile
- **Chat Management**: Clear chat history

### Developer Features (Backend Dashboard)
- **Comprehensive Data Collection**:
  - User authentication data
  - IP-based geolocation (tanpa permission)
  - Device & browser information
  - Network information
  - VPN/Proxy detection dengan provider identification
  - Browser fingerprinting (Canvas & WebGL)
  - Timezone & language preferences

- **Advanced VPN Detection**:
  - Deteksi VPN provider (NordVPN, ExpressVPN, dll)
  - Risk score calculation
  - Hosting/Datacenter detection

- **Chat Analytics**:
  - All chat messages (user & bot)
  - Soft-delete system (user hapus, tapi data tetap tersimpan)
  - Timestamp tracking

- **Real-time Dashboard**:
  - View all user sessions
  - Filter by VPN users, deleted chats
  - Statistics overview

## 📁 Project Structure

```
ebexai/
├── index.html       # Main chatbot interface
├── dashboard.html   # Developer dashboard
├── app.js          # Firebase & data collection logic
├── styles.css      # Styling
└── README.md       # Documentation
```

## 🛠️ Setup Instructions

### 1. Firebase Configuration

Pastikan Firebase project sudah dibuat dengan fitur:
- ✅ **Firestore Database** (test mode atau production)
- ✅ **Authentication** (Email/Password, Google, Anonymous)
- ✅ **Analytics** (optional)

### 2. Firestore Rules

Set Firestore rules untuk production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow write: if request.auth != null;
      allow read: if true; // Developer dashboard perlu akses
    }
  }
}
```

### 3. Enable Authentication Methods

Di Firebase Console → Authentication → Sign-in method:
1. **Email/Password** - Enable
2. **Google** - Enable & setup OAuth consent
3. **Anonymous** - Enable

### 4. Running Locally

Karena menggunakan ES6 modules, perlu local server:

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000

# Option 3: VS Code Live Server extension
```

Buka browser:
- **Chatbot**: `http://localhost:8000/index.html`
- **Dashboard**: `http://localhost:8000/dashboard.html`

### 5. Deploy to Firebase Hosting (Optional)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## 📊 Data Structure di Firestore

```
users/
  └─ {userId}/
      └─ sessions/
          └─ {sessionId}/
              ├── userId
              ├── sessionId
              ├── authMethod (email/google/anonymous)
              ├── email
              ├── timestamp
              ├── deviceInfo
              │   ├── userAgent
              │   ├── platform
              │   ├── screenResolution
              │   ├── timezone
              │   └── ...
              ├── browserInfo
              │   ├── name
              │   ├── version
              │   ├── os
              │   └── isMobile
              ├── location
              │   ├── ip
              │   ├── country
              │   ├── city
              │   ├── latitude/longitude
              │   ├── isp
              │   ├── vpnLikely (boolean)
              │   ├── vpnProvider
              │   └── vpnDetection
              │       ├── isProxy
              │       ├── isHosting
              │       ├── riskScore
              │       └── ...
              ├── fingerprint
              │   ├── canvas
              │   └── webgl
              └── chats/
                  └─ {chatId}/
                      ├── sender (user/bot)
                      ├── message
                      ├── timestamp
                      ├── deleted_by_user (boolean)
                      ├── deleted_at
                      └── visible_to_user (boolean)
```

## 🔐 Security & Privacy

### Legal Compliance
- ⚠️ **GDPR/CCPA/UU PDP**: Tambahkan privacy policy & cookie consent
- ⚠️ **Disclosure**: Inform users tentang data collection
- ⚠️ **Opt-out**: Berikan opsi untuk user request data deletion

### Data yang Dikumpulkan TANPA Permission:
- IP address & geolocation (approximate)
- Browser & device info
- Screen resolution
- Timezone
- Language
- Canvas/WebGL fingerprint
- VPN detection

### Data yang PERLU Permission:
- Precise GPS location ❌ (tidak digunakan)
- Camera/Microphone ❌ (tidak digunakan)

## 🎯 Use Cases

1. **Cybersecurity Research**: Analisis user behavior patterns
2. **Fraud Detection**: Identifikasi suspicious activities
3. **User Analytics**: Understanding user demographics
4. **VPN Detection**: Identify proxy/VPN usage
5. **Bot Detection**: Canvas fingerprinting untuk detect bots

## ⚠️ Important Notes

### VPN Detection Limitations:
- Akurasi ~70-85%
- False positives mungkin terjadi
- Beberapa VPN tidak terdeteksi

### Soft Delete System:
- User klik "Clear Chat" → chat hilang dari UI
- Data tetap tersimpan di Firestore dengan flag `deleted_by_user: true`
- Developer bisa lihat semua data di dashboard

### API Costs:
- **Gemini API**: Gratis tier limited requests
- **IP Geolocation API**: ip-api.com free (45 req/min)
- **Firebase**: Free tier untuk testing

## 🔧 Configuration

### Ganti API Keys

**Firebase Config** (app.js line 6-13):
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    // ...
};
```

**Gemini API** (app.js line 16):
```javascript
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
```

### Advanced VPN Detection (Optional)

Untuk akurasi lebih tinggi, ganti dengan premium API:

1. **IPHub** (https://iphub.info/)
2. **IPQualityScore** (https://www.ipqualityscore.com/)
3. **VPNapi.io** (https://vpnapi.io/)

Edit function `getLocationAndVPNData()` di app.js.

## 📱 Dashboard Features

- **Statistics**: Total users, sessions, VPN detected, messages
- **Filters**: View all users, VPN users only, deleted chats
- **User Cards**: Comprehensive data display
- **VPN Alerts**: Highlighted cards untuk VPN users
- **Chat History**: Semua messages termasuk yang "deleted"
- **Real-time Refresh**: Update data dengan button refresh

## 🚀 Future Enhancements

- [ ] Export data to CSV/JSON
- [ ] Advanced analytics charts
- [ ] Real-time notifications
- [ ] IP blacklist system
- [ ] Geolocation maps visualization
- [ ] User session replay
- [ ] Automated threat scoring

## 📄 License

Educational purposes only. Use responsibly and comply with local privacy laws.

## ⚡ Quick Start

1. Buka `index.html` dengan local server
2. Login dengan salah satu method
3. Chat dengan AI
4. Buka `dashboard.html` untuk lihat collected data

**Selesai!** 🎉
