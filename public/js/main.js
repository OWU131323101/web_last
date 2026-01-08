document.addEventListener('DOMContentLoaded', () => {
    console.log("App Initialized");

    // Initialize modules
    const api = new ISSApi();
    const chat = new StaffChat();
    const sensors = new SpaceSensors();

    // Global app state for sketch.js to access
    window.app = {
        issData: null,
        sensors: sensors
    };
    window.showUFO = false;

    // UI Elements
    const statusEl = document.getElementById('connection-status');
    const latEl = document.getElementById('iss-lat');
    const longEl = document.getElementById('iss-long');
    const chatWindow = document.getElementById('chat-window');
    const inputField = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const sensorBtn = document.getElementById('enable-sensors');

    // 1. Start API Polling
    setInterval(async () => {
        const data = await api.fetchLocation();
        if (data) {
            window.app.issData = data;
            latEl.textContent = parseFloat(data.latitude).toFixed(2);
            longEl.textContent = parseFloat(data.longitude).toFixed(2);
            statusEl.textContent = "CONNECTED";
            statusEl.style.color = "#00d4ff";
        }
    }, 5000); // Check every 5 seconds

    // 2. Chat Logic
    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function handleSend() {
        const text = inputField.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        inputField.value = '';

        // Add loading indicator or plain wait
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.textContent = "...";
        chatWindow.appendChild(loadingDiv);

        const reply = await chat.processInput(text);

        // Remove loading and show reply
        chatWindow.removeChild(loadingDiv);
        addMessage(reply, 'bot');
    }

    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // 3. UFO Event
    window.addEventListener('ufo-trigger', () => {
        console.log("UFO Spotted!");
        window.showUFO = true;
        setTimeout(() => {
            window.showUFO = false; // Disappears after 10s
        }, 10000);
    });

    // 4. Sensors & QR Code
    sensorBtn.addEventListener('click', () => {
        sensors.requestPermission();
        sensorBtn.style.display = 'none'; // Hide after click
        addMessage("センサーシステム: オンにしました。", "system");
    });

    const showQrBtn = document.getElementById('show-qr');
    const qrOverlay = document.getElementById('qr-overlay');
    const closeQrBtn = document.getElementById('close-qr');
    let qrCodeObj = null;

    showQrBtn.addEventListener('click', () => {
        qrOverlay.style.display = 'block';
        if (!qrCodeObj) {
            // Clear previous if any (though logic prevents it)
            document.getElementById('qrcode').innerHTML = "";
            qrCodeObj = new QRCode(document.getElementById("qrcode"), {
                text: window.location.href,
                width: 128,
                height: 128
            });
        }
    });

    closeQrBtn.addEventListener('click', () => {
        qrOverlay.style.display = 'none';
    });
});
