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

    // --- Interaction / Camera ---
    // Use Compass (Alpha) for Y-axis rotation (0-360)
    // Use Beta for X-axis rotation (-180 to 180)

    let camY = 0;
    let camX = 0;

    if (window.app && window.app.sensors) {
        // Sensor mapping
        // Acceleration Z mapped from updateFromSocket is Alpha (Compass)
        // Acceleration X is Gamma (Left/Right), Y is Beta (Front/Back)

        // Let's use Alpha for horizontal look (Y-axis rotation)
        // Let's use Beta for vertical look (X-axis rotation)

        let sensZ = window.app.sensors.acceleration.z || 0; // Alpha
        let sensY = window.app.sensors.acceleration.y || 0; // Beta

        camY = radians(sensZ);
        camX = radians(sensY);
    }

    // Add orbitControl for desktop mouse backup
    orbitControl();

    // Apply Sensor Rotation
    // Note: p5.js camera or world rotation
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
    // Target Position: Specific angle
    // Let's say ISS is at Alpha 180, Beta 45
    let targetAlpha = 180;
    let targetBeta = 45;

    // Calculate alignment
    // (Simplification: just checking raw sensor values against target)
    let currentAlpha = degrees(camY); // approx
    if (currentAlpha < 0) currentAlpha += 360;

    let currentBeta = degrees(camX);

    // Alignment thresholds
    let alphaDiff = abs(targetAlpha - (currentAlpha % 360));
    if (alphaDiff > 180) alphaDiff = 360 - alphaDiff;

    let betaDiff = abs(targetBeta - currentBeta);

    let isAligned = (alphaDiff < 15 && betaDiff < 15);

    // 4. Draw ISS
    push();
    // Position ISS in the sky at the target angles
    // Convert spherical to cartesian
    let r = 400; // Distance
    let x = r * cos(radians(targetBeta)) * sin(radians(targetAlpha));
    let y = -r * sin(radians(targetBeta));
    let z = -r * cos(radians(targetBeta)) * cos(radians(targetAlpha));

    translate(x, y, z);

    // Visual feedback for alignment
    if (isAligned) {
        // Zoom Effect
        let zoom = sin(frameCount * 0.1) * 50 + 50;
        translate(0, 0, zoom);
        stroke(0, 255, 0);
        strokeWeight(2);
        noFill();
        box(60); // Target box
    }

    rotateY(frameCount * 0.02);
    fill(255, 0, 0);
    box(20); // ISS

    // Solar panels
    fill(50, 50, 150);
    translate(20, 0, 0);
    box(30, 10, 2);
    translate(-40, 0, 0);
    box(30, 10, 2);

    pop();

    // 5. Crosshair / HUD (Fixed to camera)
    // We need to undo rotations to draw fixed HUD
    // Or just draw HTML overlay. HTML overlay is better performance-wise usually,
    // but here we can just draw at the end of draw() if we reset matrix? 
    // Actually easier to do generic HUD in HTML, but here's a "Locked" text if aligned.
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight - 100);
}
