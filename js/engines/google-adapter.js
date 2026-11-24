/**
 * Google Barcode Detection API Adapter (Chromium Native)
 * Wraps the browser-native BarcodeDetector API for benchmarking.
 * (c) 2026 OptiScan Technologies
 */

import { BaseScannerAdapter } from './engine-adapter.js';

export class GoogleDetectorAdapter extends BaseScannerAdapter {
    constructor(engineInfo, cameraManager) {
        super(engineInfo);
        this.cameraManager = cameraManager;
        this.videoElement = null;
        this.animationId = null;
        this.detector = null;
    }

    async init(container, onReadCallback, onLatencyCallback, onErrorCallback) {
        await super.init(container, onReadCallback, onLatencyCallback, onErrorCallback);

        if (!('BarcodeDetector' in window)) {
            throw new Error("BarcodeDetector API não suportada neste navegador (requer Chrome/Chromium).");
        }

        this.detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
        });
    }

    async start() {
        const stream = await this.cameraManager.getStream();
        this.videoElement = document.createElement('video');
        this.videoElement.srcObject = stream;
        this.videoElement.setAttribute('autoplay', 'true');
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('muted', 'true');
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
        this.videoElement.style.objectFit = 'cover';

        this.container.innerHTML = '';
        this.container.appendChild(this.videoElement);
        await this.videoElement.play().catch(e => console.warn(e));

        this.isRunning = true;
        this._runLoop();
    }

    _runLoop() {
        const process = async () => {
            if (!this.isRunning) return;

            if (this.videoElement && this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
                const t0 = performance.now();
                try {
                    const detections = await this.detector.detect(this.videoElement);
                    const t1 = performance.now();
                    if (this.onLatencyCallback) this.onLatencyCallback(t1 - t0);

                    if (detections.length > 0) {
                        const raw = detections[0].rawValue;
                        if (this.onReadCallback) this.onReadCallback(raw, false);
                    }
                } catch (e) {
                    const t1 = performance.now();
                    if (this.onLatencyCallback) this.onLatencyCallback(t1 - t0);
                }
            }
            this.animationId = requestAnimationFrame(process);
        };
        this.animationId = requestAnimationFrame(process);
    }

    async stop() {
        super.stop();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    async destroy() {
        await this.stop();
        this.cameraManager.stopStream();
        await super.destroy();
    }
}
