class WasherDryerAccessory {
    constructor(log, api, accessory, homebridge) {
        this.log = log;
        this.api = api;
        this.accessory = accessory;
        this.device = accessory.context.device;
        this.snapshot = this.device.snapshot?.washerDryer || this.device.snapshot || {};
        this.isRunning = false;
        this.modeKey = this.device.deviceType === '201' ? 'washerOperationMode' : 'dryerOperationMode';

        this.accessory.instance = this;

        const { Service, Characteristic } = homebridge.hap;

        // Faucet
        this.faucet = this.accessory.getService(Service.Valve) || this.accessory.addService(Service.Valve, this.device.alias, 'faucet');
        this.faucet.getCharacteristic(Characteristic.Active)
            .onGet(() => this.status.isPowerOn ? 1 : 0)
            .onSet(async (val) => {
                const cmd = val === 1 ? 'START' : 'STOP';
                await this.api.deviceControl(this.device.deviceId, this.modeKey, cmd);
            });
        this.faucet.setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.WATER_FAUCET);

        this.faucet.getCharacteristic(Characteristic.InUse)
            .onGet(() => this.status.isRunning ? 1 : 0);

        this.faucet.getCharacteristic(Characteristic.RemainingDuration)
            .setProps({ maxValue: 86400 })
            .onGet(() => this.status.remainDuration);

        // Power Off Switch
        const pwrName = `${this.device.alias} Power Off`;
        this.powerSwitch = this.accessory.getService(pwrName) || this.accessory.addService(Service.Switch, pwrName, 'pwr-off');
        this.powerSwitch.getCharacteristic(Characteristic.On)
            .onGet(() => false)
            .onSet(async (val) => {
                if (val) {
                    await this.api.deviceControl(this.device.deviceId, this.modeKey, 'POWER_OFF');
                    setTimeout(() => this.powerSwitch.updateCharacteristic(Characteristic.On, false), 1000);
                }
            });

        // Sensors
        this.finishSensor = this.accessory.getService('Program Finished') || this.accessory.addService(Service.ContactSensor, 'Program Finished', 'fin-sn');
        this.tubCleanSensor = this.accessory.getService('Tub Clean Coach') || this.accessory.addService(Service.OccupancySensor, 'Tub Clean Coach', 'tc-sn');

        // 하위 브릿지 묶기
        this.faucet.addLinkedService(this.powerSwitch);
        this.faucet.addLinkedService(this.finishSensor);
        this.faucet.addLinkedService(this.tubCleanSensor);
    }

    get status() {
        const d = this.snapshot;
        const isPowerOn = !['POWEROFF', 'POWERFAIL'].includes(d.state);
        const NOT_RUNNING = ['COOLDOWN', 'POWEROFF', 'POWERFAIL', 'INITIAL', 'PAUSE', 'END'];
        const isRunning = isPowerOn && !NOT_RUNNING.includes(d.state);
        return {
            isPowerOn, isRunning,
            remainDuration: isRunning ? (parseInt(d.remainTimeHour || 0) * 3600 + parseInt(d.remainTimeMinute || 0) * 60) : 0,
            TCLCount: parseInt(d.TCLCount || 0)
        };
    }

    update(newSnapshot) {
        this.snapshot = newSnapshot.washerDryer || newSnapshot;
        const { Characteristic } = require('homebridge').hap;
        const s = this.status;

        this.faucet.updateCharacteristic(Characteristic.Active, s.isPowerOn ? 1 : 0);
        this.faucet.updateCharacteristic(Characteristic.InUse, s.isRunning ? 1 : 0);
        this.faucet.updateCharacteristic(Characteristic.RemainingDuration, s.remainDuration);

        if (this.isRunning && !s.isRunning) {
            this.finishSensor.updateCharacteristic(Characteristic.ContactSensorState, 1);
            setTimeout(() => this.finishSensor.updateCharacteristic(Characteristic.ContactSensorState, 0), 10 * 60000);
        }
        this.isRunning = s.isRunning;
        this.tubCleanSensor.updateCharacteristic(Characteristic.OccupancyDetected, s.TCLCount >= 30 ? 1 : 0);
    }
}
module.exports = WasherDryerAccessory;