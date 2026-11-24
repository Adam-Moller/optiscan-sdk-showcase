/**
 * Resilient Camera Stream Manager
 * Handles hardware video devices, mobile constraints, and stream lifecycles.
 * Optimized for mobile sensors (e.g. Samsung Galaxy M53 / iOS Safari / Android Chrome).
 * (c) 2026 OptiScan Technologies
 */

export class CameraManager {
    constructor() {
        this.stream = null;
        this.devices = [];
        this.activeDeviceId = null;
        this.isTorchOn = false;
    }

    async enumerateDevices() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                return [];
            }
            const allDevs = await navigator.mediaDevices.enumerateDevices();
            this.devices = allDevs.filter(d => d.kind === 'videoinput');

            if (this.devices.length > 0 && !this.activeDeviceId) {
                // Tenta priorizar a câmera traseira principal (environment)
                const backCam = this.devices.find(d => 
                    d.label.toLowerCase().includes('back') || 
                    d.label.toLowerCase().includes('traseira') || 
                    d.label.toLowerCase().includes('environment') ||
                    d.label.toLowerCase().includes('0')
                );
                this.activeDeviceId = backCam ? backCam.deviceId : this.devices[0].deviceId;
            }
            return this.devices;
        } catch (e) {
            console.warn('[CameraManager] Enumeration error:', e);
            return [];
        }
    }

    async getStream() {
        if (this.stream && this.stream.active) {
            return this.stream;
        }

        const baseConstraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 }
            },
            audio: false
        };

        if (this.activeDeviceId) {
            baseConstraints.video.deviceId = { ideal: this.activeDeviceId };
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
        } catch (e) {
            console.warn('[CameraManager] Constraints falharam, tentando fallback simples:', e);
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false
                });
            } catch (fallbackErr) {
                this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
        }

        // Atualiza a lista de dispositivos agora que a permissão foi concedida
        this.enumerateDevices();
        return this.stream;
    }

    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
            this.isTorchOn = false;
        }
    }

    async toggleTorch() {
        if (!this.stream) return false;
        const track = this.stream.getVideoTracks()[0];
        if (!track) return false;

        try {
            this.isTorchOn = !this.isTorchOn;
            await track.applyConstraints({ advanced: [{ torch: this.isTorchOn }] });
            return this.isTorchOn;
        } catch (e) {
            this.isTorchOn = false;
            throw new Error("Lanterna não suportada neste dispositivo.");
        }
    }

    cycleCamera() {
        if (this.devices.length <= 1) return null;
        const curIdx = this.devices.findIndex(d => d.deviceId === this.activeDeviceId);
        const nextIdx = (curIdx + 1) % this.devices.length;
        this.activeDeviceId = this.devices[nextIdx].deviceId;
        this.stopStream();
        return this.devices[nextIdx];
    }
}
