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
            const res = await this.client.get('/v1/devices');

            if (res.data && res.data.result && res.data.result.devices) {
                return res.data.result.devices;
            } else if (res.data && res.data.devices) {
                return res.data.devices;
            }

            return [];
        } catch (error) {
            if (error.response) {
                console.error('LG API 서버 에러 상태코드:', error.response.status);
                console.error('LG API 에러 상세 내용:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.error('네트워크 또는 기타 에러:', error.message);
            }
            throw error;
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