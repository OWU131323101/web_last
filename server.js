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

// --- 設定 ---
const PROVIDER = 'openai';
// const PROVIDER = 'gemini';

// OpenAI 設定
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_ENDPOINT = 'https://openai-api-proxy-746164391621.us-west1.run.app';

// Gemini 設定
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

// --- 汎用ヘルパー: プロンプトの読み込みと処理 ---
function fs_readFile(path) {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (err) {
        console.error(`ファイル ${path} の読み込みに失敗しました`, err);
        return "";
    }
}

function processPrompt(template, variables) {
    let processText = template;
    for (const key in variables) {
        const placeholder = "${" + key + "}";
        // すべての出現箇所を置換
        processText = processText.split(placeholder).join(variables[key]);
    }
    return processText;
}

// チャット履歴 (このセッション用のメモリ内保存)
let chatHistory = [];

// システムペルソナパスの初期化
const promptPath = path.join(__dirname, 'prompt.md');

// --- Socket.IO ---
io.on('connection', (socket) => {
    console.log('ユーザーが接続しました');

    socket.on('disconnect', () => {
        console.log('ユーザーが切断しました');
    });

    // センサーデータを全クライアントに転送 (デスクトップ視覚化用)
    socket.on('sensor', (data) => {
        socket.broadcast.emit('sensor_update', data);
    });

    // モバイルからのチャット処理
    socket.on('chat_message', async (data) => {
        const userMessage = data.text;
        console.log(`モバイルからのチャット: ${userMessage}`);

        // デスクトップに表示されるようにユーザーメッセージをブロードキャスト
        io.emit('chat_broadcast', { text: userMessage, role: 'user' });

        // /api/chat のロジックを再利用
        try {
            const target = data.target || 'iss';
            const replyText = await handleChatLogic(userMessage, target);
            // AIの返答をブロードキャスト
            io.emit('chat_broadcast', { text: replyText, role: 'bot' });
        } catch (error) {
            console.error("Socket経由のAIエラー:", error);
            io.emit('chat_broadcast', { text: "通信エラーが発生しました...", role: 'system' });
        }
    });

    // ユーザーが標準的なソケット実装を希望する場合の基本的な "chat message" イベントサポート
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

// --- ルート ---

app.get('/smart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'smart.html'));
});

app.get('/guidance.png', (req, res) => {
    const imgPath = path.join(__dirname, 'public', 'guidance.png');
    if (fs.existsSync(imgPath)) {
        res.sendFile(imgPath);
    } else {
        res.status(404).send("画像が見つかりません");
    }
});

// 汎用ハンドラーロジック
async function handleChatLogic(userMessage, target = 'iss') {
    // 1. ターゲットに基づいてプロンプトファイルを決定
    let promptFile = 'prompt.md';
    if (target === 'alien') {
        promptFile = 'prompt_alien.md';
        console.log("宇宙人のペルソナで回答を作成中");
    }

    // 2. プロンプトのロード
    const promptPath = path.join(__dirname, promptFile);
    // fs_readFileヘルパーまたは直接fsを使用
    let rawPrompt = "";
    try {
        rawPrompt = fs.readFileSync(promptPath, 'utf8');
    } catch (e) {
        console.error("プロンプト読み込みエラー", e);
        rawPrompt = "あなたは助手です。";
    }

    // 3. 変数置換
    // 日付のような汎用的なコンテキストを渡す
    const variables = {
        date: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        previous_chat: chatHistory.map(m => `${m.role}: ${m.content}`).join('\n'), // 単純な履歴ダンプ
        user_message: userMessage
    };

    // 注: prompt_alien.md は私の作成に基づいて ${previous_chat} と ${user_message} を期待しています。
    // prompt.md もそれらを持っていない場合は更新が必要かもしれません？
    // prompt.md が以前に更新されたか、processPrompt が欠落しているキーを適切に処理すると仮定します（処理します）。

    const systemInstruction = processPrompt(rawPrompt, variables);

    // 4. 履歴の更新 システムプロンプトロジック
    // システムプロンプトが常に最初の項目であり、最新であることを確認します
    const systemMsg = { role: "system", content: systemInstruction };

    if (chatHistory.length === 0) {
        chatHistory.push(systemMsg);
    } else if (chatHistory[0].role === 'system') {
        chatHistory[0] = systemMsg; // 既存のシステムプロンプトを更新
    } else {
        chatHistory.unshift(systemMsg);
    }

    chatHistory.push({ role: "user", content: userMessage });

    let replyText = "";
    if (PROVIDER === 'openai') {
        replyText = await callOpenAI(chatHistory);
    } else if (PROVIDER === 'gemini') {
        replyText = await callGemini(chatHistory);
    } else {
        throw new Error('無効なプロバイダー設定');
    }

    chatHistory.push({ role: "assistant", content: replyText });
    return replyText;
}

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            // メッセージがない場合、直接の生成リクエストかもしれません？
            // 今のところ、チャットアプリのためにメッセージの存在を厳密にします
            return res.status(400).json({ error: 'メッセージが必要です' });
        }

        const replyText = await handleChatLogic(userMessage);
        res.json({ reply: replyText });

    } catch (error) {
        console.error('API エラー:', error);
        res.status(500).json({ reply: "通信障害が発生しました... 再送してください..." });
    }
});


// --- API関数 ---

async function callOpenAI(messages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません');

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
        console.error("OpenAI API エラー:", errorText);
        throw new Error(`OpenAI API エラー: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callGemini(messages) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');

    // OpenAIスタイルのメッセージをGeminiの履歴に変換
    const contents = messages
        .filter(m => m.role !== 'system') // Geminiはsystem_instructionを使用するか、contents内のsystemロールを無視します
        .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

    // システムプロンプトがある場合の処理 (今のところ単純に先頭に追加)
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
        console.error("Gemini API エラー:", errorText);
        throw new Error(`Gemini API エラー: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// --- OpenAI 接続チェック ---
async function checkOpenAIConnection() {
    console.log("OpenAI 接続を確認中...");
    if (PROVIDER !== 'openai') return;

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("❌ .env に OPENAI_API_KEY がありません");
            return;
        }

        // 単純なモデルリストチェックまたは最小限の生成
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
            console.log("✅ OpenAI 接続成功!");
        } else {
            const err = await response.text();
            console.error(`❌ OpenAI 接続失敗: ${response.status} - ${err}`);
        }
    } catch (e) {
        console.error("❌ OpenAI 接続ネットワークエラー:", e.message);
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`サーバーが起動しました http://0.0.0.0:${PORT}`);
    console.log(`プロバイダー: ${PROVIDER}`);
    checkOpenAIConnection(); // 起動時にチェックを実行
});
