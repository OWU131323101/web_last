const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    });
    next();
});
app.use(express.static('public'));

// --- Configuration ---
// const PROVIDER = 'openai';
const PROVIDER = 'gemini';

// OpenAI Configuration
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_ENDPOINT = 'https://openai-api-proxy-746164391621.us-west1.run.app';

// Gemini Configuration
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

// Load System Prompt
const promptPath = path.join(__dirname, 'prompt.md');
let systemPrompt = "You are a staff member on the ISS.";
try {
    systemPrompt = fs.readFileSync(promptPath, 'utf8');
} catch (err) {
    console.error("Failed to read prompt.md", err);
}

// Chat History
const chatHistory = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: "了解しました。国際宇宙ステーション(ISS)の職員として振る舞います。" }
];

// --- Socket.IO ---
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('sensor', (data) => {
        // Handle sensor data
    });
});

// --- Routes ---

app.get('/smart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'smart.html'));
});

app.get('/guidance.png', (req, res) => {
    const imgPath = path.join(__dirname, 'public', 'guidance.png');
    if (fs.existsSync(imgPath)) {
        res.sendFile(imgPath);
    } else {
        res.status(404).send("Image not found");
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Add user message to history
        chatHistory.push({ role: "user", content: userMessage });

        let replyText = "";

        if (PROVIDER === 'openai') {
            replyText = await callOpenAI(chatHistory);
        } else if (PROVIDER === 'gemini') {
            replyText = await callGemini(chatHistory);
        } else {
            throw new Error('Invalid Provider Configuration');
        }

        // Add assistant response to history
        chatHistory.push({ role: "assistant", content: replyText });

        res.json({ reply: replyText });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ reply: "通信障害が発生しました... 再送してください..." });
    }
});


// --- API Functions ---

async function callOpenAI(messages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    const response = await fetch(OPENAI_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: messages,
            max_tokens: 200
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error:", errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callGemini(messages) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    // Convert OpenAI-style messages to Gemini history
    const contents = messages
        .filter(m => m.role !== 'system') // Gemini uses system_instruction separately or we simplify
        .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

    // Handle system prompt if present (simple prepend for now)
    const systemMsg = messages.find(m => m.role === 'system');
    let finalContents = contents;

    // Note: older Gemini API or specific models might handle system instructions differently.
    // For simplicity with gemini-1.5-flash, we can pass system instruction in config or just rely on prompt.
    // Here we just ensure we send a valid contents array.

    const url = `${GEMINI_API_BASE_URL}${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: finalContents,
            generationConfig: {
                maxOutputTokens: 200
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", errorText);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Provider: ${PROVIDER}`);
});
