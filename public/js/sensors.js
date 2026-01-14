class SpaceSensors {
    constructor() {
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.userLocation = null;
        this.isReady = false;
    }

    requestPermission() {
        // iOS 13+ requires permission for motion sensors
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
        // data: { a: alpha, b: beta, g: gamma, z: z }
        // Map to internal structure
        // Note: 'a' in data is alpha (compass), 'b' is beta (front/back), 'g' is gamma (left/right)
        // Adjusting mapping based on p5.js rotation expectations
        this.acceleration = {
            x: parseFloat(data.g || 0), // Left/Right tilt
            y: parseFloat(data.b || 0), // Front/Back tilt
            z: parseFloat(data.a || 0)  // Compass (Alpha)
        };
        // Trigger any listeners if needed, or sketch.js reads directly
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
        console.log("Sensors active");
    }
}
