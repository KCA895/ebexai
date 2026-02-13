# EbexAI - Smart Chatbot

AI-powered chatbot with multi-chat functionality, comprehensive data collection, and secure API key management.

## 🚀 Features
- 🤖 Multi-chat rooms (create, switch, delete, rename, pin)
- 💬 AI integration with streaming responses
- 🔐 **Secure API key management (backend proxy)**
- 🔍 Deep search in chat history
- 🛡️ Toxic content filter with roasting responses
- 🔥 Firebase Authentication (Email, Google, Anonymous)
- 📊 Admin dashboard with analytics
- 📈 Comprehensive data collection (device, location, network, battery, performance)
- 🎨 Interactive bubble background

## 📦 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create `.env` file in project root:
```env
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
```

⚠️ **IMPORTANT:** Never commit `.env` to git! It's already in `.gitignore`.

### 3. Start Backend Proxy Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

Backend will run on: http://localhost:3001

### 4. Start Frontend Server
In another terminal:
```bash
python3 -m http.server 3000
```

### 5. Access Application
- **Frontend:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/dashboard.html
- **Backend API:** http://localhost:3001/api/chat

## 🔒 Security

### ✅ What's Secure:
- API keys stored in `.env` (never exposed to frontend)
- Backend proxy hides API keys from users
- `.gitignore` protects sensitive files
- No API keys visible in browser DevTools

### ⚠️ Firebase Config:
Firebase config in frontend is **public** (this is expected and safe).
Firebase security is handled by **Firestore Rules**, not by hiding config.

## 📊 Data Collected
- **Device Info:** Screen resolution, CPU, memory, touch support
- **Browser Info:** Name, version, OS
- **Location:** IP-based location, ISP, VPN detection
- **Network:** Connection type, speed, latency
- **Battery:** Level, charging status
- **Performance:** Page load time, memory usage
- **Fingerprinting:** Canvas & WebGL for fraud detection

## 🗂️ Project Structure
```
ebexai/
├── server.js          # Backend proxy server (hides API keys)
├── package.json       # Node.js dependencies
├── .env              # Environment variables (NOT in git)
├── .gitignore        # Protect sensitive files
├── app.js            # Frontend JavaScript
├── chat-manager.js   # Multi-chat functionality
├── index.html        # Main chatbot interface
├── dashboard.html    # Admin dashboard
├── styles.css        # Styling
└── README.md         # This file
```

## 🛠️ Tech Stack
- **Frontend:** Vanilla JS (ES6 modules)
- **Backend:** Node.js + Express
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **AI:** Groq (Llama 3.1-8b-instant) - Free tier: 14,400 req/day

## 📱 Features Detail

### Multi-Chat Management
- Create unlimited chat rooms
- Switch between chats
- Pin important chats
- Rename chats
- Delete chats (soft delete - recoverable)
- Search across all chats and messages

### AI Personality
- **EBEX AI:** Pemalas tapi helpful
- Sarcastic responses untuk toxic users
- Streaming responses (real-time typing)
- Indonesian language support

### Admin Dashboard
- View all user sessions
- Filter by VPN users
- Export data (coming soon)
- Real-time statistics

## 🚀 Deployment

### Option 1: Firebase Hosting (Recommended)
```bash
firebase init hosting
firebase deploy
```

### Option 2: Vercel/Netlify
- Deploy frontend directly
- Deploy backend to Vercel Serverless Functions or separate hosting

### Option 3: VPS/Heroku
- Deploy both frontend & backend together
- Use PM2 for process management

## 📄 API Documentation

### POST /api/chat
Proxy endpoint untuk Groq AI.

**Request:**
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

**Response:** Server-Sent Events (SSE) stream

## ⚠️ Important Notes

1. **API Keys:** NEVER commit API keys to git
2. **Privacy:** Add privacy policy for GDPR compliance
3. **Rate Limiting:** Implement rate limiting in production
4. **CORS:** Configure CORS properly for production
5. **HTTPS:** Use HTTPS in production

## 🔧 Troubleshooting

### Error: "Cannot connect to backend"
- Make sure backend is running on port 3001
- Check `.env` file exists with correct API key

### Error: "Firestore permission denied"
- Deploy Firestore rules from `firestore.rules`
- Check Firebase Console → Firestore → Rules

### Error: "Module not found"
- Run `npm install` to install dependencies

## 📝 License
MIT License - Educational purposes only. Use responsibly.

## 👨‍💻 Author
Kelvin Angelo

## 🎉 Quick Start
```bash
# 1. Clone repo
git clone https://github.com/KCA895/ebexai.git
cd ebexai

# 2. Install dependencies
npm install

# 3. Create .env file
echo "GROQ_API_KEY=your_key_here" > .env

# 4. Start backend
npm start

# 5. Start frontend (new terminal)
python3 -m http.server 3000

# 6. Open browser
open http://localhost:3000
```

**Done!** 🚀
