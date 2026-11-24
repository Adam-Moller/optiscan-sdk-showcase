/**
 * Vanilla ZXing-JS Adapter
 * Wraps the open-source ZXing MultiFormatReader.
 * Directly decodes video frames with dual-axis orientation analysis (0° and 90° rotation),
 * guaranteeing rapid detection of both horizontal and vertically printed retail barcodes (e.g. packaging side prints).
 * (c) 2026 OptiScan Technologies
 */

import { BaseScannerAdapter } from './engine-adapter.js';

export class VanillaZxingAdapter extends BaseScannerAdapter {
    constructor(engineInfo, cameraManager) {
        super(engineInfo);
        this.cameraManager = cameraManager;
        this.multiFormatReader = null;
        this.hints = null;
        this.videoElement = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.scanIntervalId = null;
        this.isProcessing = false;
        this.grayBuffer = null;
        this.rotBuffer = null;
    }

    async init(container, onReadCallback, onLatencyCallback, onErrorCallback) {
        await super.init(container, onReadCallback, onLatencyCallback, onErrorCallback);

        if (!window.ZXing || !window.ZXing.MultiFormatReader) {
            throw new Error("Biblioteca ZXing-JS não carregada no ambiente.");
        }

        // Formatos comerciais e hints de máxima assertividade
        this.hints = new Map();
        if (window.ZXing.BarcodeFormat) {
            const formats = [
                window.ZXing.BarcodeFormat.EAN_13,
                window.ZXing.BarcodeFormat.EAN_8,
                window.ZXing.BarcodeFormat.UPC_A,
                window.ZXing.BarcodeFormat.UPC_E,
                window.ZXing.BarcodeFormat.CODE_128,
                window.ZXing.BarcodeFormat.CODE_39
            ];
            this.hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        }
        if (window.ZXing.DecodeHintType && window.ZXing.DecodeHintType.TRY_HARDER) {
            this.hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
        }

        this.multiFormatReader = new window.ZXing.MultiFormatReader();
        this.multiFormatReader.setHints(this.hints);
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

        try {
            await this.videoElement.play();
        } catch (e) {
            console.warn("[Vanilla ZXing] Play warning:", e);
        }

        this.isRunning = true;
        this._startScanLoop();
    }

    _startScanLoop() {
        if (this.scanIntervalId) clearInterval(this.scanIntervalId);

        // Varredura a cada 100ms (~10-12 FPS real, taxa representativa do ZXing-JS em CPU móvel)
        this.scanIntervalId = setInterval(() => {
            this._processFrame();
        }, 100);
    }

    _processFrame() {
        if (!this.isRunning || this.isProcessing) return;
        if (!this.videoElement || this.videoElement.readyState < 2) return;

        const vw = this.videoElement.videoWidth;
        const vh = this.videoElement.videoHeight;
        if (!vw || !vh) return;

        this.isProcessing = true;
        const t0 = performance.now();

        try {
            // Ajusta dimensões da tela de captura
            if (this.canvas.width !== vw || this.canvas.height !== vh) {
                this.canvas.width = vw;
                this.canvas.height = vh;
                this.grayBuffer = new Uint8ClampedArray(vw * vh);
                this.rotBuffer = new Uint8ClampedArray(vw * vh);
            }

            this.ctx.drawImage(this.videoElement, 0, 0, vw, vh);
            const imgData = this.ctx.getImageData(0, 0, vw, vh);
            const data = imgData.data;
            const gray = this.grayBuffer;
            const len = vw * vh;

            // Conversão de luminância (BT.601 integer math)
            for (let i = 0; i < len; i++) {
                const idx = i * 4;
                gray[i] = (data[idx] * 306 + data[idx + 1] * 601 + data[idx + 2] * 117) >> 10;
            }

            let result = null;

            // 1. Tentativa na orientação nativa (0°)
            try {
                const lumSource = new window.ZXing.RGBLuminanceSource(gray, vw, vh);
                const binarizer = new window.ZXing.HybridBinarizer(lumSource);
                const bitmap = new window.ZXing.BinaryBitmap(binarizer);
                result = this.multiFormatReader.decode(bitmap, this.hints);
            } catch (err0) {
                // 2. Se não detectou na horizontal, testa na orientação rotacionada de 90° (para barras horizontais / caixas em pé)
                const rot = this.rotBuffer;
                for (let y = 0; y < vh; y++) {
                    const rowOffset = y * vw;
                    for (let x = 0; x < vw; x++) {
                        rot[(vw - x - 1) * vh + y] = gray[rowOffset + x];
                    }
                }

                try {
                    const lumRot = new window.ZXing.RGBLuminanceSource(rot, vh, vw);
                    const binRot = new window.ZXing.HybridBinarizer(lumRot);
                    const bmpRot = new window.ZXing.BinaryBitmap(binRot);
                    result = this.multiFormatReader.decode(bmpRot, this.hints);
                } catch (errRot) {
                    // Nenhum código decodificado neste frame
                }
            }

            const t1 = performance.now();
            if (this.onLatencyCallback) {
                this.onLatencyCallback(t1 - t0);
            }

            if (result) {
                const text = result.getText ? result.getText() : result.text;
                if (text && this.onReadCallback) {
                    this.onReadCallback(text, false);
                }
            }
        } catch (e) {
            console.warn("[Vanilla ZXing] Frame error:", e);
        } finally {
            this.isProcessing = false;
        }
    }

    async stop() {
        super.stop();
        if (this.scanIntervalId) {
            clearInterval(this.scanIntervalId);
            this.scanIntervalId = null;
        }
        if (this.multiFormatReader) {
            try {
                this.multiFormatReader.reset();
            } catch (e) {}
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    async destroy() {
        await this.stop();
        this.multiFormatReader = null;
        this.grayBuffer = null;
        this.rotBuffer = null;
        this.cameraManager.stopStream();
        await super.destroy();
    }
}
