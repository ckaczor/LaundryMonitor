import _ = require('underscore');
import bunyan = require('bunyan');
import gpio = require('onoff');

export var log: bunyan.Logger;

export class DeviceConfiguration {
    key: string;
    pin: number;
}

export class DeviceListConfiguration {
    pollInterval: number;
    deviceConfiguration: Array<DeviceConfiguration>;
    deviceUpdateCallback: (device: Device, initialUpdate: boolean) => void;
}

export class DeviceList {
    private deviceList: { [key: string]: Device };

    constructor(private configuration: DeviceListConfiguration) {
        this.deviceList = {};

        configuration.deviceConfiguration.forEach((deviceConfiguration: DeviceConfiguration) => {
            this.createDevice(deviceConfiguration.key, deviceConfiguration.pin);
        });

        this.update(true);

        setInterval(this.update.bind(this), configuration.pollInterval);
    }

    private createDevice(key: string, pin: number): Device {
        const device = new Device(key, pin);

        this.deviceList[key] = device;

        return device;
    }

    getDevices(): Array<Device> {
        return _.toArray<Device>(this.deviceList);
    }

    getStatus(): any {
        var status: { [key: string]: boolean } = {};

        _.each(this.deviceList, (device: Device) => {
            status[device.key] = device.value;
        });

        return status;
    }

    private update(initialUpdate: boolean = false) {
        _.each(this.deviceList, (device: Device) => {
            var deviceChanged = device.update();

            if (deviceChanged) {
                this.configuration.deviceUpdateCallback(device, initialUpdate);

                if (log) {
                    log.info(`DeviceList.Update - ${device.toString()}`);
                }
            }
        });
    }
}

export class Device {
    private gpioPin: gpio.Gpio;

    value: boolean;

    constructor(public key: string, pin: number) {
        this.gpioPin = new gpio.Gpio(pin, 'in', 'both');
    }

    toString(): string {
        return `Device: ${this.key} = ${this.value}`;
    }

    getStatus(): any {
        const status: { [key: string]: boolean } = {};

        status[this.key] = this.value;

        return status;
    }

    update(): boolean {
        const newValue = this.gpioPin.readSync() === 0;

        const changed = (this.value !== newValue);

        this.value = newValue;

        return changed;
    }
}
