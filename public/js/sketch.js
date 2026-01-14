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
    // User requested "Blue sphere and camera position overlap" (Earth = User position)
    translate(0, 0, 0);
    rotateY(frameCount * 0.005);
    noStroke();
    fill(0, 100, 200, 50); // Transparent blue to allow seeing through "center of earth"
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
        y = -r * sin(lat);
        let r_xz = r * cos(lat);
        x = r_xz * sin(lon);
        z = r_xz * cos(lon);

        targetBeta = degrees(asin(-y / r));
        targetAlpha = degrees(atan2(x, z));
        if (targetAlpha < 0) targetAlpha += 360;
    } else {
        // Fallback
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

    // 5. Draw UFO (Secret)
    let ufoAlpha = 0; // North
    let ufoBeta = 30; // Slightly Up

    // Calculate UFO Alignment
    let ufoAlphaDiff = abs(ufoAlpha - (currentAlpha % 360));
    if (ufoAlphaDiff > 180) ufoAlphaDiff = 360 - ufoAlphaDiff;
    let ufoBetaDiff = abs(ufoBeta - currentBeta);

    // Narrower threshold based on user feedback (20 degrees)
    let isUfoAligned = (ufoAlphaDiff < 20 && ufoBetaDiff < 20);

    // Export alignment state for Main.js to use
    if (window.app) {
        window.app.isUfoAligned = isUfoAligned;
    }

    push();
    // UFO Position
    let ufoR = 350;
    let ux = ufoR * cos(radians(ufoBeta)) * sin(radians(ufoAlpha));
    let uy = -ufoR * sin(radians(ufoBeta));
    let uz = -ufoR * cos(radians(ufoBeta)) * cos(radians(ufoAlpha));

    translate(ux, uy, uz);

    // Always face camera roughly or spin
    rotateY(frameCount * 0.05);

    // Draw UFO
    if (isUfoAligned) {
        // Visual cue: Pulsing or scaling
        scale(1.2);
        stroke(255, 0, 255); // Magenta lock-on
        noFill();
        circle(0, 0, 50);
    }

    noStroke();
    // Dome
    fill(0, 255, 255, 150);
    sphere(10);
    // Disc
    fill(100);
    ellipsoid(30, 5, 30);

    pop();
}
