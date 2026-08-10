# 🚀 Production Deployment Guide

## ✅ API Key Sudah Aman!

App sekarang menggunakan **backend proxy** untuk hide API key.

---

## 🏃 Quick Start (Production Mode)

### Option 1: Automatic (Recommended)
```bash
./start.sh
```

### Option 2: Manual
```bash
# Terminal 1: Start backend
npm install
npm start

# Terminal 2: Start frontend
python3 -m http.server 3000
```

---

## 📋 Pre-requisites

1. **Node.js installed** (v14+)
   ```bash
   node --version
   ```

2. **`.env` file exists** with API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3001
   ```

3. **Dependencies installed:**
   ```bash
   npm install
   ```

---

## 🔒 Security Checklist

### ✅ Done:
- [x] API key moved to `.env` file
- [x] `.env` added to `.gitignore`
- [x] Frontend uses proxy endpoint
- [x] No hardcoded API keys in frontend
- [x] Backend validates requests

### ⚠️ Before Production:
- [ ] Change `localhost` URLs to production URLs
- [ ] Enable CORS only for your domain
- [ ] Add rate limiting
- [ ] Use HTTPS (not HTTP)
- [ ] Set proper Firestore security rules
- [ ] Enable Firebase App Check

---

## 🌐 Deploy to Production

### Option 1: Vercel (Recommended)

**Frontend (Static):**
```bash
vercel --prod
```

**Backend (Serverless):**
1. Create `vercel.json`:
```json
{
  "builds": [
    { "src": "server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/chat", "dest": "/server.js" }
  ],
  "env": {
    "GROQ_API_KEY": "@groq-api-key"
  }
}
```

2. Set environment variable:
```bash
vercel env add GROQ_API_KEY
```

3. Deploy:
```bash
vercel --prod
```

---

### Option 2: Firebase Hosting + Cloud Functions

**Frontend:**
```bash
firebase init hosting
firebase deploy --only hosting
```

**Backend (Cloud Function):**
```bash
firebase init functions
# Move server.js logic to functions/index.js
firebase deploy --only functions
```

---

### Option 3: VPS (DigitalOcean, AWS, etc.)

```bash
# Install PM2 for process management
npm install -g pm2

# Start backend with PM2
pm2 start server.js --name ebexai-backend

# Start frontend with PM2
pm2 start "python3 -m http.server 3000" --name ebexai-frontend

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

---

## 🔧 Configuration

### Update API URLs for Production

In `app.js`, change:
```javascript
// From:
const API_PROXY_URL = 'http://localhost:3001/api/chat';

// To:
const API_PROXY_URL = 'https://your-domain.com/api/chat';
```

In `server.js`, add CORS:
```javascript
const cors = require('cors');
app.use(cors({
    origin: 'https://your-domain.com'
}));
```

---

## 📊 Monitoring

### Check Backend Status
```bash
curl http://localhost:3001/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

### Check Logs
```bash
# PM2 logs
pm2 logs ebexai-backend

# Or direct logs
tail -f server.log
```

---

## 🛡️ Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` to git
   - Use platform-specific secrets (Vercel Secrets, Firebase Config)

2. **Rate Limiting:**
   ```javascript
   const rateLimit = require('express-rate-limit');

   const limiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutes
       max: 100 // limit each IP to 100 requests per windowMs
   });

   app.use('/api/', limiter);
   ```

3. **HTTPS Only:**
   - Use Let's Encrypt SSL
   - Redirect HTTP to HTTPS

4. **CORS Configuration:**
   - Only allow your domain
   - No wildcard `*` in production

---

## 🐛 Troubleshooting

### Backend not starting
```bash
# Check if port 3001 is in use
lsof -ti:3001

# Kill process if needed
kill -9 $(lsof -ti:3001)
```

### Frontend can't connect to backend
- Check CORS settings
- Check API_PROXY_URL is correct
- Check backend is running
- Check browser console for errors

### API key not working
- Check `.env` file exists
- Check GROQ_API_KEY is correct
- Restart backend after changing `.env`

---

## 📱 Access URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | http://localhost:3000 | https://your-domain.com |
| Backend | http://localhost:3001 | https://api.your-domain.com |
| Dashboard | http://localhost:3000/dashboard.html | https://your-domain.com/dashboard.html |

---

## 🎉 Success!

App is now production-ready with:
- ✅ Secure API key management
- ✅ Backend proxy
- ✅ No exposed secrets
- ✅ Ready for deployment

**Next:** Deploy to your chosen platform!
