/**
 * Scanner Audio Synthesizer (Web Audio API)
 * Generates zero-latency auditory feedback for barcode scanning events.
 * (c) 2026 OptiScan Technologies
 */

export class ScannerAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    _ensureContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this._ensureContext();
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.playSuccess();
        }
        return this.enabled;
    }

    play(isMatch = true) {
        if (!this.enabled) return;
        if (isMatch) {
            this.playSuccess();
        } else {
            this.playError();
        }
    }

    playSuccess() {
        try {
            this._ensureContext();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            // Clean, punchy supermarket checkout scanner chime
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1350, this.ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);

            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 0.09);
        } catch (e) {
            console.warn('[ScannerAudio] Audio error:', e);
        }
    }

    playError() {
        try {
            this._ensureContext();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            // Low-pitch descending alert chime for false positive / glitch
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(180, this.ctx.currentTime + 0.18);

            gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 0.2);
        } catch (e) {
            console.warn('[ScannerAudio] Audio error:', e);
        }
    }
}
