const ThinQConnectAPI = require('./API');
const WasherDryerAccessory = require('./accessory/WasherDryerAccessory');

let Service, Characteristic, UUIDGen;

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform('homebridge-thinq', 'LgThinqPlatform', ThinQPlatform);
};

class ThinQPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.accessories = new Map();
        this.thinq = new ThinQConnectAPI(config.pat, config.clientId);

        this.api.on('didFinishLaunching', async () => {
            this.log.info('ThinQ Connect 하위 브릿지 구동 시작...');
            await this.discoverDevices();
            setInterval(() => this.updateStates(), 60000);
        });
    }

    configureAccessory(accessory) {
        this.accessories.set(accessory.UUID, accessory);
    }

    async discoverDevices() {
        try {
            const devices = await this.thinq.fetchDevices();
            for (const device of devices) {
                if (!['201', '202'].includes(device.deviceType)) continue;

                const uuid = UUIDGen.generate(device.deviceId);
                let existingAccessory = this.accessories.get(uuid);

                if (existingAccessory) {
                    this.log.info(`기존 장치 로드: ${device.alias}`);
                    new WasherDryerAccessory(this.log, this.thinq, existingAccessory, this.api);
                } else {
                    this.log.info(`새 장치 발견: ${device.alias}`);
                    const accessory = new this.api.platformAccessory(device.alias, uuid);
                    accessory.context.device = device;
                    new WasherDryerAccessory(this.log, this.thinq, accessory, this.api);
                    this.api.registerPlatformAccessories('homebridge-thinq', 'LgThinqPlatform', [accessory]);
                    this.accessories.set(uuid, accessory);
                }
            }
        } catch (e) {
            this.log.error('장치 검색 중 오류:', e.message);
        }
    }

    async updateStates() {
        try {
            const devices = await this.thinq.fetchDevices();
            for (const device of devices) {
                const uuid = UUIDGen.generate(device.deviceId);
                const accessory = this.accessories.get(uuid);
                if (accessory && accessory.instance) {
                    accessory.instance.update(device.snapshot);
                }
            }
        } catch (e) {
            this.log.error('상태 갱신 실패');
        }
    }
}