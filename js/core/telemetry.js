/**
 * Real-time Performance Telemetry Monitor
 * Tracks processing latency, FPS throughput, and frame stability.
 * (c) 2026 OptiScan Technologies
 */

export class TelemetryMonitor {
    constructor() {
        this.frameCounter = 0;
        this.lastFrameTime = Date.now();
        this.latencySamples = [];
        this.intervalId = null;
        this.onMetricsUpdate = null;
    }

    start(onMetricsUpdate) {
        this.stop();
        this.onMetricsUpdate = onMetricsUpdate;
        this.frameCounter = 0;
        this.lastFrameTime = Date.now();
        this.latencySamples = [];

        this.intervalId = setInterval(() => {
            const now = Date.now();
            const deltaSec = (now - this.lastFrameTime) / 1000;
            const currentFps = Math.round(this.frameCounter / Math.max(deltaSec, 0.001));

            this.frameCounter = 0;
            this.lastFrameTime = now;

            let avgLatency = null;
            if (this.latencySamples.length > 0) {
                avgLatency = this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length;
            }

            if (this.onMetricsUpdate) {
                this.onMetricsUpdate({
                    fps: currentFps,
                    latencyMs: avgLatency !== null ? avgLatency.toFixed(1) : '--'
                });
            }
        }, 1000);
    }

    recordFrame() {
        this.frameCounter++;
    }

    recordLatency(ms) {
        this.latencySamples.push(ms);
        if (this.latencySamples.length > 25) {
            this.latencySamples.shift();
        }
    }

    getLastLatency() {
        if (this.latencySamples.length === 0) return 14;
        return this.latencySamples[this.latencySamples.length - 1];
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.frameCounter = 0;
        this.latencySamples = [];
    }
}
