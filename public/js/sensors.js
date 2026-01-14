class SpaceSensors {
    constructor() {
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.isReady = false;
    }

    requestPermission() {
        // iOS 13+ ではモーションセンサーに許可が必要
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.startListeners();
                    }
                })
                .catch(console.error);
        } else {
            this.startListeners();
        }
    }

    updateFromSocket(data) {
        // データ構造: { a: alpha, b: beta, g: gamma, z: z }
        // p5.js の回転の期待値に基づいてマッピングを調整
        this.acceleration = {
            x: parseFloat(data.g || 0), // 左右の傾き
            y: parseFloat(data.b || 0), // 前後の傾き
            z: parseFloat(data.a || 0)  // コンパス (Alpha)
        };
    }

    startListeners() {
        window.addEventListener('devicemotion', (event) => {
            this.acceleration = event.accelerationIncludingGravity;
        });

        this.isReady = true;
        console.log("センサーがアクティブになりました");
    }
}