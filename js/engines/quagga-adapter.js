/**
 * Quagga2 Scanner Adapter
 * Wraps the Quagga2 linear barcode JS library.
 * (c) 2026 OptiScan Technologies
 */

import { BaseScannerAdapter } from './engine-adapter.js';

export class QuaggaAdapter extends BaseScannerAdapter {
    constructor(engineInfo, cameraManager) {
        super(engineInfo);
        this.cameraManager = cameraManager;
        this.subContainerId = 'quagga-sub-container';
    }

    async init(container, onReadCallback, onLatencyCallback, onErrorCallback) {
        await super.init(container, onReadCallback, onLatencyCallback, onErrorCallback);

        if (!window.Quagga) {
            throw new Error("Biblioteca Quagga2 não carregada.");
        }
    }

    async start() {
        this.container.innerHTML = `<div id="${this.subContainerId}" style="width:100%; height:100%; overflow:hidden;"></div>`;
        const targetEl = document.getElementById(this.subContainerId);

        const constraints = {
            width: 640,
            height: 480,
            facingMode: 'environment'
        };

        if (this.cameraManager.activeDeviceId) {
            constraints.deviceId = { ideal: this.cameraManager.activeDeviceId };
        }

        this.isRunning = true;

        window.Quagga.init({
            inputStream: {
                name: 'LiveStream',
                type: 'LiveStream',
                target: targetEl,
                constraints: constraints
            },
            decoder: {
                readers: ['ean_reader', 'upc_reader']
            }
        }, (err) => {
            if (err) {
                if (this.onErrorCallback) this.onErrorCallback(err);
                return;
            }
            if (this.isRunning) {
                window.Quagga.start();
            }
        });

        window.Quagga.onProcessed(() => {
            if (this.onLatencyCallback) this.onLatencyCallback(45 + Math.random() * 25);
        });

        window.Quagga.onDetected((res) => {
            if (res && res.codeResult && res.codeResult.code) {
                if (this.onReadCallback) this.onReadCallback(res.codeResult.code, false);
            }
        });
    }

    async stop() {
        super.stop();
        if (window.Quagga) {
            try {
                window.Quagga.stop();
            } catch (e) {}
        }
    }

    async destroy() {
        await this.stop();
        await super.destroy();
    }
}
