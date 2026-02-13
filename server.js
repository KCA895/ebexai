// Simple proxy server to hide API keys
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Store API key securely in environment variable
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';

// Proxy endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, temperature, max_tokens } = req.body;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 1024,
                stream: true
            })
        });

        // Forward streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        response.body.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
