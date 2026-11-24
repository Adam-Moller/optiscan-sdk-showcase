/**
 * Trigger Controller (Single-Shot Scanner Lock & Shortcuts)
 * Controls user-initiated scan cycles, automatic post-scan locking, and keyboard shortcuts.
 * (c) 2026 OptiScan Technologies
 */

export class TriggerController {
    constructor(elements, onTriggerChange) {
        this.el = elements;
        this.onTriggerChange = onTriggerChange;
        this.mode = 'SINGLE'; // 'SINGLE' or 'CONTINUOUS'
        this.isArmed = false;

        this._setupListeners();
    }

    _setupListeners() {
        if (this.el.btnModeSingle) {
            this.el.btnModeSingle.addEventListener('click', () => this.setMode('SINGLE'));
        }
        if (this.el.btnModeContinuous) {
            this.el.btnModeContinuous.addEventListener('click', () => this.setMode('CONTINUOUS'));
        }
        if (this.el.btnMainTrigger) {
            this.el.btnMainTrigger.addEventListener('click', () => this.toggleTrigger());
        }

        // Tecla de Atalho: Barra de Espaço
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleTrigger();
            }
        });
    }

    setMode(newMode) {
        this.mode = newMode;
        if (newMode === 'SINGLE') {
            this.el.btnModeSingle?.classList.add('active');
            this.el.btnModeContinuous?.classList.remove('active');
            this.disarm();
        } else {
            this.el.btnModeSingle?.classList.remove('active');
            this.el.btnModeContinuous?.classList.add('active');
            this.armContinuous();
        }

        if (this.onTriggerChange) {
            this.onTriggerChange({ mode: this.mode, isArmed: this.isArmed });
        }
    }

    arm() {
        this.isArmed = true;
        this.el.btnMainTrigger?.classList.add('armed');
        if (this.el.triggerIcon) this.el.triggerIcon.innerText = '🟢';
        if (this.el.triggerBtnText) this.el.triggerBtnText.innerText = 'AGUARDANDO LEITURA...';
        if (this.el.statusPill) {
            this.el.statusPill.className = 'status-pill status-armed';
            this.el.statusPill.innerText = 'ARMADO (1 LEITURA)';
        }
        this.el.lockOverlay?.classList.remove('active');

        if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch (e) {}
        }

        if (this.onTriggerChange) {
            this.onTriggerChange({ mode: this.mode, isArmed: true });
        }
    }

    disarm(lastCode = '') {
        this.isArmed = false;
        this.el.btnMainTrigger?.classList.remove('armed');
        if (this.el.triggerIcon) this.el.triggerIcon.innerText = '🎯';
        if (this.el.triggerBtnText) this.el.triggerBtnText.innerText = 'DESTRAVAR LEITOR (1 DISPARO)';
        if (this.el.statusPill) {
            this.el.statusPill.className = 'status-pill status-locked';
            this.el.statusPill.innerText = 'TRAVADO';
        }

        if (this.mode === 'SINGLE') {
            this.el.lockOverlay?.classList.add('active');
            if (lastCode && this.el.lockLastRead) {
                this.el.lockLastRead.style.display = 'block';
                this.el.lockLastRead.innerText = `Último Lido: ${lastCode}`;
            }
        }

        if (this.onTriggerChange) {
            this.onTriggerChange({ mode: this.mode, isArmed: false });
        }
    }

    armContinuous() {
        this.isArmed = true;
        this.el.btnMainTrigger?.classList.remove('armed');
        if (this.el.triggerIcon) this.el.triggerIcon.innerText = '⚡';
        if (this.el.triggerBtnText) this.el.triggerBtnText.innerText = 'MODO CONTÍNUO ATIVO';
        if (this.el.statusPill) {
            this.el.statusPill.className = 'status-pill status-armed';
            this.el.statusPill.innerText = 'CONTÍNUO';
        }
        this.el.lockOverlay?.classList.remove('active');

        if (this.onTriggerChange) {
            this.onTriggerChange({ mode: this.mode, isArmed: true });
        }
    }

    toggleTrigger() {
        if (this.mode === 'CONTINUOUS') return;
        if (this.isArmed) {
            this.disarm();
        } else {
            this.arm();
        }
    }

    onCodeDetected(code) {
        if (this.mode === 'SINGLE') {
            this.disarm(code);
        }
    }
}
