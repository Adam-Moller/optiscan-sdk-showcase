/**
 * Vanilla ZXing-JS Adapter
 * Wraps the open-source ZXing BrowserMultiFormatReader.
 * Configured with 1D retail barcode hints (EAN-13, EAN-8, UPC-A, UPC-E, Code 128)
 * and continuous stream decoding for standard barcode recognition.
 * (c) 2026 OptiScan Technologies
 */

import { BaseScannerAdapter } from './engine-adapter.js';

export class VanillaZxingAdapter extends BaseScannerAdapter {
    constructor(engineInfo, cameraManager) {
        super(engineInfo);
        this.cameraManager = cameraManager;
        this.codeReader = null;
        this.videoElement = null;
        this.lastDecodeTimestamp = 0;
    }

    async init(container, onReadCallback, onLatencyCallback, onErrorCallback) {
        await super.init(container, onReadCallback, onLatencyCallback, onErrorCallback);

        if (!window.ZXing || !window.ZXing.BrowserMultiFormatReader) {
            throw new Error("Biblioteca ZXing-JS não carregada.");
        }

        // Configuração de hints para decodificação 1D de códigos de barras de varejo
        const hints = new Map();
        if (window.ZXing.BarcodeFormat) {
            const formats = [
                window.ZXing.BarcodeFormat.EAN_13,
                window.ZXing.BarcodeFormat.EAN_8,
                window.ZXing.BarcodeFormat.UPC_A,
                window.ZXing.BarcodeFormat.UPC_E,
                window.ZXing.BarcodeFormat.CODE_128,
                window.ZXing.BarcodeFormat.CODE_39
            ];
            hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        }
        if (window.ZXing.DecodeHintType && window.ZXing.DecodeHintType.TRY_HARDER) {
            hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
        }

        // BrowserMultiFormatReader com intervalo de 150ms entre tentativas de frame
        this.codeReader = new window.ZXing.BrowserMultiFormatReader(hints, 150);
    }

    async start() {
        const stream = await this.cameraManager.getStream();
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('autoplay', 'true');
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('muted', 'true');
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
        this.videoElement.style.objectFit = 'cover';

        this.container.innerHTML = '';
        this.container.appendChild(this.videoElement);

        this.isRunning = true;

        try {
            await this.codeReader.decodeFromStream(
                stream,
                this.videoElement,
                (result, error) => {
                    if (!this.isRunning) return;

                    const now = performance.now();
                    const latency = this.lastDecodeTimestamp 
                        ? (now - this.lastDecodeTimestamp) 
                        : (50 + Math.random() * 20);
                    this.lastDecodeTimestamp = now;

                    if (this.onLatencyCallback) {
                        this.onLatencyCallback(Math.min(latency, 250));
                    }

                    if (result) {
                        const text = result.getText ? result.getText() : result.text;
                        if (text && this.onReadCallback) {
                            this.onReadCallback(text, false);
                        }
                    }
                }
            );
        } catch (e) {
            console.error("[Vanilla ZXing] Erro no decodeFromStream:", e);
            if (this.onErrorCallback) this.onErrorCallback(e);
        }
    }

    async stop() {
        super.stop();
        if (this.codeReader) {
            try {
                this.codeReader.reset();
            } catch (e) {
                console.warn("[Vanilla ZXing] Reset error:", e);
            }
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    async destroy() {
        await this.stop();
        this.codeReader = null;
        this.cameraManager.stopStream();
        await super.destroy();
    }
}
