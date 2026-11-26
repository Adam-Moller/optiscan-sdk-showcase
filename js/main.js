/**
 * OptiScan Barcode Engine Showcase - Application Entry Point
 * Demonstrates Enterprise-level Architecture, SOLID Principles, and Strategy Pattern.
 * (c) 2026 OptiScan Technologies
 */

import { ENGINES, CONDITIONS, BENCHMARK_CONFIG } from './config/constants.js';
import { ScannerAudio } from './core/audio.js';
import { CameraManager } from './core/camera.js';
import { TelemetryMonitor } from './core/telemetry.js';
import { GroundTruthValidator } from './benchmark/ground-truth.js';
import { SeriesManager } from './benchmark/series-manager.js';
import { BenchmarkExporter } from './benchmark/exporter.js';

import { OptiScanAdapter } from './engines/optiscan-adapter.js';
import { GoogleDetectorAdapter } from './engines/google-adapter.js';
import { VanillaZxingAdapter } from './engines/zxing-adapter.js';
import { Html5QrAdapter } from './engines/html5qr-adapter.js';
import { QuaggaAdapter } from './engines/quagga-adapter.js';

import { UIController } from './ui/ui-controller.js';
import { TriggerController } from './ui/trigger-controller.js';

class AppController {
    constructor() {
        this.currentEngineId = BENCHMARK_CONFIG.DEFAULT_ENGINE;
        this.currentCondition = CONDITIONS[BENCHMARK_CONFIG.DEFAULT_CONDITION];
        this.activeAdapter = null;
        this.lastReadCode = '';

        // Core Modules
        this.audio = new ScannerAudio();
        this.camera = new CameraManager();
        this.telemetry = new TelemetryMonitor();
        this.validator = new GroundTruthValidator();
        this.seriesManager = new SeriesManager(BENCHMARK_CONFIG.MAX_SAMPLES_PER_SERIES);

        // Stats by Engine for Live Counters
        this.engineStats = {
            'optiscan': { correct: 0, falsePositives: 0, total: 0 },
            'google-detector': { correct: 0, falsePositives: 0, total: 0 },
            'vanilla-zxing': { correct: 0, falsePositives: 0, total: 0 },
            'html5-qrcode': { correct: 0, falsePositives: 0, total: 0 },
            'quagga': { correct: 0, falsePositives: 0, total: 0 }
        };
    }

    async init() {
        this._cacheDOMElements();
        this.ui = new UIController(this.dom);
        this.trigger = new TriggerController(this.dom, (state) => this._onTriggerChange(state));

        this._setupEventListeners();
        await this.camera.enumerateDevices();

        // Inicializa o motor padrão (OptiScan)
        await this.switchEngine(this.currentEngineId);
    }

    _cacheDOMElements() {
        this.dom = {
            tabs: document.querySelectorAll('.tab-btn'),
            renderContainer: document.getElementById('scanner-render-container'),
            placeholder: document.getElementById('camera-loading-placeholder'),
            standardViewfinder: document.getElementById('standard-viewfinder'),
            lockOverlay: document.getElementById('viewport-lock-overlay'),
            lockLastRead: document.getElementById('lock-last-read'),
            glitchOverlay: document.getElementById('glitch-overlay'),
            glitchSubtext: document.getElementById('glitch-subtext'),
            btnModeSingle: document.getElementById('btn-mode-single'),
            btnModeContinuous: document.getElementById('btn-mode-continuous'),
            btnMainTrigger: document.getElementById('btn-main-trigger'),
            triggerBtnText: document.getElementById('trigger-btn-text'),
            triggerIcon: document.getElementById('trigger-icon'),
            statusPill: document.getElementById('status-pill'),
            btnSwitchCamera: document.getElementById('btn-switch-camera'),
            btnToggleTorch: document.getElementById('btn-toggle-torch'),
            btnToggleSound: document.getElementById('btn-toggle-sound'),
            soundIcon: document.getElementById('sound-icon'),
            soundText: document.getElementById('sound-text'),
            btnViewCode: document.getElementById('btn-view-code'),
            btnExportCsv: document.getElementById('btn-export-csv'),
            btnCopyMd: document.getElementById('btn-copy-md'),
            btnResetBench: document.getElementById('btn-reset-bench'),
            btnSaveSeries: document.getElementById('btn-save-series'),
            btnClearLogs: document.getElementById('btn-clear-logs'),
            groundTruthInput: document.getElementById('ground-truth-input'),
            btnSaveTruth: document.getElementById('btn-save-truth'),
            btnSetLastAsTruth: document.getElementById('btn-set-last-as-truth'),
            btnClearTruth: document.getElementById('btn-clear-truth'),
            truthStatusBadge: document.getElementById('truth-status-badge'),
            truthStatusText: document.getElementById('truth-status-text'),
            conditionChips: document.querySelectorAll('.condition-chip'),
            testProgressCounter: document.getElementById('test-progress-counter'),
            progressFill: document.getElementById('progress-fill'),
            savedSeriesCount: document.getElementById('saved-series-count'),
            benchmarkTableBody: document.getElementById('benchmark-table-body'),
            tableEmptyRow: document.getElementById('table-empty-row'),
            logList: document.getElementById('assertiveness-log-list'),
            logEmptyMsg: document.getElementById('log-empty-msg'),
            logCounter: document.getElementById('log-counter'),
            metricAccuracy: document.getElementById('metric-accuracy'),
            metricAccuracyDetail: document.getElementById('metric-accuracy-detail'),
            metricReadsRatio: document.getElementById('metric-reads-ratio'),
            metricTotalReads: document.getElementById('metric-total-reads'),
            metricLatency: document.getElementById('metric-latency'),
            metricFps: document.getElementById('metric-fps'),
            telemetryPulse: document.getElementById('telemetry-pulse'),
            activeEngineDesc: document.getElementById('active-engine-desc'),
            codeDrawer: document.getElementById('code-drawer'),
            drawerOverlay: document.getElementById('drawer-overlay'),
            btnCloseDrawer: document.getElementById('btn-close-drawer'),
            codeBlockContent: document.getElementById('code-block-content'),
            codeFileName: document.getElementById('code-file-name'),
            btnCopyCode: document.getElementById('btn-copy-code'),
            toastNotification: document.getElementById('toast-notification'),
            toastMessage: document.getElementById('toast-message')
        };
    }

    _setupEventListeners() {
        // Seleção de Motores
        this.dom.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.engine;
                if (target && target !== this.currentEngineId) {
                    this.switchEngine(target);
                }
            });
        });

        // Seleção de Condição de Embalagem
        this.dom.conditionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.dom.conditionChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const condKey = chip.dataset.condition;
                this.currentCondition = CONDITIONS[condKey] || CONDITIONS.CRUSHED;
                this.ui.showToast(`Condição: ${this.currentCondition.label}`);
            });
        });

        // Ground Truth
        const saveTruth = () => {
            const val = this.dom.groundTruthInput.value.trim();
            if (!val) {
                this.ui.showToast("Digite o código antes de salvar.");
                return;
            }
            this.validator.setGroundTruth(val);
            this.ui.updateGroundTruthBadge(val);
            this._updateAccuracyDisplay();
            this.ui.showToast(`Código de controle definido: [ ${val} ]`);
        };

        this.dom.btnSaveTruth.addEventListener('click', saveTruth);
        this.dom.groundTruthInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveTruth();
        });

        this.dom.btnSetLastAsTruth.addEventListener('click', () => {
            if (!this.lastReadCode) {
                this.ui.showToast("Nenhum código lido ainda para fixar.");
                return;
            }
            this.dom.groundTruthInput.value = this.lastReadCode;
            this.validator.setGroundTruth(this.lastReadCode);
            this.ui.updateGroundTruthBadge(this.lastReadCode);
            this._updateAccuracyDisplay();
            this.ui.showToast(`Ground Truth fixado: ${this.lastReadCode}`);
        });

        this.dom.btnClearTruth.addEventListener('click', () => {
            this.dom.groundTruthInput.value = '';
            this.validator.clearGroundTruth();
            this.ui.updateGroundTruthBadge('');
            this._updateAccuracyDisplay();
            this.ui.showToast("Código de controle limpo.");
        });

        // Salvar Bateria na Série
        this.dom.btnSaveSeries.addEventListener('click', () => {
            try {
                const engineInfo = this._getEngineInfo(this.currentEngineId);
                const series = this.seriesManager.saveCurrentBattery(
                    engineInfo, 
                    this.currentCondition, 
                    this.validator.getGroundTruth()
                );
                this.ui.renderSavedSeriesTable(
                    this.seriesManager.getSavedSeries(), 
                    (idx) => this._onRemoveSeries(idx)
                );
                this.ui.updateBatteryProgress(0, BENCHMARK_CONFIG.MAX_SAMPLES_PER_SERIES);
                this.ui.clearLogItems();
                this.ui.showToast(`✅ Série #${series.seriesId} salva! (${series.engineLabel} • ${series.conditionLabel})`);
            } catch (err) {
                this.ui.showToast(err.message);
            }
        });

        // Limpar Bateria Corrente
        this.dom.btnClearLogs.addEventListener('click', () => {
            this.seriesManager.clearCurrentBattery();
            this.ui.updateBatteryProgress(0, BENCHMARK_CONFIG.MAX_SAMPLES_PER_SERIES);
            this.ui.clearLogItems();
            this.ui.showToast("Bateria de teste limpa.");
        });

        // Exportações
        this.dom.btnExportCsv.addEventListener('click', () => {
            try {
                BenchmarkExporter.exportCSV(
                    this.seriesManager.getSavedSeries(), 
                    this.seriesManager.getCurrentEvents()
                );
                this.ui.showToast("CSV consolidado exportado com sucesso!");
            } catch (e) {
                this.ui.showToast(e.message);
            }
        });

        this.dom.btnCopyMd.addEventListener('click', () => {
            try {
                const md = BenchmarkExporter.generateMarkdownTable(this.seriesManager.getSavedSeries());
                navigator.clipboard.writeText(md).then(() => {
                    this.ui.showToast("Tabela Markdown copiada!");
                });
            } catch (e) {
                this.ui.showToast(e.message);
            }
        });

        this.dom.btnResetBench.addEventListener('click', () => {
            if (!confirm("Deseja zerar todas as estatísticas e séries salvas?")) return;
            this.seriesManager.resetAll();
            Object.keys(this.engineStats).forEach(k => {
                this.engineStats[k] = { correct: 0, falsePositives: 0, total: 0 };
            });
            this.ui.renderSavedSeriesTable([], null);
            this.ui.updateBatteryProgress(0, BENCHMARK_CONFIG.MAX_SAMPLES_PER_SERIES);
            this.ui.clearLogItems();
            this._updateAccuracyDisplay();
            this.ui.showToast("Todos os testes foram zerados.");
        });

        // Hardware (Alternar Câmera, Lanterna, Som)
        this.dom.btnSwitchCamera.addEventListener('click', async () => {
            const nextDev = this.camera.cycleCamera();
            if (!nextDev) {
                this.ui.showToast("Apenas uma câmera detectada.");
                return;
            }
            this.ui.showToast(`Câmera: ${nextDev.label || 'Câmera secundária'}`);
            await this.switchEngine(this.currentEngineId);
        });

        this.dom.btnToggleTorch.addEventListener('click', async () => {
            try {
                let isOn = false;
                if (this.currentEngineId === 'optiscan' && this.activeAdapter) {
                    isOn = await this.activeAdapter.toggleTorch();
                } else {
                    isOn = await this.camera.toggleTorch();
                }
                this.dom.btnToggleTorch.classList.toggle('active', isOn);
            } catch (e) {
                this.ui.showToast(e.message);
            }
        });

        this.dom.btnToggleSound.addEventListener('click', () => {
            const isEnabled = this.audio.toggle();
            this.dom.soundIcon.innerText = isEnabled ? '🔊' : '🔇';
            this.dom.soundText.innerText = `Bip Sonoro: ${isEnabled ? 'Ligado' : 'Desligado'}`;
            this.ui.showToast(isEnabled ? "Bip sonoro LIGADO" : "Bip sonoro DESLIGADO");
        });

        // Drawer de Snippets de Código
        this.dom.btnViewCode.addEventListener('click', () => {
            this._openCodeDrawer();
        });
        this.dom.btnCloseDrawer.addEventListener('click', () => this._closeCodeDrawer());
        this.dom.drawerOverlay.addEventListener('click', () => this._closeCodeDrawer());
        this.dom.btnCopyCode.addEventListener('click', () => {
            navigator.clipboard.writeText(this.dom.codeBlockContent.innerText).then(() => {
                this.ui.showToast("Snippet copiado!");
            });
        });
    }

    async switchEngine(engineId) {
        // 1. Finaliza motor anterior e libera hardware de vídeo
        if (this.activeAdapter) {
            try {
                await this.activeAdapter.destroy();
            } catch (e) {
                console.warn(e);
            }
            this.activeAdapter = null;
        }

        // Garante liberação de fluxo no CameraManager para evitar concorrência no mobile
        this.camera.stopStream();

        this.currentEngineId = engineId;
        const engineInfo = this._getEngineInfo(engineId);

        // 2. Atualiza UI e Viewfinder padronizado (ROI verde para todos os motores)
        this.dom.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.engine === engineId);
        });
        this.ui.updateEngineHeader(engineInfo);
        this.ui.hideGlitch();
        this.ui.showPlaceholder();

        // ROI verde padronizado exibido para TODOS os motores para garantir paridade visual
        this.ui.setViewfinderVisible(true);

        // Reinicia a telemetria para o novo motor
        this.telemetry.start(({ fps, latencyMs }) => {
            this.ui.updateTelemetry(fps, latencyMs);
        });

        // 3. Instancia o Adapter correto (Strategy Pattern)
        try {
            switch (engineId) {
                case 'optiscan':
                    this.activeAdapter = new OptiScanAdapter(engineInfo);
                    break;
                case 'google-detector':
                    this.activeAdapter = new GoogleDetectorAdapter(engineInfo, this.camera);
                    break;
                case 'vanilla-zxing':
                    this.activeAdapter = new VanillaZxingAdapter(engineInfo, this.camera);
                    break;
                case 'html5-qrcode':
                    this.activeAdapter = new Html5QrAdapter(engineInfo, this.camera);
                    break;
                case 'quagga':
                    this.activeAdapter = new QuaggaAdapter(engineInfo, this.camera);
                    break;
            }

            await this.activeAdapter.init(
                this.dom.renderContainer,
                (code, isConsensus) => this._onCodeRead(code, isConsensus),
                (latMs) => {
                    this.telemetry.recordFrame();
                    this.telemetry.recordLatency(latMs);
                },
                (err) => {
                    this.ui.showToast(`Erro no leitor: ${err.message}`);
                }
            );

            await this.activeAdapter.start();
        } catch (err) {
            console.error(`[App] Falha ao iniciar ${engineInfo.name}:`, err);
            this.ui.showToast(`Falha na câmera: ${err.message}`);
        } finally {
            // Garante que o placeholder seja removido para o vídeo aparecer
            this.ui.hidePlaceholder();
        }

        // Se estiver no modo Single-Shot, re-trava para segurança
        if (this.trigger.mode === 'SINGLE') {
            this.trigger.disarm();
        }

        this._updateAccuracyDisplay();
    }

    _onCodeRead(code, isOptiScanConsensus) {
        // Se estiver em modo Single-Shot e travado, ignora
        if (this.trigger.mode === 'SINGLE' && !this.trigger.isArmed) {
            return;
        }

        const cleanCode = String(code || '').trim();
        if (!cleanCode || cleanCode.length < 5) return;

        this.lastReadCode = cleanCode;

        // 1. Validação contra Ground Truth
        const { isMatch, status } = this.validator.validate(cleanCode, isOptiScanConsensus);

        // 2. Toca o bip acústico correspondente
        this.audio.play(isMatch);

        // 3. Em modo Single-Shot: trava o leitor imediatamente
        this.trigger.onCodeDetected(cleanCode);

        // 4. Registra na bateria corrente
        const latencyVal = this.telemetry.getLastLatency().toFixed(1);
        const engineInfo = this._getEngineInfo(this.currentEngineId);

        const eventObj = {
            timestamp: new Date().toISOString(),
            timeStr: new Date().toLocaleTimeString('pt-BR'),
            engine: engineInfo.shortName,
            condition: this.currentCondition.label,
            groundTruth: this.validator.getGroundTruth() || 'N/A',
            detectedCode: cleanCode,
            status: status,
            isMatch: isMatch,
            latencyMs: latencyVal
        };

        const { count, isFull } = this.seriesManager.addEvent(eventObj);

        // 5. Atualiza Contadores
        const stats = this.engineStats[this.currentEngineId];
        if (stats) {
            stats.total++;
            if (isMatch) stats.correct++;
            else stats.falsePositives++;
        }

        // 6. Feedback Visual e Log
        if (isMatch) {
            this.ui.addLogItem(cleanCode, engineInfo.shortName, this.currentCondition.label, 'Correto (Match)', 'badge-match', 'match', count);
        } else {
            this.ui.triggerGlitch(`Lido: ${cleanCode} (Esperado: ${this.validator.getGroundTruth()})`);
            this.ui.addLogItem(cleanCode, engineInfo.shortName, this.currentCondition.label, 'Alucinação / Divergente', 'badge-false', 'false-positive', count);
        }

        this.ui.updateBatteryProgress(count, BENCHMARK_CONFIG.MAX_SAMPLES_PER_SERIES);
        this._updateAccuracyDisplay();

        if (isFull) {
            this.ui.showToast("🎉 10 leituras concluídas nesta bateria! Clique em 'Salvar na Série' para consolidar.");
        }
    }

    _onTriggerChange(state) {
        // Quando o leitor é destravado pelo usuário, garante que o motor ativo retome a varredura
        if (state && state.isArmed && this.activeAdapter && typeof this.activeAdapter.resume === 'function') {
            this.activeAdapter.resume();
        }
    }

    _onRemoveSeries(index) {
        this.seriesManager.removeSeries(index);
        this.ui.renderSavedSeriesTable(this.seriesManager.getSavedSeries(), (idx) => this._onRemoveSeries(idx));
        this.ui.showToast("Série excluída.");
    }

    _updateAccuracyDisplay() {
        const stats = this.engineStats[this.currentEngineId] || { correct: 0, falsePositives: 0, total: 0 };
        this.ui.updateAccuracyUI(stats.correct, stats.falsePositives, stats.total, this.validator.hasGroundTruth());
    }

    _getEngineInfo(id) {
        for (const key of Object.keys(ENGINES)) {
            if (ENGINES[key].id === id) return ENGINES[key];
        }
        return { id: id, name: id, shortName: id, description: id };
    }

    _openCodeDrawer() {
        this.dom.codeBlockContent.innerText = `// OptiScan SDK - Integração em 3 Passos (Padrão Enterprise)
const leitor = new OptiScanSDK({
    containerId: 'scanner-container',
    wasmPath: 'sdk/OptiScanScanner.js',
    scanInterval: 250,
    cooldown: 1800,
    onSuccess: (code) => {
        console.log("Código validado por consenso:", code);
    }
});
leitor.start();`;
        this.dom.codeFileName.innerText = `${this.currentEngineId}-adapter.js`;
        this.dom.codeDrawer.classList.add('open');
        this.dom.drawerOverlay.classList.add('open');
    }

    _closeCodeDrawer() {
        this.dom.codeDrawer.classList.remove('open');
        this.dom.drawerOverlay.classList.remove('open');
    }
}

// Inicializa a aplicação no DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.init();
});
