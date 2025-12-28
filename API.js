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
        const res = await this.client.get('/v1/devices');
        return res.data.result.devices;
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
        return await this.client.post(`/v1/devices/${deviceId}/control`, body);
    }
}
module.exports = ThinQConnectAPI;