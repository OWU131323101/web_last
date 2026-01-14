class ISSApi {
    constructor() {
        this.url = 'https://api.wheretheiss.at/v1/satellites/25544'; // HTTPS 互換
        this.data = null;
        this.lastUpdate = 0;
    }

    async fetchLocation() {
        try {
            const response = await fetch(this.url);
            if (!response.ok) throw new Error('ネットワーク応答が正常ではありません');
            const json = await response.json();

            // wheretheiss.at は緯度/経度をルート直下で返します
            if (json.latitude && json.longitude) {
                this.data = {
                    latitude: json.latitude,
                    longitude: json.longitude
                };
                this.lastUpdate = Date.now();
                return this.data;
            }
        } catch (error) {
            console.error('API エラー:', error);
            // APIが失敗した場合のデモ用フォールバックデータ（混合コンテンツブロックなどでよくある）
            return { latitude: '0', longitude: '0' };
        }
    }
}
