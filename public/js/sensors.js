class SpaceSensors {
    constructor() {
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.userLocation = null;
        this.isReady = false;
    }

    requestPermission() {
        // iOS 13+ ではモーションセンサーに許可が必要です
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
        // 内部構造へのマッピング
        // 注意: データの 'a' は alpha (コンパス), 'b' は beta (前後), 'g' は gamma (左右)
        // p5.js の回転の期待値に基づいてマッピングを調整
        this.acceleration = {
            x: parseFloat(data.g || 0), // 左右の傾き
            y: parseFloat(data.b || 0), // 前後の傾き
            z: parseFloat(data.a || 0)  // コンパス (Alpha)
        };
        // 必要に応じてリスナーをトリガーするか、sketch.js が直接読み取ります
    }

    startListeners() {
        window.addEventListener('devicemotion', (event) => {
            this.acceleration = event.accelerationIncludingGravity;
        });

        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        long: position.coords.longitude
                    };
                },
                (err) => console.error(err)
            );
        }
        this.isReady = true;
        console.log("センサーがアクティブになりました");
    }
}
