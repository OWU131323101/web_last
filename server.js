const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Gemini API Setup
// Note: In Google Cloud, you might use Vertex AI, but for generic compatibility we use the API key method.
// Ensure GEMINI_API_KEY is set in environment variables.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Load System Prompt
const promptPath = path.join(__dirname, 'prompt.md');
let systemPrompt = "You are a staff member on the ISS.";
try {
    systemPrompt = fs.readFileSync(promptPath, 'utf8');
} catch (err) {
    console.error("Failed to read prompt.md", err);
}

// Chat History management (Simple in-memory for demo)
// In production, use a database or session store.
const chatHistory = [
    {
        role: "user",
        parts: [{ text: systemPrompt }]
    },
    {
        role: "model",
        parts: [{ text: "了解しました。国際宇宙ステーション(ISS)の職員として振る舞います。" }]
    }
];

// Routes
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Add user message to history logic or just context
        // Check for specific keywords for "UFO mode" trigger on server side if needed
        // but here we just focus on the chat response.

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 200,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();

        // Update history (simplified)
        // chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        // chatHistory.push({ role: "model", parts: [{ text: text }] });

        res.json({ reply: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ reply: "通信障害が発生しました... 再送してください..." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}`);
});
