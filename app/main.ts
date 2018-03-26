/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/onoff/onoff.d.ts" />
/// <reference path="../typings/request/request.d.ts" />
/// <reference path="../typings/tsd.d.ts" />

// ---

import os = require('os');
import bunyan = require('bunyan');
import express = require('express');
import http = require('http');
import socketio = require('socket.io');
import request = require('request');

import device = require('./device');
import Device = device.Device;

import config = require('./config');
import Config = config.config;

var app = express();
var server = http.createServer(app);
var io = socketio(server);

// ---

var log = bunyan.createLogger({
    name: 'laundry_monitor',
    streams: [
        {
            type: 'rotating-file',
            path: '/var/log/laundry_monitor.log',
            period: '1d',
            count: 3
        },
        {
            stream: process.stdout
        }
    ]
});

device.log = log;

// ---

log.info('Setting up devices');

var deviceListConfiguration: device.DeviceListConfiguration = {
    pollInterval: Config.refreshInterval,
    deviceConfiguration: [{ key: 'washer', pin: 413 }, { key: 'dryer', pin: 415 }],
    deviceUpdateCallback: (device: Device, initialUpdate: boolean) => {
        if (initialUpdate) {
            return;
        }

        queueDeviceUpdate(device, undefined, 'The {name} is now {status}.');
    }
};

var devices = new device.DeviceList(deviceListConfiguration);

// ---

const deviceLastState: { [key: string]: boolean } = {};
const deviceUpdateQueue: { [key: string]: number } = {};

function queueDeviceUpdate(device: Device, header: string, deviceTemplate: string) {
    if (deviceUpdateQueue[device.key]) {
        log.info(`queueDeviceUpdate - Stopping old timer for device: ${device.key}`);
        clearTimeout(deviceUpdateQueue[device.key]);
    }

    log.info(`queueDeviceUpdate - Starting new timer for device: ${device.key}`);

    deviceUpdateQueue[device.key] = setTimeout(() => {
        if (deviceLastState[device.key] !== device.value) {
            sendTelegramDeviceUpdate([device], header, deviceTemplate);
            emitStatus(device.getStatus());
        } else {
            log.info(`queueDeviceUpdate - No change for device: ${device.key}`);
        }

        delete deviceUpdateQueue[device.key];
    }, Config.deviceDebounceInterval) as any;
}

function sendTelegramDeviceUpdate(devices: Array<Device>, header: string, deviceTemplate: string) {
    let telegramMessage = header || '';

    devices.forEach((device: Device) => {
        deviceLastState[device.key] = device.value;

        const deviceLine = deviceTemplate.replace('{name}', device.key).replace('{status}', device.value ? 'ON' : 'OFF');

        telegramMessage += `${deviceLine}\n`;
    });

    if (telegramMessage.length > 0) {
        sendTelegramMessage(telegramMessage);
    }
}

function sendTelegramMessage(message: string) {
    log.info(`Telegram message: ${message}`);

    if (!Config.enableTelegram) {
        return;
    }

    const sendChatId = Config.debug ? Config.debugChatId : Config.chatId;

    const url = `https://api.telegram.org/bot${Config.botToken}/sendMessage?chat_id=${sendChatId}&text=${encodeURIComponent(message)}`;

    request(url);
}

// ---

log.info('Starting web server');

app.get('/getStatus', (request, response) => {
    const data = devices.getStatus();

    response.end(JSON.stringify(data));
});

server.listen(Config.port, () => {
    const host = os.hostname();

    log.info(`Listening at http://${host}:${Config.port}`);
});

// ---

log.info('Starting socket.io server');

function emitStatus(status: any) {
    const socketMessage = JSON.stringify(status);

    log.info(`emitStatus: ${socketMessage}`);

    io.emit('status', socketMessage);
}

io.on('connection', (socket: SocketIO.Socket) => {
    log.info('socket.io: connection');

    socket.on('getStatus', () => {
        log.info('socket.io: getStatus');

        emitStatus(devices.getStatus());
    });

    socket.on('disconnect', () => {
        log.info('socket.io: disconnect');
    });
});

// ---

log.info('Ready');

emitStatus(devices.getStatus());
sendTelegramDeviceUpdate(devices.getDevices(), 'Powering up!\n\n', 'The {name} is currently {status}.');
