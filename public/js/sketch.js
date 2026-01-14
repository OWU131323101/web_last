let stars = [];

function setup() {
    let container = document.getElementById('canvas-container');
    let w = container ? container.clientWidth : windowWidth;
    let h = container ? container.clientHeight : (windowHeight - 100);

    let canvas = createCanvas(w, h, WEBGL);
    canvas.parent('canvas-container');

    // ランダムな星を作成
    for (let i = 0; i < 500; i++) {
        stars.push({
            x: random(-2000, 2000),
            y: random(-2000, 2000),
            z: random(-2000, 2000)
        });
    }
}

// 前回のアラインメント状態を保持
let previousAlignmentState = false;

function windowResized() {
    let container = document.getElementById('canvas-container');
    if (container) {
        resizeCanvas(container.clientWidth, container.clientHeight);
    } else {
        resizeCanvas(windowWidth, windowHeight - 100);
    }
}

function draw() {
    background(10); // 暗い宇宙空間

    // --- インタラクション / カメラ ---

    let camY = 0;
    let camX = 0;

    if (window.app && window.app.sensors) {
        let sensZ = window.app.sensors.acceleration.z || 0; // アルファ (Alpha)
        let sensY = window.app.sensors.acceleration.y || 0; // ベータ (Beta)

        camY = radians(sensZ);
        camX = radians(sensY);
    }

    // デスクトップのマウス操作バックアップのために orbitControl を追加
    orbitControl();

    // センサーの回転を適用
    rotateY(-camY); // コンパスに合わせる
    rotateX(-camX);

    // --- 環境 ---

    // 星を描画 (背景)
    push();
    stroke(255);
    strokeWeight(2);
    for (let s of stars) {
        point(s.x, s.y, s.z);
    }
    pop();

    // ライティング
    ambientLight(50);
    directionalLight(255, 255, 255, 1, 1, -1);

    // 地球
    // ロジック: モバイルが接続されている場合 (isMobileConnected) は非表示、それ以外は不透明で表示
    // 接続ボタンを押すまでは地球が表示され、接続後にISS/宇宙空間モードになる
    if (!window.app || !window.app.isMobileConnected) {
        push();
        translate(0, 0, 0);
        rotateY(frameCount * 0.005);
        noStroke();
        fill(0, 100, 200);
        sphere(150);
        pop();
    }

    // --- ゲームロジック: ISSを探す ---

    let targetAlpha = 180;
    let targetBeta = 45;
    let r = 400; // 軌道半径
    let x, y, z;

    // 実際のAPIデータを使用
    if (window.app && window.app.issData && window.app.issData.latitude) {
        let lat = radians(parseFloat(window.app.issData.latitude));
        let lon = radians(parseFloat(window.app.issData.longitude));

        // 球面座標
        y = -r * sin(lat);
        let r_xz = r * cos(lat);
        x = r_xz * sin(lon);
        z = r_xz * cos(lon);

        targetBeta = degrees(asin(-y / r));
        targetAlpha = degrees(atan2(x, z));
        if (targetAlpha < 0) targetAlpha += 360;
    } else {
        // フォールバック
        x = r * cos(radians(targetBeta)) * sin(radians(targetAlpha));
        y = -r * sin(radians(targetBeta));
        z = -r * cos(radians(targetBeta)) * cos(radians(targetAlpha));
    }

    // アラインメント計算
    let currentAlpha = degrees(camY || 0);
    if (currentAlpha < 0) currentAlpha += 360;

    let currentBeta = degrees(camX || 0);

    // アラインメント閾値
    let alphaDiff = abs(targetAlpha - (currentAlpha % 360));
    if (alphaDiff > 180) alphaDiff = 360 - alphaDiff;

    let betaDiff = abs(targetBeta - currentBeta);

    let isAligned = (alphaDiff < 20 && betaDiff < 20);

    // ISSを描画
    push();
    translate(x, y, z);

    if (isAligned) {
        // ズーム効果
        let zoom = sin(frameCount * 0.1) * 50 + 50;
        scale(1 + zoom / 200);

        stroke(0, 255, 0);
        strokeWeight(2);
        noFill();
        box(60); // ターゲットボックス
    }

    rotateY(frameCount * 0.02);
    fill('#fffacd'); // レモンシフォン色
    box(20); // ISS

    // ソーラーパネル
    fill(50, 50, 150);
    translate(20, 0, 0);
    box(30, 10, 2);
    translate(-40, 0, 0);
    box(30, 10, 2);

    pop();

    // UFOを描画
    let ufoAlpha = 0; // 北
    let ufoBeta = 30; // 少し上

    // UFOのアラインメント計算
    let ufoAlphaDiff = abs(ufoAlpha - (currentAlpha % 360));
    if (ufoAlphaDiff > 180) ufoAlphaDiff = 360 - ufoAlphaDiff;
    let ufoBetaDiff = abs(ufoBeta - currentBeta);

    // 判定範囲の調整
    let isUfoAligned = (ufoAlphaDiff < 20 && ufoBetaDiff < 20);

    // Main.js で使用するためのアラインメント状態のエクスポート
    if (window.app) {
        window.app.isUfoAligned = isUfoAligned;

        // 状態が変化したときだけ報告
        if (window.app.reportAlignment && isUfoAligned !== previousAlignmentState) {
            window.app.reportAlignment(isUfoAligned);
            previousAlignmentState = isUfoAligned;
            if (isUfoAligned) console.log("UFO Locked!");
        }
    }

    push();
    // UFOの位置
    let ufoR = 350;
    let ux = ufoR * cos(radians(ufoBeta)) * sin(radians(ufoAlpha));
    let uy = -ufoR * sin(radians(ufoBeta));
    let uz = -ufoR * cos(radians(ufoBeta)) * cos(radians(ufoAlpha));

    translate(ux, uy, uz);

    // 常に大体カメラの方を向くか、回転させる
    rotateY(frameCount * 0.05);

    // UFOを描画
    if (isUfoAligned) {
        // 視覚的合図: 点滅または拡大縮小
        scale(1.2);
        stroke(255, 0, 255); // ロックオン
        noFill();
        circle(0, 0, 50);
    }

    noStroke();
    // ドーム
    fill(0, 255, 255, 150);
    sphere(10);
    // 円盤
    fill(100);
    ellipsoid(30, 5, 30);

    pop();
}
