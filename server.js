// Proxy server — hides the API key and hardens the /api/chat endpoint.
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// --- Load environment variables from .env (no external dependency) ---
(function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (!fs.existsSync(envPath)) return;
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eq = trimmed.indexOf('=');
            if (eq === -1) return;
            const key = trimmed.slice(0, eq).trim();
            let value = trimmed.slice(eq + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (key && process.env[key] === undefined) process.env[key] = value;
        });
    } catch (e) {
        console.error('Failed to load .env:', e.message);
    }
})();

const app = express();
app.set('trust proxy', 1); // so req.ip is correct behind a reverse proxy / hosting

// --- CORS allowlist (tighten in production via ALLOWED_ORIGINS in .env) ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001')
    .split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
    origin(origin, cb) {
        // Allow same-origin / server-to-server / curl (no Origin header)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('Origin not allowed by CORS'));
    }
}));

app.use(express.json({ limit: '256kb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY is not set. Create a .env file with GROQ_API_KEY=your_key_here');
}

// --- Simple in-memory rate limiter (per IP, fixed window). No dependency. ---
const RATE_WINDOW_MS = 60 * 1000;   // 1 minute
const RATE_MAX = 30;                // 30 requests / minute / IP
const hits = new Map();             // ip -> { count, resetAt }

function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip || 'unknown';
    let rec = hits.get(ip);
    if (!rec || now > rec.resetAt) {
        rec = { count: 0, resetAt: now + RATE_WINDOW_MS };
        hits.set(ip, rec);
    }
    rec.count += 1;
    const remaining = Math.max(0, RATE_MAX - rec.count);
    res.setHeader('X-RateLimit-Limit', RATE_MAX);
    res.setHeader('X-RateLimit-Remaining', remaining);
    if (rec.count > RATE_MAX) {
        res.setHeader('Retry-After', Math.ceil((rec.resetAt - now) / 1000));
        return res.status(429).json({ error: 'Too many requests. Slow down a bit.' });
    }
    next();
}

// Occasionally evict stale IP records so the Map cannot grow unbounded.
setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of hits) if (now > rec.resetAt) hits.delete(ip);
}, 5 * 60 * 1000).unref();

// --- Server-side toxic guard (defense-in-depth; client also filters) ---
const TOXIC_PATTERNS = [
    /\banjing\b/i, /\bkontol\b/i, /\bmemek\b/i, /\btolol\b/i,
    /\bbangsat\b/i, /\bsialan\b/i, /\btonjok\b/i, /\bhajar\b/i
];

function lastUserContent(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i] && messages[i].role === 'user' && typeof messages[i].content === 'string') {
            return messages[i].content;
        }
    }
    return '';
}

// --- Proxy endpoint ---
app.post('/api/chat', rateLimit, async (req, res) => {
    try {
        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
        }

        const { messages, temperature, max_tokens } = req.body || {};
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages must be a non-empty array' });
        }

        if (TOXIC_PATTERNS.some((p) => p.test(lastUserContent(messages)))) {
            return res.status(400).json({ error: 'Message blocked by content policy', code: 'toxic' });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages,
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 1024,
                stream: true
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error('Groq API error:', response.status, errText);
            return res.status(response.status).json({ error: 'Upstream AI error' });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        response.body.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
});

// CORS rejection handler -> clean 403 instead of a stack trace
app.use((err, req, res, next) => {
    if (err && /CORS/.test(err.message)) return res.status(403).json({ error: 'Origin not allowed' });
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));
