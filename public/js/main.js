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
    const coordsEl = document.getElementById('iss-coords'); // New single element for coords
    const myCoordsEl = document.getElementById('my-coords');
    const chatWindow = document.getElementById('chat-window');
    const inputField = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // Initialize Socket.io for Desktop
    // Note: Assuming socket.io.js is loaded in index.html, which it wasn't explicitly in the provided file view but index.html usually has it or we can rely on window.io if loaded. 
    // Wait, the index.html had <script src="js/main.js"> but didn't explicitly load socket.io client lib in the head? 
    // Checking index from memory... wait, smart.html had it. index.html... let's check. 
    // Assuming it is available or adding logic to be safe.

    let socket;
    try {
        socket = io();

        socket.on('sensor_update', (data) => {
            // Update global sensor state for sketch.js
            window.app.sensors.updateFromSocket(data);

            // Update UI
            if (myCoordsEl) {
                // Formatting for display
                const a = parseFloat(data.a || 0).toFixed(1);
                const b = parseFloat(data.b || 0).toFixed(1);
                const g = parseFloat(data.g || 0).toFixed(1);
                myCoordsEl.textContent = `A:${a} B:${b} G:${g}`;
            }
        });

        socket.on('chat_broadcast', (msg) => {
            addMessage(msg.text, msg.role); // Re-using existing addMessage function
        });

    } catch (e) {
        console.error("Socket.io not found or failed", e);
    }

    // 1. Start API Polling
    setInterval(async () => {
        const data = await api.fetchLocation();
        if (data) {
            window.app.issData = data;
            // Format coordinates string
            const lat = parseFloat(data.latitude).toFixed(2);
            const long = parseFloat(data.longitude).toFixed(2);
            coordsEl.textContent = `Lat: ${lat}, Long: ${long}`;

            statusEl.textContent = "接続中";
            statusEl.style.color = "#00d4ff";
        }
    }, 5000); // Check every 5 seconds

    // 2. Chat Logic
    const chatBox = document.getElementById('chat-box'); // The scrollable container

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        chatWindow.appendChild(div);

        // Scroll the outer box
        if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    async function handleSend() {
        const text = inputField.value.trim();
        if (!text) return;

        // Verify socket availability
        if (socket && socket.connected) {
            // Trigger local effects (UFO) if needed, duplicating logic from chat.js for now
            // or we can keep using StaffChat for utility but not for sending.
            const lowerText = text.toLowerCase();
            if (lowerText.includes("ufo") || lowerText.includes("宇宙人")) {
                window.dispatchEvent(new CustomEvent('ufo-trigger'));
            }

            // Send via Socket to allow server to broadcast to all (Desktop & Mobile)
            // and process AI response there.

            // Check UFO alignment from sketch.js
            let target = 'iss';
            if (window.app && window.app.isUfoAligned) {
                target = 'alien';
                console.log("Sending to ALIEN");
            }

            socket.emit('chat_message', {
                text: text,
                target: target
            });

            inputField.value = '';
            // We do NOT addMessage here immediately if we wait for broadcast.
            // But for responsiveness, we could. However, to avoid duplicate if broadcast comes back...
            // Standard pattern: 
            // 1. Optimistic add? -> Need dedup logic.
            // 2. Wait for broadcast? -> Just wait. Server is fast enough.

            // Let's add a temporary loading state or just wait.
            // Actually, existing socket.on('chat_broadcast') will handle the display.

        } else {
            // Fallback if socket fails (e.g. strict firewall), though unlikely in this setup
            console.warn("Socket not connected, falling back to HTTP");
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

    // 3. UFO Event
    window.addEventListener('ufo-trigger', () => {
        console.log("UFO Spotted!");
        window.showUFO = true;
        setTimeout(() => {
            window.showUFO = false; // Disappears after 10s
        }, 10000);
    });

    // 4. Sensors & QR Code
    /* Sensors removed from desktop UI
    sensorBtn.addEventListener('click', () => {
        sensors.requestPermission();
        sensorBtn.style.display = 'none'; // Hide after click
        addMessage("センサーシステム: オンにしました。", "system");
    });
    */

    const showQrBtn = document.getElementById('show-qr-btn'); // Updated ID
    const qrOverlay = document.getElementById('qr-overlay');
    const closeQrBtn = document.getElementById('close-qr');
    let qrCodeObj = null;

    if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
            qrOverlay.style.display = 'block';
            if (!qrCodeObj) {
                // Clear previous if any (though logic prevents it)
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
