/**
 * OptiScan Showcase - Application Constants & Configuration
 * (c) 2026 OptiScan Technologies
 */

export const ENGINES = {
    OPTISCAN: {
        id: 'optiscan',
        name: 'OptiScan SDK (WASM Core)',
        shortName: 'OptiScan',
        description: 'OptiScan Core • Fatiamento Espacial + Consenso Temporal em WASM',
        tag: 'WASM'
    },
    GOOGLE: {
        id: 'google-detector',
        name: 'Google Barcode Detection API',
        shortName: 'Google API',
        description: 'Google Barcode Detection API • Decodificador Nativo Chromium',
        tag: 'NATIVE'
    },
    VANILLA_ZXING: {
        id: 'vanilla-zxing',
        name: 'Vanilla ZXing-JS',
        shortName: 'Vanilla ZXing',
        description: 'Vanilla ZXing-JS • Motor Clássico Open-Source em JS',
        tag: 'JS'
    },
    HTML5_QRCODE: {
        id: 'html5-qrcode',
        name: 'HTML5-QRCode',
        shortName: 'HTML5-QR',
        description: 'HTML5-QRCode • Wrapper padrão do ZXing em Canvas',
        tag: 'JS'
    },
    QUAGGA: {
        id: 'quagga',
        name: 'Quagga2',
        shortName: 'Quagga2',
        description: 'Quagga2 • Processamento de Imagem 1D puro em JavaScript',
        tag: 'JS'
    }
};

export const CONDITIONS = {
    CRUSHED: {
        id: 'CRUSHED',
        label: 'Amassada / Dobrada',
        icon: '⚡'
    },
    CURVED: {
        id: 'CURVED',
        label: 'Curva / Cilíndrica',
        icon: '🥫'
    },
    REFLECTIVE: {
        id: 'REFLECTIVE',
        label: 'Reflexo / Plástico',
        icon: '💡'
    },
    FLAT: {
        id: 'FLAT',
        label: 'Plana / Lisa (Padrão)',
        icon: '📄'
    }
};

export const BENCHMARK_CONFIG = {
    MAX_SAMPLES_PER_SERIES: 10,
    COOLDOWN_CONTINUOUS_MS: 1800,
    DEFAULT_ENGINE: 'optiscan',
    DEFAULT_CONDITION: 'CRUSHED'
};
