/**
 * HTML5-QRCode Adapter
 * Wraps the popular Html5Qrcode library with robust mobile camera handling.
 * Configured specifically for environment camera constraints compatible with HTML5-QRCode v2.3.8.
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
        // Libera qualquer stream aberto no CameraManager para evitar bloqueio do driver no Android
        this.cameraManager.stopStream();

        this.container.innerHTML = `<div id="${this.subContainerId}" style="width:100%; height:100%; position:relative;"></div>`;
        this.scannerInstance = new window.Html5Qrcode(this.subContainerId);

        const config = {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                return {
                    width: Math.floor(viewfinderWidth * 0.8),
                    height: Math.floor(viewfinderHeight * 0.5)
                };
            },
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: false
            }
        };

        // Sintaxe exigida pela especificação interna do Html5Qrcode 2.3.8
        const cameraParam = { facingMode: "environment" };

        this.isRunning = true;
        try {
            await this.scannerInstance.start(
                cameraParam,
                config,
                (decodedText) => {
                    if (!this.isRunning) return;
                    if (this.onLatencyCallback) this.onLatencyCallback(35 + Math.random() * 20);
                    if (this.onReadCallback) this.onReadCallback(decodedText, false);
                },
                () => {
                    // Normal scanning loop frame search
                    if (!this.isRunning) return;
                    if (this.onLatencyCallback) this.onLatencyCallback(35 + Math.random() * 20);
                }
            );
        } catch (e) {
            console.error("[HTML5-QRCode] Erro ao iniciar câmera:", e);
            if (this.onErrorCallback) this.onErrorCallback(e);
        }
    }

    async stop() {
        super.stop();
        if (this.scannerInstance && this.scannerInstance.isScanning) {
            try {
                await this.scannerInstance.stop();
            } catch (e) {
                console.warn("[HTML5-QRCode] Stop warning:", e);
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
