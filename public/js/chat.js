class StaffChat {
    async processInput(text) {
        // Socket.IOが使えない場合のバックアップ手段として機能
        try {
            const response = await fetch('/api/chat', {
                method: 'POST', //データを送信
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) throw new Error('API エラー');

            // サーバーから返ってきたAIの返答を受け取る
            const data = await response.json();

            // AIの返答テキストを返す
            return data.reply;

        } catch (error) {
            // エラー処理
            console.error(error);
            return "通信エラー: 応答を受信できませんでした。";
        }
    }
}