class ISSApi {
    constructor() {
        this.url = 'https://api.wheretheiss.at/v1/satellites/25544'; // HTTPS compatible
        this.data = null;
        this.lastUpdate = 0;
    }

    async fetchLocation() {
        try {
            const response = await fetch(this.url);
            if (!response.ok) throw new Error('Network response was not ok');
            const json = await response.json();

            // wheretheiss.at returns latitude/longitude directly in root
            if (json.latitude && json.longitude) {
                this.data = {
                    latitude: json.latitude,
                    longitude: json.longitude
                };
                this.lastUpdate = Date.now();
                return this.data;
            }
        } catch (error) {
            console.error('API Error:', error);
            // Fallback mock data for demo if API fails (common with mixed content blocking)
            return { latitude: '0', longitude: '0' };
        }
    }
}
