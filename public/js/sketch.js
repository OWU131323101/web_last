let angle = 0;
let issModel;
let earthTexture;
let stars = [];

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight - 100, WEBGL); // Adjust height for header
    canvas.parent('canvas-container');

    // Create random stars
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: random(-width, width),
            y: random(-height, height),
            z: random(-1000, -500) // Background
        });
    }
}

function draw() {
    background(10); // Dark space

    // Camera control via mouse (or touch) + sensors could be added here
    orbitControl();

    // Sensor interaction: Rotate world based on phone tilt
    if (window.app && window.app.sensors && window.app.sensors.isReady) {
        const acc = window.app.sensors.acceleration;
        // Slight rotation based on tilt (assuming device is held upright-ish or flat)
        // x: Left/Right tilt, y: Forward/Back tilt
        if (acc.x) rotateZ(radians(acc.x * 2));
        if (acc.y) rotateX(radians(acc.y * 2));
    }

    // 1. Draw Stars
    push();
    stroke(255);
    strokeWeight(2);
    for (let s of stars) {
        point(s.x, s.y, s.z);
    }
    pop();

    // 2. Lighting
    ambientLight(50);
    directionalLight(255, 255, 255, 1, 1, -1);

    // 3. Earth
    push();
    rotateY(frameCount * 0.005);
    noStroke();
    fill(0, 100, 200);
    sphere(150); // Simple blue sphere for Earth
    pop();

    // 4. ISS Representation (Red orb orbiting)
    push();

    // Calculate position based on API (Mocking visualization here)
    // In real implementation, map lat/long to 3D sphere coordinates
    // For now, let's just make it orbit

    // Use data from global MAIN app if available, else rotate
    if (window.app && window.app.issData) {
        // TODO: Convert Lat/Long to 3D vector
        // For demo, we just animate
    }

    rotateY(frameCount * 0.02); // Orbit speed
    translate(200, 0, 0); // Distance from Earth

    fill(255, 0, 0);
    box(10); // Tiny ISS

    // UFO Logic (triggered by chat)
    if (window.showUFO) {
        translate(50, 50, 0);
        fill(0, 255, 0);
        ellipsoid(10, 5, 10);
    }
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight - 100);
}
