class ISSApi {
    constructor() {
        this.url = 'http://api.open-notify.org/iss-now.json'; // Note: HTTP only
        this.data = null;
        this.lastUpdate = 0;
    }

    async fetchLocation() {
        try {
            // In a real HTTPS hosted environment, this requires a proxy.
            // For local dev, pure HTTP or a CORS proxy is needed.
            // Using a CORS proxy for robustness if needed, but trying direct first.
            const response = await fetch(this.url);
            if (!response.ok) throw new Error('Network response was not ok');
            const json = await response.json();
            
            if (json.message === 'success') {
                this.data = json.iss_position;
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
