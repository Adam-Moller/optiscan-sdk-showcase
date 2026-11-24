/**
 * HTML5-QRCode Adapter
 * Wraps the popular Html5Qrcode library.
 * (c) 2026 OptiScan Technologies
 */

import { BaseScannerAdapter } from './engine-adapter.js';

export class Html5QrAdapter extends BaseScannerAdapter {
    constructor(engineInfo, cameraManager) {
        super(engineInfo);
        this.cameraManager = cameraManager;
        this.scannerInstance = null;
        this.subContainerId = 'html5qr-sub-container';
    }

    async init(container, onReadCallback, onLatencyCallback, onErrorCallback) {
        await super.init(container, onReadCallback, onLatencyCallback, onErrorCallback);

        if (!window.Html5Qrcode) {
            throw new Error("Biblioteca HTML5-QRCode não carregada.");
        }
    }

    async start() {
        this.container.innerHTML = `<div id="${this.subContainerId}" style="width:100%; height:100%;"></div>`;
        this.scannerInstance = new window.Html5Qrcode(this.subContainerId);

        const config = { fps: 15, qrbox: { width: 300, height: 160 } };
        const cameraParam = this.cameraManager.activeDeviceId 
            ? { deviceId: { ideal: this.cameraManager.activeDeviceId } }
            : { facingMode: 'environment' };

        this.isRunning = true;
        try {
            await this.scannerInstance.start(
                cameraParam,
                config,
                (decodedText) => {
                    if (this.onLatencyCallback) this.onLatencyCallback(35 + Math.random() * 20);
                    if (this.onReadCallback) this.onReadCallback(decodedText, false);
                },
                () => {
                    // Frame scan failed (normal search)
                    if (this.onLatencyCallback) this.onLatencyCallback(35 + Math.random() * 20);
                }
            );
        } catch (e) {
            if (this.onErrorCallback) this.onErrorCallback(e);
        }
    }

    async stop() {
        super.stop();
        if (this.scannerInstance && this.scannerInstance.isScanning) {
            try {
                await this.scannerInstance.stop();
            } catch (e) {
                console.warn(e);
            }
        }
    }

    async destroy() {
        await this.stop();
        if (this.scannerInstance) {
            try {
                await this.scannerInstance.clear();
            } catch (e) {}
            this.scannerInstance = null;
        }
        await super.destroy();
    }
}
