# 🏗️ Arquitetura de Software & Paridade de Testes — OptiScan Showcase

Este documento descreve as decisões de arquitetura de software, padrões de projeto e o rigor metodológico adotados na construção deste laboratório de testes e telemetria.

---

## 📐 Padrões de Projeto & Princípios SOLID

A aplicação foi desenvolvida sob o padrão arquitetural **Strategy / Adapter Pattern (GoF)** em **ES Modules (ESM)** nativos, garantindo clareza, desacoplamento e manutenibilidade de nível enterprise.

```mermaid
classDiagram
    class BaseScannerAdapter {
        <<abstract>>
        +init(container, onRead, onLatency, onError)
        +start()
        +stop()
        +destroy()
        +switchCamera()
        +toggleTorch()
    }

    class OptiScanAdapter {
        +init()
        +start()
        +stop()
        +destroy()
    }

    class GoogleDetectorAdapter {
        +init()
        +start()
        +stop()
        +destroy()
    }

    class VanillaZxingAdapter {
        +init()
        +start()
        +stop()
        +destroy()
    }

    class Html5QrAdapter {
        +init()
        +start()
        +stop()
        +destroy()
    }

    class QuaggaAdapter {
        +init()
        +start()
        +stop()
        +destroy()
    }

    BaseScannerAdapter <|-- OptiScanAdapter
    BaseScannerAdapter <|-- GoogleDetectorAdapter
    BaseScannerAdapter <|-- VanillaZxingAdapter
    BaseScannerAdapter <|-- Html5QrAdapter
    BaseScannerAdapter <|-- QuaggaAdapter
```

---

## 🔬 Paridade Científica e Visual dos Testes (Test Parity)

Para garantir que o comparativo de performance e assertividade seja 100% justo, imparcial e auditável por recrutadores e engenheiros de visão computacional, todos os 5 motores competem sob **idênticas condições operacionais e visuais**:

1. **ROI Verde e Framing Unificado:** A região de interesse (ROI demarcado por cantoneiras verdes neon e laser de varredura animado) é um componente compartilhado no DOM (`#standard-viewfinder`). Ele permanece ativo e com as mesmas dimensões (72% × 48%) sobreposto à câmera em **todos os 5 motores**, garantindo que nenhum motor receba vantagens de enquadramento.
2. **Mesma Resolução de Captura:** Todos os motores solicitam constraints de vídeo idênticas (`ideal: 1280x720, min: 640x480` a 60 FPS com sensor traseiro `environment`).
3. **Mesma Iluminação e Ângulo:** A comutação de motores é instantânea dentro da mesma sessão e pelo mesmo dispositivo físico (ex: Samsung Galaxy M53 ou Desktop).
4. **Mapeamento Unificado de Eventos:**
   - **`onRead(code, isConsensus)`:** Disparado no exato instante em que um código é decodificado.
   - **`onLatency(latencyMs)`:** Mede o tempo de processamento em JavaScript/WASM de cada frame.
   - **`onError(err)`:** Captura exceções de decodificação e driver de câmera.

---

## 🔌 Especificações Técnicas dos Adaptadores (Adapter Layer)

Cada biblioteca concorrente possui peculiaridades de API e gerenciamento de hardware. A camada de adaptadores padroniza essas interfaces mantendo as chamadas no mesmo nível de justiça:

### 1. OptiScan SDK (C++ WebAssembly Core)
- **Engine:** Binário WebAssembly compilado com Clang/Emscripten (`-O3`, SIMD).
- **Entrada:** Processamento de stream direto da câmera com fatiamento espacial e consenso temporal.
- **Isolamento:** Overlays internos de CSS da biblioteca foram neutralizados em favor do Viewfinder padronizado do laboratório.

### 2. Google BarcodeDetector API (Chromium Nativo)
- **Engine:** API nativa do navegador Chromium (aceleração de hardware pelo SO).
- **Entrada:** Recebe o elemento `<video>` nativo e roda a detecção com formatos `['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']`.
- **Particularidade:** Altíssimo throughput quando o código está perfeitamente plano, porém sofre quedas de assertividade em curvaturas severas.

### 3. Vanilla ZXing-JS (`@zxing/library`)
- **Engine:** `BrowserMultiFormatReader` em JavaScript puro.
- **Particularidade & Ajuste:** O leitor utiliza `hints` configurados com `DecodeHintType.POSSIBLE_FORMATS` (EAN-13, EAN-8, UPC-A, UPC-E, Code 128) e `DecodeHintType.TRY_HARDER = true`. O stream é processado via `decodeFromStream(stream, videoElement, callback)` para evitar sobrecarga de polling manual por canvas.
- **Teardown:** `codeReader.reset()` garante o encerramento limpo da thread de varredura.

### 4. HTML5-QRCode (`html5-qrcode@2.3.8`)
- **Engine:** Wrapper de alto nível com fallback para ZXing e BarcodeDetector.
- **Particularidade & Ajuste:** A versão 2.3.8 do HTML5-QRCode valida estritamente o parâmetro de câmera `cameraIdOrConfig`. Passar objetos fora do padrão lança exceção imediata. Foi fixada a constraint padrão `{ facingMode: 'environment' }` e garantida a liberação prévia do stream nativo (`cameraManager.stopStream()`) para evitar `NotReadableError` decorrente de concorrência com o driver do Android/Samsung.

### 5. Quagga2 (`@ericblade/quagga2`)
- **Engine:** Leitor 1D baseado em processamento de canvas e gradiente de bordas.
- **Particularidade & Ajuste:** Configurado para `readers: ['ean_reader', 'upc_reader']`. Opera em resolução moderada (640x480) para equilibrar o alto consumo de CPU em navegadores móveis.

---

## 📁 Estrutura Modular de Arquivos

```text
optiscan-sdk-showcase/
├── index.html                   # Shell SPA responsivo (Desktop & Mobile M53)
├── style.css                    # Estilização obsidian glassmorphism + Breakpoints
├── docs/
│   └── ARCHITECTURE.md          # Esta documentação arquitetural
├── js/
│   ├── main.js                  # Entry point e orquestrador da aplicação
│   ├── config/
│   │   └── constants.js         # Configurações globais, motores e condições
│   ├── core/
│   │   ├── audio.js             # Sintetizador de áudio Web Audio API (Bip com zero latência)
│   │   ├── camera.js            # Gerenciador resiliente de captura e enumeração de câmeras
│   │   └── telemetry.js         # Monitor de FPS real e latência por frame
│   ├── benchmark/
│   │   ├── ground-truth.js      # Validador de código de controle, checksum e alucinações
│   │   ├── series-manager.js    # Gerenciador da bateria (até 10 eventos) e matriz consolidada
│   │   └── exporter.js          # Exportador profissional de dados (CSV, Markdown, JSON)
│   ├── engines/
│   │   ├── engine-adapter.js    # Interface Base abstrata (BaseScannerAdapter)
│   │   ├── optiscan-adapter.js  # Adaptador do OptiScan SDK (C++ WebAssembly Core)
│   │   ├── google-adapter.js    # Adaptador da BarcodeDetector API (Chromium Nativo)
│   │   ├── zxing-adapter.js     # Adaptador do Vanilla ZXing-JS (Com hints 1D e decodeFromStream)
│   │   ├── html5qr-adapter.js   # Adaptador do HTML5-QRCode (Sintaxe estrita de câmera)
│   │   └── quagga-adapter.js    # Adaptador do Quagga2
│   └── ui/
│       ├── ui-controller.js     # Gestão da interface, tabs, toasts e glitch
│       └── trigger-controller.js# Controle do gatilho de disparo único e atalho de espaço
└── sdk/
    ├── OptiScanScanner.wasm     # Binário WebAssembly otimizado (-O3, sem debug)
    ├── OptiScanScanner.js       # Glue code Emscripten
    ├── optiscan-sdk.min.js      # Wrapper JS ofuscado via Terser com Trava de Domínio
    └── optiscan-sdk.css         # Estilos isolados do componente do scanner
```

---

## 🎯 Como o OptiScan Vence em Superfícies Desafiadoras

Enquanto os concorrentes realizam **análise de frame estático** (onde uma dobra ou reflexo cega o código inteiro na imagem), o **OptiScan** aplica uma arquitetura de dois pilares:

1. **Fatiamento Espacial (*Spatial Slicing*):** O frame de vídeo é seccionado em fatias horizontais independentes dentro do WebAssembly. Mesmo que a embalagem esteja severamente amassada ou curva, partes das barras permanecem alinhadas em fatias individuais.
2. **Consenso Temporal (*Temporal Consensus*):** À medida que o operador movimenta a embalagem na frente da câmera, a luz especular e os reflexos se deslocam. O OptiScan acumula os votos de múltiplos frames consecutivos para reconstruir o código com 100% de integridade, eliminando alucinações de leitura.
