/**
 * Base Scanner Engine Adapter (Strategy Pattern)
 * Defines the unified contract that all barcode scanner implementations must fulfill.
 * Demonstrates architectural parity: every engine is mounted and executed with identical inputs.
 * (c) 2026 OptiScan Technologies
 */

export class BaseScannerAdapter {
    constructor(engineInfo) {
        this.engineInfo = engineInfo;
        this.container = null;
        this.onReadCallback = null;
        this.onLatencyCallback = null;
        this.onErrorCallback = null;
        this.isRunning = false;
    }

    /**
     * Initializes the engine inside the target DOM container
     * @param {HTMLElement} container 
     * @param {Function} onReadCallback (code: string, isConsensus: boolean) => void
     * @param {Function} onLatencyCallback (latencyMs: number) => void
     * @param {Function} onErrorCallback (error: Error) => void
     */
    async init(container, onReadCallback, onLatencyCallback, onErrorCallback) {
        this.container = container;
        this.onReadCallback = onReadCallback;
        this.onLatencyCallback = onLatencyCallback;
        this.onErrorCallback = onErrorCallback;
    }

    /**
     * Starts video capture and decoding loop
     */
    async start() {
        throw new Error("Method 'start()' must be implemented by subclass.");
    }

    /**
     * Pauses or stops scanning without releasing all memory
     */
    async stop() {
        this.isRunning = false;
    }

    /**
     * Fully releases camera and memory resources
     */
    async destroy() {
        await this.stop();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Switches camera sensor if supported
     */
    async switchCamera(deviceId) {
        // Optional override
    }

    /**
     * Toggles flashlight torch if supported
     */
    async toggleTorch() {
        // Optional override
    }
}
