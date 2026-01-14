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
const PROVIDER = 'openai';
// const PROVIDER = 'gemini';

// OpenAI Configuration
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_ENDPOINT = 'https://openai-api-proxy-746164391621.us-west1.run.app';

// Gemini Configuration
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

// --- Generic Helper: Load and Process Prompt ---
function fs_readFile(path) {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (err) {
        console.error(`Failed to read file ${path}`, err);
        return "";
    }
}

function processPrompt(template, variables) {
    let processText = template;
    for (const key in variables) {
        const placeholder = "${" + key + "}";
        // Replace all occurrences
        processText = processText.split(placeholder).join(variables[key]);
    }
    return processText;
}

// Chat History (In-Memory for this session)
let chatHistory = [];

// Initialize System Persona path
const promptPath = path.join(__dirname, 'prompt.md');

// --- Socket.IO ---
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    // Forward sensor data to all clients (for desktop visualization)
    socket.on('sensor', (data) => {
        socket.broadcast.emit('sensor_update', data);
    });

    // Handle chat from mobile
    socket.on('chat_message', async (data) => {
        const userMessage = data.text;
        console.log(`Chat from mobile: ${userMessage}`);

        // Broadcast user message so it appears on desktop
        io.emit('chat_broadcast', { text: userMessage, role: 'user' });

        // Reuse the logic from /api/chat
        try {
            const replyText = await handleChatLogic(userMessage);
            // Broadcast AI reply
            io.emit('chat_broadcast', { text: replyText, role: 'bot' });
        } catch (error) {
            console.error("AI Error via Socket:", error);
            io.emit('chat_broadcast', { text: "通信エラーが発生しました...", role: 'system' });
        }
    });

    // Support basic "chat message" event if user desires standard socket implementation
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
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

// Generic Handler Logic
async function handleChatLogic(userMessage) {
    // 1. Load Prompt (Dynamic Reloading for "Generic" Architecture)
    const rawPrompt = fs_readFile(promptPath);

    // 2. Variable Substitution (if any placeholders existed)
    // We pass generic context like date
    const systemInstruction = processPrompt(rawPrompt, { date: new Date().toISOString() });

    // 3. Update History system prompt logic
    // We ensure the system prompt is always the first item and up-to-date
    const systemMsg = { role: "system", content: systemInstruction };

    if (chatHistory.length === 0) {
        chatHistory.push(systemMsg);
    } else if (chatHistory[0].role === 'system') {
        chatHistory[0] = systemMsg; // Update existing system prompt
    } else {
        // If history exists but no system prompt (unlikely), prepend
        chatHistory.unshift(systemMsg);
    }

    chatHistory.push({ role: "user", content: userMessage });

    let replyText = "";
    if (PROVIDER === 'openai') {
        replyText = await callOpenAI(chatHistory);
    } else if (PROVIDER === 'gemini') {
        replyText = await callGemini(chatHistory);
    } else {
        throw new Error('Invalid Provider Configuration');
    }

    chatHistory.push({ role: "assistant", content: replyText });
    return replyText;
}

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            // If message is missing, maybe it's a direct generation request?
            // For now, strict on message presence for chat app
            return res.status(400).json({ error: 'Message is required' });
        }

        const replyText = await handleChatLogic(userMessage);
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
        .filter(m => m.role !== 'system') // Gemini uses system_instruction or we ignore system role in contents
        .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

    // Handle system prompt if present (simple prepend for now)
    const systemMsg = messages.find(m => m.role === 'system');
    let finalContents = contents;

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

// --- OpenAI Connection Check ---
async function checkOpenAIConnection() {
    console.log("Checking OpenAI Connection...");
    if (PROVIDER !== 'openai') return;

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("❌ OPENAI_API_KEY is missing in .env");
            return;
        }

        // Simple model list check or minimal generation
        const response = await fetch(OPENAI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 5
            })
        });

        if (response.ok) {
            console.log("✅ OpenAI Connection Successful!");
        } else {
            const err = await response.text();
            console.error(`❌ OpenAI Connection Failed: ${response.status} - ${err}`);
        }
    } catch (e) {
        console.error("❌ OpenAI Connection Network Error:", e.message);
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Provider: ${PROVIDER}`);
    checkOpenAIConnection(); // Run check on start
});
