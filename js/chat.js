class StaffChat {
    constructor() {
        this.messages = [];
        this.responses = [
            "ISSの現在の高度は約400kmです。",
            "無重力空間では水は球体になります。",
            "現在は実験モジュール「きぼう」のメンテナンス中です。",
            "地球の青さはここから見ると格別ですよ。",
            "今日は太陽フレアの影響が少し心配ですね。",
            "補給船の到着を待っているところです。"
        ];
    }

    async processInput(text) {
        // Updated to use Server-side Gemini API
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();

            // Check for trigger words in local logic for visual effects, 
            // even though the AI handles the text response.
            const lowerText = text.toLowerCase();
            if (lowerText.includes("ufo") || lowerText.includes("宇宙人")) {
                window.dispatchEvent(new CustomEvent('ufo-trigger'));
            }

            return data.reply;
        } catch (error) {
            console.error(error);
            return "通信エラー: 応答を受信できませんでした。";
        }
    }
}
