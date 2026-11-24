/**
 * Vanilla ZXing-JS Adapter
 * Wraps the open-source ZXing BrowserMultiFormatReader.
 * (c) 2026 OptiScan Technologies
 */

import { BaseScannerAdapter } from './engine-adapter.js';

export class VanillaZxingAdapter extends BaseScannerAdapter {
    constructor(engineInfo, cameraManager) {
        super(engineInfo);
        this.cameraManager = cameraManager;
        this.codeReader = null;
        this.videoElement = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
    }

    async init(container, onReadCallback, onLatencyCallback, onErrorCallback) {
        await super.init(container, onReadCallback, onLatencyCallback, onErrorCallback);

        if (!window.ZXing || !window.ZXing.BrowserMultiFormatReader) {
            throw new Error("Biblioteca ZXing-JS não carregada.");
        }

        this.codeReader = new window.ZXing.BrowserMultiFormatReader();
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
        const decode = async () => {
            if (!this.isRunning) return;

            if (this.videoElement && this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
                this.canvas.width = this.videoElement.videoWidth;
                this.canvas.height = this.videoElement.videoHeight;
                this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

                const t0 = performance.now();
                try {
                    const result = await this.codeReader.decodeOnceFromCanvas(this.canvas);
                    const t1 = performance.now();
                    if (this.onLatencyCallback) this.onLatencyCallback(t1 - t0);

                    if (result && result.text) {
                        if (this.onReadCallback) this.onReadCallback(result.text, false);
                    }
                } catch (e) {
                    const t1 = performance.now();
                    if (this.onLatencyCallback) this.onLatencyCallback(t1 - t0);
                }
            }
            this.animationId = requestAnimationFrame(decode);
        };
        this.animationId = requestAnimationFrame(decode);
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
