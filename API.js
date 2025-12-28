const axios = require('axios');

class ThinQConnectAPI {
    constructor(pat, clientId) {
        this.client = axios.create({
            baseURL: 'https://connect-pat.lgthinq.com',
            headers: {
                'Authorization': `Bearer ${pat}`,
                'x-thinq-clientid': clientId,
                'x-lge-appkey': 'LG-THINQ-CONNECT-KEY',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }

    async fetchDevices() {
        try {
            const res = await this.client.get('/v1/devices', { timeout: 5000 });

            console.log('[ThinQ] 서버 응답 수신 완료');

            if (res.data && res.data.result && res.data.result.devices) {
                return res.data.result.devices;
            }
            return [];
        } catch (e) {
            console.error(`[ThinQ] 서버 통신 실패: ${e.response?.status || e.message}`);
            if (e.response) console.error(`[ThinQ] 상세 에러: ${JSON.stringify(e.response.data)}`);
            return [];
        }
    }

    async deviceControl(deviceId, propertyId, opMode) {
        const body = {
            command: 'setControl',
            ctrlKey: 'basicCtrl',
            payload: {
                [propertyId]: opMode,
                "locationName": "MAIN"
            }
        };
        try {
            return await this.client.post(`/v1/devices/${deviceId}/control`, body);
        } catch (error) {
            console.error('제어 명령 전송 중 에러:', error.response?.data || error.message);
            throw error;
        }
    }
}
module.exports = ThinQConnectAPI;