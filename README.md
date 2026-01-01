【宇宙ステーションと通信しよう - プロジェクト概要】

このプロジェクトは、国際宇宙ステーション（ISS）の位置情報をWeb-API経由で取得し、
p5.jsを用いた3Dグラフィックスで宇宙空間を視覚化するWebアプリケーションです。
スマートフォンのセンサーを活用し、AIチャット機能を通じて宇宙ステーション職員との対話を模索します。

■ ファイル構造説明

Web_last/
│
├── server.js            # [NEW] Node.js Expressサーバー (ポート8080)
├── package.json         # [NEW] 依存関係定義 (npm install でインストール)
├── prompt.md            # [NEW] AIチャットの役割定義（プロンプト）
├── README.txt           # この詳細説明ファイル
│
└── public/              # [NEW] 静的ファイル（HTML, CSS, JS）
    ├── index.html       # アプリケーションのメインエントリーポイント
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js
        ├── sketch.js
        ├── api.js
        ├── sensors.js
        └── chat.js      # [MODIFIED] サーバーAPI経由でAIと通信

■ Node.jsサーバー版の実行方法
1. ターミナルで `npm install` を実行し、ライブラリをインストールします。
2. `.env` ファイルを作成し、`GEMINI_API_KEY=あなたのAPIキー` を記述するか、環境変数に設定します。
3. `npm start` または `node server.js` で起動します。
4. ブラウザで `http://localhost:8080` にアクセスします。

■ Google Cloud へのデプロイ
- ポート8080でリッスンしているため、Cloud Run等にそのままデプロイ可能です。
- 環境変数 `GEMINI_API_KEY` をGoogle CloudのコンソールまたはSecret Managerで設定してください。


■ 機能要件内訳

1. スマホセンサー連携 (js/sensors.js)
   - 加速度センサーを用いて視点操作やインタラクションを行う
   - GPSを用いて現在地とISSの距離比較などの拡張性を確保

2. 3Dグラフィックス (js/sketch.js)
   - p5.jsのWEBGLモードを使用
   - 宇宙空間のスターフィールド、地球、ISS位置のポインターを描画

3. Web-API連携 (js/api.js)
   - http://open-notify.org/Open-Notify-API/ISS-Location-Now/ を定期的に叩き、緯度経度を取得

4. AI-chat連携 (js/chat.js)
   - チャットUIの構築
   - 「宇宙ステーション職員」としてのロールプレイ応答機能

■ 参照元
- simple-chat-sample
- generic-webapi_2
