const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http'); // Import http module
const { Server } = require("socket.io"); // Import Socket.IO

require('dotenv').config();

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Initialize Socket.IO

const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());

app.use(express.static('public'));

const OpenAI = require('openai');

// OpenAI Proxy Setup
const openai = new OpenAI({
    apiKey: "dummy", // Proxy often ignores this or requires a placeholder
    baseURL: "https://openai-api-proxy-746164391621.us-west1.run.app/v1"
});

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('sensor', (data) => {
        // console.log("Sensor data:", data); // Log sensor data (commented out to avoid clutter)
        // You can emit this to other clients if needed, e.g. for visualization
        // io.emit('sensor_update', data); 
    });
});

// Load System Prompt
const promptPath = path.join(__dirname, 'prompt.md');
let systemPrompt = "You are a staff member on the ISS.";
try {
    systemPrompt = fs.readFileSync(promptPath, 'utf8');
} catch (err) {
    console.error("Failed to read prompt.md", err);
}

// Chat History management (Simple in-memory for demo)
// Format adapted for OpenAI: { role: "system" | "user" | "assistant", content: string }
const chatHistory = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: "了解しました。国際宇宙ステーション(ISS)の職員として振る舞います。" }
];

// Routes

// Serve smart.html
app.get('/smart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'smart.html'));
});

// Serve guidance.png (even if missing, route is ready)
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

        const completion = await openai.chat.completions.create({
            messages: chatHistory,
            model: "gpt-3.5-turbo", // Or any model supported by the proxy
            max_tokens: 200,
        });

        const replyText = completion.choices[0].message.content;

        // Add assistant response to history
        chatHistory.push({ role: "assistant", content: replyText });

        res.json({ reply: replyText });

    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        res.status(500).json({ reply: "通信障害が発生しました... 再送してください..." });
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}`);
});
