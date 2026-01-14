document.addEventListener('DOMContentLoaded', () => {
    console.log("アプリ初期化完了");

    // モジュールの初期化
    const api = new ISSApi();
    const chat = new StaffChat();
    const sensors = new SpaceSensors();

    // sketch.js からアクセスするためのグローバルアプリ状態
    window.app = {
        issData: null,
        sensors: sensors
    };
    window.showUFO = false;

    // UI要素
    const statusEl = document.getElementById('connection-status');
    const coordsEl = document.getElementById('iss-coords'); // 座標用の新しい単一要素
    const myCoordsEl = document.getElementById('my-coords');
    const chatWindow = document.getElementById('chat-window');
    const inputField = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // デスクトップ用 Socket.io の初期化
    let socket;
    try {
        socket = io();

        socket.on('sensor_update', (data) => {
            // sketch.js 用にグローバルセンサー状態を更新
            window.app.sensors.updateFromSocket(data);

            // UIを更新
            if (myCoordsEl) {
                // 表示用にフォーマット
                const a = parseFloat(data.a || 0).toFixed(1);
                const b = parseFloat(data.b || 0).toFixed(1);
                const g = parseFloat(data.g || 0).toFixed(1);
                myCoordsEl.textContent = `A:${a} B:${b} G:${g}`;
            }
        });

        socket.on('chat_broadcast', (msg) => {
            addMessage(msg.text, msg.role); // 既存の addMessage 関数を再利用
        });

    } catch (e) {
        console.error("Socket.io が見つからないか失敗しました", e);
    }

    // APIポーリングの開始
    setInterval(async () => {
        const data = await api.fetchLocation();
        if (data) {
            window.app.issData = data;
            // 座標文字列のフォーマット
            const lat = parseFloat(data.latitude).toFixed(2);
            const long = parseFloat(data.longitude).toFixed(2);
            coordsEl.textContent = `Lat: ${lat}, Long: ${long}`;

            statusEl.textContent = "接続中";
            statusEl.style.color = "#00d4ff";
        }
    }, 5000); // 5秒ごとにチェック

    // チャットロジック
    const chatBox = document.getElementById('chat-box'); // スクロール可能なコンテナ

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        chatWindow.appendChild(div);

        // 外側のボックスをスクロール
        if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    async function handleSend() {
        const text = inputField.value.trim();
        if (!text) return;

        // ソケットの可用性を確認
        if (socket && socket.connected) {
            // Socket経由で送信し、サーバーが全クライアントにブロードキャスト
            // そこでAI応答を処理できるようにする。

            // sketch.js から UFO のアラインメントを確認
            let target = 'iss';
            if (window.app && window.app.isUfoAligned) {
                target = 'alien';
                console.log("エイリアンに送信中");
            }

            socket.emit('chat_message', {
                text: text,
                target: target
            });

            inputField.value = '';
            // ブロードキャストを待つ場合は、ここで addMessage をすぐには呼び出しません。

        } else {
            // ソケットが失敗した場合のフォールバック（厳格なファイアウォールなど）、この設定では考えにくいですが
            console.warn("ソケット未接続、HTTPにフォールバック");
            addMessage(text, 'user');
            inputField.value = '';

            const reply = await chat.processInput(text);
            addMessage(reply, 'bot');
        }
    }

    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // センサーとQRコード
    const showQrBtn = document.getElementById('show-qr-btn'); // 更新されたID
    const qrOverlay = document.getElementById('qr-overlay');
    const closeQrBtn = document.getElementById('close-qr');
    let qrCodeObj = null;

    if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
            qrOverlay.style.display = 'block';
            if (!qrCodeObj) {
                // 以前のものがあればクリア
                document.getElementById('qrcode').innerHTML = "";
                qrCodeObj = new QRCode(document.getElementById("qrcode"), {
                    text: window.location.origin + "/smart",
                    width: 128,
                    height: 128
                });
            }
        });
    }

    if (closeQrBtn) {
        closeQrBtn.addEventListener('click', () => {
            qrOverlay.style.display = 'none';
        });
    }
});
