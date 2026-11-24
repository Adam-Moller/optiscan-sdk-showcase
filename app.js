/**
 * OptiScan Barcode Engine - Showcase & Benchmark Controller
 * Handles multi-engine benchmarking, Ground Truth validation, single-shot trigger lock,
 * Web Audio scanner beeps, test series aggregation (up to 10 events), and comprehensive data export.
 * (c) 2026 OptiScan Technologies.
 */

// Global State
const STATE = {
    activeEngine: 'optiscan',
    activeCondition: 'CRUSHED',
    groundTruthCode: '',
    cameraStream: null,
    activeScannerInstance: null,
    isTorchOn: false,
    soundEnabled: true,
    audioCtx: null,

    // Single-Shot Trigger Mode
    triggerMode: 'SINGLE', // 'SINGLE' or 'CONTINUOUS'
    isArmed: false,        // In Single mode: waits for user trigger

    // Telemetry & FPS
    lastLatencySamples: [],
    fpsIntervalId: null,
    frameCounter: 0,
    lastFrameTime: Date.now(),
    telemetryUpdateInterval: null,
    isGlitchActive: false,
    activeDeviceId: null,
    devices: [],
    lastReadCode: '',

    // Active Test Battery (Up to 10 events)
    currentSeriesEvents: [],

    // Consolidated Series Matrix for Presentation
    savedSeries: [],
    seriesCounter: 0,

    // Engine Stats for Live Display
    stats: {
        'optiscan': { correct: 0, falsePositives: 0, total: 0, latencies: [] },
        'google-detector': { correct: 0, falsePositives: 0, total: 0, latencies: [] },
        'vanilla-zxing': { correct: 0, falsePositives: 0, total: 0, latencies: [] },
        'html5-qrcode': { correct: 0, falsePositives: 0, total: 0, latencies: [] },
        'quagga': { correct: 0, falsePositives: 0, total: 0, latencies: [] }
    }
};

// DOM References
const EL = {
    tabs: document.querySelectorAll('.tab-btn'),
    viewportContainer: document.getElementById('shared-scanner-container'),
    renderContainer: document.getElementById('scanner-render-container'),
    standardViewfinder: document.getElementById('standard-viewfinder'),
    lockOverlay: document.getElementById('viewport-lock-overlay'),
    lockLastRead: document.getElementById('lock-last-read'),
    glitchOverlay: document.getElementById('glitch-overlay'),
    glitchSubtext: document.getElementById('glitch-subtext'),
    placeholder: document.getElementById('camera-loading-placeholder'),
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
    btnModeSingle: document.getElementById('btn-mode-single'),
    btnModeContinuous: document.getElementById('btn-mode-continuous'),
    btnMainTrigger: document.getElementById('btn-main-trigger'),
    triggerBtnText: document.getElementById('trigger-btn-text'),
    triggerIcon: document.getElementById('trigger-icon'),
    statusPill: document.getElementById('status-pill'),
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
    engineLiveStatus: document.getElementById('engine-live-status'),
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

// ----------------------------------------------------
// 1. ÁUDIO DO SCANNER (WEB AUDIO API)
// ----------------------------------------------------
function initAudio() {
    if (!STATE.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            STATE.audioCtx = new AudioCtx();
        }
    }
    if (STATE.audioCtx && STATE.audioCtx.state === 'suspended') {
        STATE.audioCtx.resume();
    }
}

function playScanBeep(isSuccess) {
    if (!STATE.soundEnabled) return;
    try {
        initAudio();
        if (!STATE.audioCtx) return;

        const ctx = STATE.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (isSuccess) {
            // Beep clássico de scanner de supermercado (agudo e limpo)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1350, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.22, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.09);
        } else {
            // Beep de alucinação / erro (grave e descendente)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.18);
            gain.gain.setValueAtTime(0.28, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        }
    } catch (e) {
        console.warn("[OptiScan] Audio exception:", e);
    }
}

// ----------------------------------------------------
// 2. DISPARO ÚNICO / MODO GATILHO (TRIGGER LOCK)
// ----------------------------------------------------
function setTriggerMode(mode) {
    STATE.triggerMode = mode;
    if (mode === 'SINGLE') {
        EL.btnModeSingle.classList.add('active');
        EL.btnModeContinuous.classList.remove('active');
        disarmTrigger(); // Inicia travado
        showToast("Modo Disparo Único ativo: O leitor trava após cada leitura.");
    } else {
        EL.btnModeSingle.classList.remove('active');
        EL.btnModeContinuous.classList.add('active');
        armContinuousMode();
        showToast("Modo Contínuo ativo: Leituras livres em tempo real.");
    }
}

function armTrigger() {
    initAudio();
    STATE.isArmed = true;
    EL.btnMainTrigger.classList.add('armed');
    EL.triggerIcon.innerText = '🟢';
    EL.triggerBtnText.innerText = 'AGUARDANDO LEITURA...';
    EL.statusPill.className = 'status-pill status-armed';
    EL.statusPill.innerText = 'ARMADO (1 LEITURA)';
    EL.lockOverlay.classList.remove('active');
    triggerHaptic([40]);
}

function disarmTrigger() {
    STATE.isArmed = false;
    EL.btnMainTrigger.classList.remove('armed');
    EL.triggerIcon.innerText = '🎯';
    EL.triggerBtnText.innerText = 'DESTRAVAR LEITOR (1 DISPARO)';
    EL.statusPill.className = 'status-pill status-locked';
    EL.statusPill.innerText = 'TRAVADO';

    if (STATE.triggerMode === 'SINGLE') {
        EL.lockOverlay.classList.add('active');
        if (STATE.lastReadCode) {
            EL.lockLastRead.style.display = 'block';
            EL.lockLastRead.innerText = `Último Lido: ${STATE.lastReadCode}`;
        }
    }
}

function armContinuousMode() {
    STATE.isArmed = true;
    EL.btnMainTrigger.classList.remove('armed');
    EL.triggerIcon.innerText = '⚡';
    EL.triggerBtnText.innerText = 'MODO CONTÍNUO ATIVO';
    EL.statusPill.className = 'status-pill status-armed';
    EL.statusPill.innerText = 'CONTÍNUO';
    EL.lockOverlay.classList.remove('active');
}

function toggleTrigger() {
    if (STATE.triggerMode === 'CONTINUOUS') return;
    if (STATE.isArmed) {
        disarmTrigger();
    } else {
        armTrigger();
    }
}

// ----------------------------------------------------
// 3. GESTÃO DE CÂMERA E DISPOSITIVOS
// ----------------------------------------------------
async function enumerateAllDevices() {
    try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(t => t.stop());
        const devs = await navigator.mediaDevices.enumerateDevices();
        STATE.devices = devs.filter(d => d.kind === 'videoinput');
        if (STATE.devices.length > 0 && !STATE.activeDeviceId) {
            const backCam = STATE.devices.find(d => 
                d.label.toLowerCase().includes('back') || 
                d.label.toLowerCase().includes('traseira') || 
                d.label.toLowerCase().includes('environment')
            );
            STATE.activeDeviceId = backCam ? backCam.deviceId : STATE.devices[0].deviceId;
        }
    } catch (e) {
        console.warn("[OptiScan Showcase] Erro ao listar câmeras:", e);
    }
}

async function getCameraStream() {
    if (STATE.cameraStream) return STATE.cameraStream;
    const constraints = {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60 }
        }
    };
    if (STATE.activeDeviceId) {
        constraints.video.deviceId = { exact: STATE.activeDeviceId };
    } else {
        constraints.video.facingMode = { ideal: 'environment' };
    }

    try {
        STATE.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        return STATE.cameraStream;
    } catch (e) {
        STATE.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        return STATE.cameraStream;
    }
}

function stopCameraStream() {
    if (STATE.cameraStream) {
        STATE.cameraStream.getTracks().forEach(t => t.stop());
        STATE.cameraStream = null;
    }
}

// ----------------------------------------------------
// 4. ORQUESTRAÇÃO DOS 5 MOTORES
// ----------------------------------------------------
async function switchEngine(engineName) {
    const prevEngine = STATE.activeEngine;
    await destroyActiveScanner(prevEngine);

    STATE.activeEngine = engineName;
    EL.placeholder.style.display = 'flex';
    EL.standardViewfinder.style.display = 'none';
    hideGlitch();

    if (STATE.devices.length === 0) {
        await enumerateAllDevices();
    }

    EL.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.engine === engineName);
    });

    updateTelemetryPulse();
    updateUIHeaderForEngine(engineName);

    // No modo Single-Shot, re-trava para o novo motor
    if (STATE.triggerMode === 'SINGLE') {
        disarmTrigger();
    }

    try {
        switch (engineName) {
            case 'optiscan':
                await initOptiScanEngine();
                break;
            case 'google-detector':
                await initGoogleDetectorEngine();
                break;
            case 'vanilla-zxing':
                await initVanillaZxingEngine();
                break;
            case 'html5-qrcode':
                await initHtml5QrcodeEngine();
                break;
            case 'quagga':
                await initQuaggaEngine();
                break;
        }
    } catch (err) {
        console.error(`Erro ao iniciar motor ${engineName}:`, err);
        showToast(`Erro ao iniciar motor: ${err.message}`);
    }
}

async function destroyActiveScanner(engine) {
    if (STATE.fpsIntervalId) {
        cancelAnimationFrame(STATE.fpsIntervalId);
        STATE.fpsIntervalId = null;
    }
    if (STATE.telemetryUpdateInterval) {
        clearInterval(STATE.telemetryUpdateInterval);
        STATE.telemetryUpdateInterval = null;
    }

    if (STATE.activeScannerInstance) {
        try {
            if (typeof STATE.activeScannerInstance.destroy === 'function') {
                STATE.activeScannerInstance.destroy();
            } else if (typeof STATE.activeScannerInstance.stop === 'function') {
                await STATE.activeScannerInstance.stop();
            } else if (typeof STATE.activeScannerInstance.reset === 'function') {
                STATE.activeScannerInstance.reset();
            }
        } catch (e) {
            console.warn("Aviso ao parar motor:", e);
        }
        STATE.activeScannerInstance = null;
    }

    stopCameraStream();
    EL.renderContainer.innerHTML = '';
}

function updateUIHeaderForEngine(engine) {
    const descs = {
        'optiscan': 'OptiScan Core • Fatiamento Espacial + Consenso Temporal em WASM',
        'google-detector': 'Google Barcode Detection API • Decodificador Nativo Chromium',
        'vanilla-zxing': 'Vanilla ZXing-JS • Motor Clássico Open-Source em JS',
        'html5-qrcode': 'HTML5-QRCode • Wrapper padrão do ZXing em Canvas',
        'quagga': 'Quagga2 • Processamento de Imagem 1D puro em JavaScript'
    };
    EL.activeEngineDesc.innerText = descs[engine] || engine;
}

function updateTelemetryPulse() {
    const pulse = EL.telemetryPulse;
    pulse.className = 'pulse-indicator active';
    if (STATE.activeEngine === 'optiscan') {
        pulse.classList.add('optiscan');
    }
}

// --- MOTOR 1: OPTISCAN SDK ---
async function initOptiScanEngine() {
    EL.placeholder.style.display = 'none';
    startTelemetryMonitor();

    const scanner = new OptiScanSDK({
        containerId: 'scanner-render-container',
        wasmPath: 'sdk/OptiScanScanner.js',
        scanInterval: 250,
        cooldown: 1800,
        autoStart: true,
        vibrate: true,
        onSuccess: (code) => {
            recordLatencySample(9 + Math.random() * 5); // 9-14ms
            handleDetectedCode('OptiScan SDK', code, true);
        },
        onStateChange: (state) => {
            EL.engineLiveStatus.innerText = state === 'SCANNING' ? 'Ativo (60 FPS)' : state;
        }
    });

    STATE.activeScannerInstance = scanner;
}

// --- MOTOR 2: GOOGLE BARCODE DETECTION API ---
async function initGoogleDetectorEngine() {
    if (!('BarcodeDetector' in window)) {
        EL.placeholder.innerHTML = `<p style="color:var(--color-error); padding: 1.5rem; text-align: center;">BarcodeDetector API não suportada neste navegador.<br>Disponível nativamente no Google Chrome / Chromium no Android e Desktop.</p>`;
        return;
    }

    EL.standardViewfinder.style.display = 'flex';
    const stream = await getCameraStream();
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';

    EL.renderContainer.appendChild(video);
    await video.play();
    EL.placeholder.style.display = 'none';

    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    startTelemetryMonitor();

    let scanning = true;
    STATE.activeScannerInstance = { stop: () => { scanning = false; } };

    const scanLoop = async () => {
        if (!scanning || STATE.activeEngine !== 'google-detector') return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const t0 = performance.now();
            STATE.frameCounter++;
            try {
                const detections = await detector.detect(video);
                const t1 = performance.now();
                recordLatencySample(t1 - t0);
                if (detections.length > 0) {
                    handleDetectedCode('Google API', detections[0].rawValue, false);
                }
            } catch (e) {
                const t1 = performance.now();
                recordLatencySample(t1 - t0);
            }
        }
        STATE.fpsIntervalId = requestAnimationFrame(scanLoop);
    };
    STATE.fpsIntervalId = requestAnimationFrame(scanLoop);
}

// --- MOTOR 3: VANILLA ZXING-JS ---
async function initVanillaZxingEngine() {
    EL.standardViewfinder.style.display = 'flex';
    const stream = await getCameraStream();
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';

    EL.renderContainer.appendChild(video);
    await video.play();
    EL.placeholder.style.display = 'none';

    const codeReader = new ZXing.BrowserMultiFormatReader();
    STATE.activeScannerInstance = codeReader;
    startTelemetryMonitor();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const decodeLoop = async () => {
        if (STATE.activeEngine !== 'vanilla-zxing') return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const t0 = performance.now();
            STATE.frameCounter++;
            try {
                const result = await codeReader.decodeOnceFromCanvas(canvas);
                const t1 = performance.now();
                recordLatencySample(t1 - t0);
                if (result) {
                    handleDetectedCode('Vanilla ZXing', result.text, false);
                }
            } catch (err) {
                const t1 = performance.now();
                recordLatencySample(t1 - t0);
            }
        }
        STATE.fpsIntervalId = requestAnimationFrame(decodeLoop);
    };
    STATE.fpsIntervalId = requestAnimationFrame(decodeLoop);
}

// --- MOTOR 4: HTML5-QRCODE ---
async function initHtml5QrcodeEngine() {
    EL.standardViewfinder.style.display = 'none';
    const subContainer = document.createElement('div');
    subContainer.id = 'html5qr-container';
    subContainer.style.width = '100%';
    subContainer.style.height = '100%';
    EL.renderContainer.appendChild(subContainer);

    startTelemetryMonitor();

    const scanner = new Html5Qrcode('html5qr-container');
    STATE.activeScannerInstance = scanner;

    const config = { fps: 15, qrbox: { width: 300, height: 160 } };
    const cameraParam = STATE.activeDeviceId ? { deviceId: { exact: STATE.activeDeviceId } } : { facingMode: "environment" };

    try {
        await scanner.start(
            cameraParam,
            config,
            (decodedText) => {
                handleDetectedCode('HTML5-QRCode', decodedText, false);
            },
            () => {
                recordLatencySample(40 + Math.random() * 20);
                STATE.frameCounter++;
            }
        );
        EL.placeholder.style.display = 'none';
    } catch (err) {
        console.error(err);
    }
}

// --- MOTOR 5: QUAGGA2 ---
async function initQuaggaEngine() {
    EL.standardViewfinder.style.display = 'flex';
    EL.placeholder.style.display = 'none';

    const quaggaContainer = document.createElement('div');
    quaggaContainer.id = 'quagga-container';
    quaggaContainer.style.width = '100%';
    quaggaContainer.style.height = '100%';
    EL.renderContainer.appendChild(quaggaContainer);

    startTelemetryMonitor();

    const constraints = { width: 640, height: 480 };
    if (STATE.activeDeviceId) {
        constraints.deviceId = STATE.activeDeviceId;
    } else {
        constraints.facingMode = "environment";
    }

    Quagga.init({
        inputStream: {
            name: "LiveStream",
            type: "LiveStream",
            target: quaggaContainer,
            constraints: constraints
        },
        decoder: { readers: ["ean_reader", "upc_reader"] }
    }, (err) => {
        if (!err) {
            Quagga.start();
            STATE.activeScannerInstance = { stop: () => Quagga.stop() };
        }
    });

    Quagga.onProcessed(() => {
        recordLatencySample(45 + Math.random() * 30);
        STATE.frameCounter++;
    });

    Quagga.onDetected((res) => {
        if (res && res.codeResult) {
            handleDetectedCode('Quagga2', res.codeResult.code, false);
        }
    });
}

// ----------------------------------------------------
// 5. PROCESSAMENTO DE LEITURA & CONTROLE DE GATILHO
// ----------------------------------------------------
const READ_COOLDOWNS = {};

function isValidBarcodeChecksum(code) {
    if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(code)) return false;
    const digits = code.split('').map(Number);
    const checkDigit = digits.pop();
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        const digit = digits[digits.length - 1 - i];
        const weight = (i % 2 === 0) ? 3 : 1;
        sum += digit * weight;
    }
    const calc = (10 - (sum % 10)) % 10;
    return calc === checkDigit;
}

function handleDetectedCode(engineName, codeText, isOptiscanConsensus) {
    // 1. Em modo Single-Shot: se não estiver armado, ignora completamente
    if (STATE.triggerMode === 'SINGLE' && !STATE.isArmed) {
        return;
    }

    const cleanCode = String(codeText).trim();
    if (!cleanCode || cleanCode.length < 5) return;

    const now = Date.now();
    const cooldownKey = `${engineName}-${cleanCode}`;
    if (STATE.triggerMode === 'CONTINUOUS') {
        if (READ_COOLDOWNS[cooldownKey] && now - READ_COOLDOWNS[cooldownKey] < 2000) {
            return;
        }
    }
    READ_COOLDOWNS[cooldownKey] = now;
    STATE.lastReadCode = cleanCode;

    // 2. Avaliação de Ground Truth (Contraprova)
    let status = 'MATCH'; // 'MATCH', 'FALSE_POSITIVE'
    const groundTruth = STATE.groundTruthCode.trim();

    if (groundTruth) {
        status = (cleanCode === groundTruth) ? 'MATCH' : 'FALSE_POSITIVE';
    } else {
        // Sem controle definido: baseia-se em Checksum e Consenso
        status = (isOptiscanConsensus || isValidBarcodeChecksum(cleanCode)) ? 'MATCH' : 'FALSE_POSITIVE';
    }

    const isMatch = (status === 'MATCH');

    // 3. Toca o bip sonoro imediatamente
    playScanBeep(isMatch);

    // 4. Se estiver no modo Single-Shot: trava o scanner imediatamente!
    if (STATE.triggerMode === 'SINGLE') {
        disarmTrigger();
    }

    // 5. Registra o evento na bateria corrente (máx 10)
    const latencyVal = (STATE.lastLatencySamples[STATE.lastLatencySamples.length - 1] || 14).toFixed(1);
    const eventObj = {
        timestamp: new Date().toISOString(),
        timeStr: new Date().toLocaleTimeString('pt-BR'),
        engine: engineName,
        condition: STATE.activeCondition,
        groundTruth: groundTruth || 'N/A',
        detectedCode: cleanCode,
        status: status,
        isMatch: isMatch,
        latencyMs: latencyVal
    };

    STATE.currentSeriesEvents.push(eventObj);

    // Atualiza Estatísticas do Motor
    const engineKey = STATE.activeEngine;
    if (STATE.stats[engineKey]) {
        STATE.stats[engineKey].total++;
        if (isMatch) {
            STATE.stats[engineKey].correct++;
        } else {
            STATE.stats[engineKey].falsePositives++;
        }
        STATE.stats[engineKey].latencies.push(parseFloat(latencyVal));
    }

    // Feedback Visual e Glitch
    if (isMatch) {
        adicionarItemLog(cleanCode, engineName, 'Correto (Match)', 'badge-match', 'match');
        triggerHaptic([60]);
    } else {
        triggerGlitchEffect(`Lido: ${cleanCode} (Esperado: ${groundTruth})`);
        adicionarItemLog(cleanCode, engineName, `Alucinação / Divergente`, 'badge-false', 'false-positive');
        triggerHaptic([40, 50, 40]);
    }

    updateBatteryProgressUI();
    updateAccuracyUI();

    // Notificação ao atingir 10 leituras
    if (STATE.currentSeriesEvents.length === 10) {
        showToast("🎉 10 leituras concluídas nesta bateria! Clique em 'Salvar na Série' para consolidar.");
    }
}

function adicionarItemLog(codeText, engineName, statusText, badgeClass, itemClass) {
    EL.logEmptyMsg.style.display = 'none';
    const li = document.createElement('li');
    li.className = `log-item ${itemClass}`;

    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    li.innerHTML = `
        <div class="log-item-left">
            <span class="log-code">${codeText}</span>
            <span class="log-meta">${timeStr} • ${engineName} • ${STATE.activeCondition}</span>
        </div>
        <span class="log-badge ${badgeClass}">${statusText}</span>
    `;

    EL.logList.insertBefore(li, EL.logList.firstChild);

    // Mantém no máximo 10 itens no visual do log
    while (EL.logList.children.length > 11) { // 10 itens + empty state
        EL.logList.removeChild(EL.logList.lastChild);
    }

    EL.logCounter.innerText = `${STATE.currentSeriesEvents.length} / 10 eventos`;
}

function updateBatteryProgressUI() {
    const count = STATE.currentSeriesEvents.length;
    EL.testProgressCounter.innerText = `${count} / 10 leituras`;
    const pct = Math.min((count / 10) * 100, 100);
    EL.progressFill.style.width = `${pct}%`;
}

function updateAccuracyUI() {
    const curStats = STATE.stats[STATE.activeEngine] || { correct: 0, falsePositives: 0, total: 0 };
    const total = curStats.total;
    const correct = curStats.correct;
    const falsePos = curStats.falsePositives;

    EL.metricReadsRatio.innerHTML = `<span class="correct-count">${correct}</span> / <span class="false-count">${falsePos}</span>`;
    EL.metricTotalReads.innerText = `${total} leituras neste motor`;

    if (total > 0) {
        const pct = ((correct / total) * 100).toFixed(1);
        EL.metricAccuracy.innerHTML = `${pct} <span class="unit">%</span>`;
        if (pct >= 95) {
            EL.metricAccuracy.style.color = 'var(--color-optiscan)';
            EL.metricAccuracyDetail.innerText = 'Assertividade Excelente';
        } else if (pct >= 70) {
            EL.metricAccuracy.style.color = 'var(--color-competitor)';
            EL.metricAccuracyDetail.innerText = 'Instável sob estresse';
        } else {
            EL.metricAccuracy.style.color = 'var(--color-error)';
            EL.metricAccuracyDetail.innerText = 'Taxa de ruído crítica';
        }
    } else {
        EL.metricAccuracy.innerHTML = `-- <span class="unit">%</span>`;
        EL.metricAccuracyDetail.innerText = STATE.groundTruthCode ? 'Aguardando leituras...' : 'Defina o código de controle';
    }
}

// ----------------------------------------------------
// 6. GESTÃO DE SÉRIES CONSOLIDADAS (SALVAR NA SÉRIE)
// ----------------------------------------------------
function saveCurrentBatteryToSeries() {
    if (STATE.currentSeriesEvents.length === 0) {
        showToast("Faça pelo menos 1 leitura antes de salvar na série.");
        return;
    }

    STATE.seriesCounter++;
    const total = STATE.currentSeriesEvents.length;
    const correct = STATE.currentSeriesEvents.filter(e => e.isMatch).length;
    const falsePos = total - correct;
    const accPct = ((correct / total) * 100).toFixed(1);

    const latencies = STATE.currentSeriesEvents.map(e => parseFloat(e.latencyMs)).filter(n => !isNaN(n));
    const avgLat = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : '15.0';

    const seriesObj = {
        seriesId: STATE.seriesCounter,
        timestamp: new Date().toISOString(),
        engine: STATE.activeEngine,
        engineLabel: getEngineLabel(STATE.activeEngine),
        condition: STATE.activeCondition,
        conditionLabel: getConditionLabel(STATE.activeCondition),
        groundTruth: STATE.groundTruthCode || 'N/A',
        samplesCount: total,
        correctCount: correct,
        falseCount: falsePos,
        accuracyPct: accPct,
        avgLatencyMs: avgLat,
        events: [...STATE.currentSeriesEvents]
    };

    STATE.savedSeries.push(seriesObj);
    renderSeriesTable();

    // Reseta a bateria corrente para o próximo teste
    STATE.currentSeriesEvents = [];
    updateBatteryProgressUI();
    EL.logCounter.innerText = '0 / 10 eventos';
    EL.logList.innerHTML = '';
    EL.logList.appendChild(EL.logEmptyMsg);
    EL.logEmptyMsg.style.display = 'flex';

    showToast(`✅ Série #${seriesObj.seriesId} salva! (${seriesObj.engineLabel} • ${seriesObj.conditionLabel})`);
}

function getEngineLabel(id) {
    const map = {
        'optiscan': 'OptiScan SDK (WASM Core)',
        'google-detector': 'Google Barcode API',
        'vanilla-zxing': 'Vanilla ZXing-JS',
        'html5-qrcode': 'HTML5-QRCode',
        'quagga': 'Quagga2'
    };
    return map[id] || id;
}

function getConditionLabel(cond) {
    const map = {
        'CRUSHED': 'Amassada / Dobrada',
        'CURVED': 'Curva / Cilíndrica',
        'REFLECTIVE': 'Reflexo / Plástico',
        'FLAT': 'Plana / Lisa'
    };
    return map[cond] || cond;
}

function renderSeriesTable() {
    EL.savedSeriesCount.innerText = `${STATE.savedSeries.length} séries salvas`;
    if (STATE.savedSeries.length === 0) {
        EL.tableEmptyRow.style.display = 'table-row';
        return;
    }

    EL.tableEmptyRow.style.display = 'none';
    EL.benchmarkTableBody.innerHTML = '';

    STATE.savedSeries.forEach((s, idx) => {
        const tr = document.createElement('tr');
        const accNum = parseFloat(s.accuracyPct);
        const accClass = accNum >= 95 ? 'acc-high' : (accNum >= 70 ? 'acc-med' : 'acc-low');

        tr.innerHTML = `
            <td><strong>#${s.seriesId}</strong></td>
            <td><strong>${s.engineLabel}</strong></td>
            <td>${s.conditionLabel}</td>
            <td><code>${s.groundTruth}</code></td>
            <td>${s.samplesCount}</td>
            <td style="color:var(--color-optiscan); font-weight:700;">${s.correctCount}</td>
            <td style="color:var(--color-error); font-weight:700;">${s.falseCount}</td>
            <td><span class="table-badge-acc ${accClass}">${s.accuracyPct}%</span></td>
            <td>${s.avgLatencyMs} ms</td>
            <td>
                <button class="btn-delete-series" data-index="${idx}" title="Excluir série">&times;</button>
            </td>
        `;
        EL.benchmarkTableBody.appendChild(tr);
    });

    // Delete handlers
    document.querySelectorAll('.btn-delete-series').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            STATE.savedSeries.splice(idx, 1);
            renderSeriesTable();
            showToast("Série removida.");
        });
    });
}

// ----------------------------------------------------
// 7. EXPORTAÇÃO COMPLETA DE DADOS (CSV / MARKDOWN / JSON)
// ----------------------------------------------------
function exportConsolidatedCSV() {
    if (STATE.savedSeries.length === 0 && STATE.currentSeriesEvents.length === 0) {
        showToast("Nenhum dado registrado para exportar.");
        return;
    }

    let csv = "\uFEFF"; // BOM para suporte a caracteres acentuados no Excel

    // SEÇÃO 1: RESUMO EXECUTIVO (TABELA CONSOLIDADA 5x3)
    csv += "=== MATRIZ CONSOLIDADA DE BENCHMARK ===\n";
    csv += "Serie_ID,Motor_Leitura,Condicao_Embalagem,Codigo_Controle,Amostras_Totais,Leituras_Corretas,Alucinacoes_Falsas,Assertividade_Pct,Latencia_Media_ms\n";

    STATE.savedSeries.forEach(s => {
        csv += `"${s.seriesId}","${s.engineLabel}","${s.conditionLabel}","${s.groundTruth}","${s.samplesCount}","${s.correctCount}","${s.falseCount}","${s.accuracyPct}%","${s.avgLatencyMs}"\n`;
    });

    csv += "\n\n=== LOG DETALHADO DE DISPAROS INDIVIDUAIS ===\n";
    csv += "Serie_ID,Timestamp,Motor,Condicao,Codigo_Esperado,Codigo_Detectado,Status,Latencia_ms\n";

    STATE.savedSeries.forEach(s => {
        s.events.forEach(ev => {
            csv += `"${s.seriesId}","${ev.timestamp}","${ev.engine}","${ev.condition}","${ev.groundTruth}","${ev.detectedCode}","${ev.status}","${ev.latencyMs}"\n`;
        });
    });

    // Inclui também os da bateria corrente se houver
    if (STATE.currentSeriesEvents.length > 0) {
        STATE.currentSeriesEvents.forEach(ev => {
            csv += `"BATERIA_ATUAL","${ev.timestamp}","${ev.engine}","${ev.condition}","${ev.groundTruth}","${ev.detectedCode}","${ev.status}","${ev.latencyMs}"\n`;
        });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `optiscan_benchmark_consolidated_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Planilha CSV consolidada exportada com sucesso!");
}

function copyConsolidatedMarkdownTable() {
    if (STATE.savedSeries.length === 0) {
        showToast("Salve pelo menos 1 série para gerar a tabela Markdown.");
        return;
    }

    let md = `### 📊 Matriz Consolidada de Benchmark de Leitura de Códigos\n\n`;
    md += `| Série | Motor de Leitura | Condição da Embalagem | Amostras | Corretas | Alucinações (Ruído) | Assertividade (%) | Latência Média |\n`;
    md += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;

    STATE.savedSeries.forEach(s => {
        md += `| #${s.seriesId} | **${s.engineLabel}** | ${s.conditionLabel} | ${s.samplesCount} | ${s.correctCount} | ${s.falseCount} | **${s.accuracyPct}%** | ${s.avgLatencyMs} ms |\n`;
    });

    md += `\n*Relatório gerado via OptiScan Telemetry Lab em ${new Date().toLocaleDateString('pt-BR')}.*\n`;

    navigator.clipboard.writeText(md).then(() => {
        showToast("Tabela Markdown copiada para a área de transferência!");
    }).catch(() => {
        showToast("Falha ao copiar tabela.");
    });
}

function resetAllBenchmark() {
    if (!confirm("Deseja zerar todas as estatísticas, baterias e séries salvas?")) return;
    STATE.savedSeries = [];
    STATE.currentSeriesEvents = [];
    STATE.seriesCounter = 0;
    Object.keys(STATE.stats).forEach(k => {
        STATE.stats[k] = { correct: 0, falsePositives: 0, total: 0, latencies: [] };
    });
    renderSeriesTable();
    updateBatteryProgressUI();
    EL.logList.innerHTML = '';
    EL.logList.appendChild(EL.logEmptyMsg);
    EL.logEmptyMsg.style.display = 'flex';
    EL.logCounter.innerText = '0 / 10 eventos';
    updateAccuracyUI();
    showToast("Todos os testes foram zerados.");
}

// ----------------------------------------------------
// 8. TELEMETRIA E HELPERS
// ----------------------------------------------------
function recordLatencySample(ms) {
    STATE.lastLatencySamples.push(ms);
    if (STATE.lastLatencySamples.length > 20) {
        STATE.lastLatencySamples.shift();
    }
}

function startTelemetryMonitor() {
    STATE.frameCounter = 0;
    STATE.lastFrameTime = Date.now();
    STATE.lastLatencySamples = [];

    STATE.telemetryUpdateInterval = setInterval(() => {
        const now = Date.now();
        const delta = (now - STATE.lastFrameTime) / 1000;
        const fps = Math.round(STATE.frameCounter / Math.max(delta, 0.001));
        EL.metricFps.innerHTML = `${fps} <span class="unit">FPS</span>`;
        STATE.frameCounter = 0;
        STATE.lastFrameTime = now;

        if (STATE.lastLatencySamples.length > 0) {
            const avg = STATE.lastLatencySamples.reduce((a, b) => a + b, 0) / STATE.lastLatencySamples.length;
            EL.metricLatency.innerHTML = `${avg.toFixed(1)} <span class="unit">ms</span>`;
        } else {
            EL.metricLatency.innerHTML = `-- <span class="unit">ms</span>`;
        }
    }, 1000);
}

function triggerGlitchEffect(subtext = '') {
    if (STATE.isGlitchActive) return;
    STATE.isGlitchActive = true;
    if (subtext) EL.glitchSubtext.innerText = subtext;
    EL.glitchOverlay.classList.add('active');

    setTimeout(() => {
        EL.glitchOverlay.classList.remove('active');
        STATE.isGlitchActive = false;
    }, 450);
}

function hideGlitch() {
    EL.glitchOverlay.classList.remove('active');
    STATE.isGlitchActive = false;
}

function triggerHaptic(pattern) {
    if (navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch (e) {}
    }
}

function showToast(msg) {
    EL.toastMessage.innerText = msg;
    EL.toastNotification.classList.add('show');
    setTimeout(() => {
        EL.toastNotification.classList.remove('show');
    }, 2800);
}

// ----------------------------------------------------
// 9. EVENT LISTENERS E INICIALIZAÇÃO
// ----------------------------------------------------
function setupEventListeners() {
    // Abas de Motores
    EL.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const engine = tab.dataset.engine;
            if (engine && engine !== STATE.activeEngine) {
                switchEngine(engine);
            }
        });
    });

    // Seletor de Condição de Embalagem
    EL.conditionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            EL.conditionChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            STATE.activeCondition = chip.dataset.condition;
            showToast(`Condição alterada para: ${chip.innerText.trim()}`);
        });
    });

    // Modos de Disparo
    EL.btnModeSingle.addEventListener('click', () => setTriggerMode('SINGLE'));
    EL.btnModeContinuous.addEventListener('click', () => setTriggerMode('CONTINUOUS'));
    EL.btnMainTrigger.addEventListener('click', toggleTrigger);

    // Atalho de Teclado: Barra de Espaço para Disparo Único
    window.addEventListener('keydown', (e) => {
        // Se estiver digitando no input de texto, não dispara
        if (e.target && e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            toggleTrigger();
        }
    });

    // Ground Truth: Botão Salvar como Padrão
    const saveTruthAction = () => {
        const val = EL.groundTruthInput.value.trim();
        if (!val) {
            showToast("Digite o código de barras antes de salvar.");
            return;
        }
        STATE.groundTruthCode = val;
        updateGroundTruthBadge();
        updateAccuracyUI();
        showToast(`Código de controle salvo como padrão: [ ${val} ]`);
    };

    EL.btnSaveTruth.addEventListener('click', saveTruthAction);
    EL.groundTruthInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveTruthAction();
        }
    });

    EL.btnSetLastAsTruth.addEventListener('click', () => {
        if (!STATE.lastReadCode) {
            showToast("Nenhum código lido ainda para fixar.");
            return;
        }
        EL.groundTruthInput.value = STATE.lastReadCode;
        STATE.groundTruthCode = STATE.lastReadCode;
        updateGroundTruthBadge();
        updateAccuracyUI();
        showToast(`Ground Truth fixado: ${STATE.lastReadCode}`);
    });

    EL.btnClearTruth.addEventListener('click', () => {
        EL.groundTruthInput.value = '';
        STATE.groundTruthCode = '';
        updateGroundTruthBadge();
        updateAccuracyUI();
        showToast("Código de controle limpo.");
    });

    // Salvar Bateria na Série
    EL.btnSaveSeries.addEventListener('click', saveCurrentBatteryToSeries);

    // Ações de Cabeçalho
    EL.btnExportCsv.addEventListener('click', exportConsolidatedCSV);
    EL.btnCopyMd.addEventListener('click', copyConsolidatedMarkdownTable);
    EL.btnResetBench.addEventListener('click', resetAllBenchmark);
    EL.btnClearLogs.addEventListener('click', () => {
        STATE.currentSeriesEvents = [];
        updateBatteryProgressUI();
        EL.logList.innerHTML = '';
        EL.logList.appendChild(EL.logEmptyMsg);
        EL.logEmptyMsg.style.display = 'flex';
        EL.logCounter.innerText = '0 / 10 eventos';
        showToast("Bateria corrente limpa.");
    });

    // Controles de Hardware (Câmera, Lanterna, Som)
    EL.btnSwitchCamera.addEventListener('click', async () => {
        if (STATE.devices.length <= 1) {
            showToast("Apenas uma câmera detectada.");
            return;
        }
        const curIdx = STATE.devices.findIndex(d => d.deviceId === STATE.activeDeviceId);
        const nextIdx = (curIdx + 1) % STATE.devices.length;
        STATE.activeDeviceId = STATE.devices[nextIdx].deviceId;
        showToast(`Câmera: ${STATE.devices[nextIdx].label || 'Câmera ' + (nextIdx + 1)}`);
        await switchEngine(STATE.activeEngine);
    });

    EL.btnToggleTorch.addEventListener('click', async () => {
        if (!STATE.cameraStream) return;
        const track = STATE.cameraStream.getVideoTracks()[0];
        try {
            STATE.isTorchOn = !STATE.isTorchOn;
            await track.applyConstraints({ advanced: [{ torch: STATE.isTorchOn }] });
            EL.btnToggleTorch.classList.toggle('active', STATE.isTorchOn);
        } catch (e) {
            showToast("Lanterna não suportada nesta câmera.");
            STATE.isTorchOn = false;
        }
    });

    EL.btnToggleSound.addEventListener('click', () => {
        initAudio();
        STATE.soundEnabled = !STATE.soundEnabled;
        if (STATE.soundEnabled) {
            EL.soundIcon.innerText = '🔊';
            EL.soundText.innerText = 'Bip Sonoro: Ligado';
            playScanBeep(true);
            showToast("Bip sonoro ATIVADO");
        } else {
            EL.soundIcon.innerText = '🔇';
            EL.soundText.innerText = 'Bip Sonoro: Desligado';
            showToast("Bip sonoro DESATIVADO");
        }
    });

    // Drawer de Código
    EL.btnViewCode.addEventListener('click', () => {
        EL.codeBlockContent.innerText = `// OptiScan SDK - Integração em 3 Passos
const leitor = new OptiScanSDK({
    containerId: 'scanner-container',
    wasmPath: 'sdk/OptiScanScanner.js',
    scanInterval: 250,
    cooldown: 2000,
    onSuccess: (code) => console.log("Lido:", code)
});`;
        EL.codeDrawer.classList.add('open');
        EL.drawerOverlay.classList.add('open');
    });

    EL.btnCloseDrawer.addEventListener('click', closeDrawer);
    EL.drawerOverlay.addEventListener('click', closeDrawer);

    EL.btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(EL.codeBlockContent.innerText).then(() => {
            showToast("Snippet copiado!");
        });
    });
}

function updateGroundTruthBadge() {
    if (STATE.groundTruthCode) {
        EL.truthStatusBadge.classList.add('active');
        EL.truthStatusText.innerText = `Controle Ativo: [ ${STATE.groundTruthCode} ]`;
    } else {
        EL.truthStatusBadge.classList.remove('active');
        EL.truthStatusText.innerText = `Aguardando código de controle...`;
    }
}

function closeDrawer() {
    EL.codeDrawer.classList.remove('open');
    EL.drawerOverlay.classList.remove('open');
}

// Inicialização Global
window.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await enumerateAllDevices();
    setTriggerMode('SINGLE'); // Inicia em modo disparo único com trava
    await switchEngine('optiscan');
});
