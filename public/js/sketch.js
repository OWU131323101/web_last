let angle = 0;
let issModel;
let earthTexture;
let stars = [];

function setup() {
    let container = document.getElementById('canvas-container');
    let w = container ? container.clientWidth : windowWidth;
    let h = container ? container.clientHeight : (windowHeight - 100);

    let canvas = createCanvas(w, h, WEBGL);
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

function windowResized() {
    let container = document.getElementById('canvas-container');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    } else {
        resizeCanvas(windowWidth, windowHeight - 100);
    }
}

function draw() {
    background(10); // Dark space

    // --- Interaction / Camera ---

    let camY = 0;
    let camX = 0;

    if (window.app && window.app.sensors) {
        let sensZ = window.app.sensors.acceleration.z || 0; // Alpha
        let sensY = window.app.sensors.acceleration.y || 0; // Beta

        camY = radians(sensZ);
        camX = radians(sensY);
    }

    // Add orbitControl for desktop mouse backup
    orbitControl();

    // Apply Sensor Rotation
    rotateY(-camY); // Match compass
    rotateX(-camX);

    // --- Environment ---

    // 1. Draw Stars (Background)
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

    // 3. Earth (Fixed position relative to stars for now)
    push();
    translate(0, 100, -500);
    rotateY(frameCount * 0.005);
    noStroke();
    fill(0, 100, 200);
    sphere(150);
    pop();

    // --- Game Logic: Find the ISS ---

    let targetAlpha = 180;
    let targetBeta = 45;
    let r = 400; // Orbit radius
    let x, y, z;

    // Use Real API Data if available
    if (window.app && window.app.issData && window.app.issData.latitude) {
        let lat = radians(parseFloat(window.app.issData.latitude));
        let lon = radians(parseFloat(window.app.issData.longitude));

        // Spherical Coordinates
        // P5 WebGL coords: Y is Down.
        y = -r * sin(lat);
        let r_xz = r * cos(lat);
        x = r_xz * sin(lon);
        z = r_xz * cos(lon);

        // Calculate Target Angles for the "Game" (Alignment)
        // Beta (Pitch)
        targetBeta = degrees(asin(-y / r));

        // Alpha (Yaw)
        targetAlpha = degrees(atan2(x, z));
        if (targetAlpha < 0) targetAlpha += 360;

    } else {
        // Fallback or Initial Mock Position
        x = r * cos(radians(targetBeta)) * sin(radians(targetAlpha));
        y = -r * sin(radians(targetBeta));
        z = -r * cos(radians(targetBeta)) * cos(radians(targetAlpha));
    }

    // Calculate alignment
    let currentAlpha = degrees(camY || 0);
    if (currentAlpha < 0) currentAlpha += 360;

    let currentBeta = degrees(camX || 0);

    // Alignment thresholds
    let alphaDiff = abs(targetAlpha - (currentAlpha % 360));
    if (alphaDiff > 180) alphaDiff = 360 - alphaDiff;

    let betaDiff = abs(targetBeta - currentBeta);

    let isAligned = (alphaDiff < 20 && betaDiff < 20);

    // 4. Draw ISS
    push();
    translate(x, y, z);

    // Visual feedback for alignment
    if (isAligned) {
        // Zoom Effect
        let zoom = sin(frameCount * 0.1) * 50 + 50;
        scale(1 + zoom / 200);

        stroke(0, 255, 0);
        strokeWeight(2);
        noFill();
        box(60); // Target box
    }

    rotateY(frameCount * 0.02);
    fill('#fffacd'); // LemonChiffon
    box(20); // ISS

    // Solar panels
    fill(50, 50, 150);
    translate(20, 0, 0);
    box(30, 10, 2);
    translate(-40, 0, 0);
    box(30, 10, 2);

    pop();
}
