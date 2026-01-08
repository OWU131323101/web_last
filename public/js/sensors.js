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
