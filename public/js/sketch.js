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

    // ランダムな星を作成
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: random(-width, width),
            y: random(-height, height),
            z: random(-1000, -500) // 背景
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

    // 1. 星を描画 (背景)
    push();
    stroke(255);
    strokeWeight(2);
    for (let s of stars) {
        point(s.x, s.y, s.z);
    }
    pop();

    // 2. ライティング
    ambientLight(50);
    directionalLight(255, 255, 255, 1, 1, -1);

    // 3. 地球 (今のところ星に対して固定位置)
    // ロジック: 接続されている場合 (issData がある場合) は非表示、それ以外は不透明で表示
    if (!window.app || !window.app.issData) {
        push();
        // ユーザーの要望「青い球体とカメラ位置が重なる」(地球 = ユーザーの位置)
        translate(0, 0, 0);
        rotateY(frameCount * 0.005);
        noStroke();
        fill(0, 100, 200); // 不透明 (透明から元に戻しました)
        sphere(150);
        pop();
    }

    // --- ゲームロジック: ISSを探せ ---

    let targetAlpha = 180;
    let targetBeta = 45;
    let r = 400; // 軌道半径
    let x, y, z;

    // 利用可能な場合は実際のAPIデータを使用
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

    // 4. ISSを描画
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

    // 5. UFOを描画 (シークレット)
    let ufoAlpha = 0; // 北
    let ufoBeta = 30; // 少し上

    // UFOのアラインメント計算
    let ufoAlphaDiff = abs(ufoAlpha - (currentAlpha % 360));
    if (ufoAlphaDiff > 180) ufoAlphaDiff = 360 - ufoAlphaDiff;
    let ufoBetaDiff = abs(ufoBeta - currentBeta);

    // ユーザーフィードバックに基づく狭い閾値 (20度)
    let isUfoAligned = (ufoAlphaDiff < 20 && ufoBetaDiff < 20);

    // Main.js で使用するためのアラインメント状態のエクスポート
    if (window.app) {
        window.app.isUfoAligned = isUfoAligned;
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
        stroke(255, 0, 255); // マゼンタ色のロックオン
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
