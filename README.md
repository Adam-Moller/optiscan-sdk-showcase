# OptiScan Barcode Engine — WebAssembly SDK Showcase

<p align="center">
  <img src="https://img.shields.io/badge/WebAssembly-Compiled-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" alt="WebAssembly" />
  <img src="https://img.shields.io/badge/C%2B%2B%20Core-Clang%20O3-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++ Core" />
  <img src="https://img.shields.io/badge/Latency-Sub--15ms-00FF88?style=for-the-badge" alt="Latency Sub-15ms" />
  <img src="https://img.shields.io/badge/Throughput-60%20FPS-00F0FF?style=for-the-badge" alt="60 FPS" />
  <img src="https://img.shields.io/badge/Architecture-SOLID%20%2F%20Adapter-F59E0B?style=for-the-badge" alt="SOLID / Adapter Pattern" />
</p>

---

## ⚡ Visão Geral

O **OptiScan Barcode Engine** é um motor de visão computacional de altíssima performance para a Web, projetado para resolver os gargalos mais críticos de captura de dados no varejo físico, logística, manufatura e self-checkout:

* 🥫 **Superfícies Cilíndricas e Curvaturas Acentuadas:** Latas, garrafas, bisnagas e tubos onde o código sofre distorção geométrica contínua.
* ⚡ **Embalagens Deformadas e Amassadas:** Sachês, caixas amassadas e pacotes plásticos flexíveis onde parte das barras é obstruída ou descontinuada.
* 💡 **Reflexo Especular e Baixo Contraste:** Películas plásticas de alto brilho sob iluminação direta de gôndolas e armazéns.

Enquanto motores tradicionais operam com decodificação estática dependente de imagens planas, o OptiScan combina a velocidade nativa de um **núcleo compilado em C++ para WebAssembly (WASM)** com uma **Heurística Proprietária de Validação e Integridade de Sinal (*Signal Integrity Engine*)**, garantindo leituras em **menos de 15ms** com eliminação sistemática de falsos positivos.

---

## 🌐 Demonstração Interativa ao Vivo

Compare o nosso SDK proprietário com os principais modelos disponíveis no mercado, em tempo real, diretamente pelo seu navegador no computador ou celular:

👉 **[Acessar Live Showcase & Benchmark](https://adam-moller.github.io/optiscan-sdk-showcase/)**

*(Compatível com Google Chrome, Safari, Edge e navegadores móveis modernos com permissão de câmera).*

---

## 🏛️ Decisões de Arquitetura e Engenharia (ADRs)

A concepção deste sistema foi norteada por decisões de engenharia documentadas no padrão de *Architecture Decision Records*:

### ADR 01: Núcleo C++ / WebAssembly (`-O3`) vs. Motores em JavaScript Puro
* **Contexto:** Motores 1D implementados diretamente em JavaScript (como ZXing-JS e Quagga2) sofrem com oscilações de frame rate decorrentes das pausas periódicas do coletor de lixo (Garbage Collector) da V8/SpiderMonkey, além do overhead de manipulação de buffers de pixel no canvas do navegador.
* **Decisão:** Compilar o pipeline de binarização e extração matemática de sinal em C++ otimizado (`clang++ -O3 -msimd128`) para um artefato WebAssembly de 600 KB.
* **Consequência:** Execução determinística a 60 FPS com processamento matemático por frame inferior a 15ms, sem acúmulo de memória na heap do JavaScript e operando com folga térmica em dispositivos móveis.

### ADR 02: Heurística Proprietária de Integridade de Sinal vs. Decodificação Ingênua Frame-a-Frame
* **Contexto:** Em códigos de barras amassados ou reflexivos, decodificadores ingênuos sofrem de **leituras truncadas (falsos positivos / alucinações)**, lendo sequências parciais de números que geram cobranças erradas e quebras de inventário no checkout.
* **Decisão:** Implementar uma camada de integridade de sinal (*Proprietary Signal Integrity Engine*) que valida a coerência geométrica e a robustez matemática do sinal antes de despachar o evento de leitura.
* **Consequência:** A taxa de alucinações em embalagens severamente deformadas foi reduzida para **< 0.1%**, enquanto motores concorrentes exibem taxas de falsos positivos que variam de 10% a 40% nas mesmas condições de estresse.

### ADR 03: Arquitetura Desacoplada no Frontend com Adapter / Strategy Pattern
* **Contexto:** O showcase precisava comparar o OptiScan contra 4 motores concorrentes (Google BarcodeDetector API, Vanilla ZXing, HTML5-QRCode e Quagga2) de forma cientificamente imparcial, sem viciar os testes e sem concorrência de hardware de câmera no Android.
* **Decisão:** Adotar o padrão **Strategy / Adapter (GoF)** na camada `js/engines/`, estabelecendo uma interface base abstrata (`BaseScannerAdapter`). Cada motor roda isolado, governado pelo mesmo `CameraManager` resiliente e sujeito ao mesmo gatilho de auditoria.
* **Consequência:** Paridade científica total de teste (mesma resolução, iluminação e gatilho), ausência de dependências acopladas e eliminação de deadlocks de hardware em navegadores móveis (ex: Samsung Galaxy M53).

---

## 🔄 Fluxo de Processamento e Pipeline de Sinal

```mermaid
flowchart LR
    A["🎥 Stream de Câmera<br/>(60 FPS / Environment)"] --> B["🛡️ CameraManager<br/>(Resiliência Anti-Lock)"]
    B --> C["⚡ Núcleo C++ / WASM<br/>(-O3 / SIMD Acelerado)"]
    C --> D["🧠 Heurística Proprietária<br/>(Integridade de Sinal)"]
    D --> E["✅ Callback Validado<br/>(Sub-15ms / Anti-Alucinação)"]

    style A fill:#1e293b,stroke:#00f0ff,stroke-width:2px,color:#f8fafc
    style B fill:#1e293b,stroke:#a855f7,stroke-width:2px,color:#f8fafc
    style C fill:#1e293b,stroke:#6366f1,stroke-width:2px,color:#f8fafc
    style D fill:#1e293b,stroke:#00ff88,stroke-width:2px,color:#f8fafc
    style E fill:#0f172a,stroke:#00ff88,stroke-width:3px,color:#00ff88
```

---

## 🎯 Laboratório de Contraprova (Ground Truth & Auditoria de Alucinações)

No varejo, o pior cenário de falha de um scanner não é a lentidão, mas sim o **registro silencioso de um código incorreto**. O laboratório deste showcase fornece uma metodologia empírica de auditoria:

1. **Fixação do Código de Controle:** O operador digita ou captura o código real da embalagem (ex: `7891000100103`), acionando a validação de checksum (Módulo-10).
2. **Auditoria Instantânea Frame-a-Frame:**
   * 🟢 **Match Perfeito:** O código lido confere integralmente com o controle.
   * 🔴 **Alucinação / Leitura Falsa:** Leituras concorrentes que capturam sequências parciais geradas por dobras disparam um efeito visual de **Glitch** e são computadas como erro no payload de auditoria.
3. **Exportação de Evidências:** Exportação em 1 clique em **CSV consolidado** (resumo executivo + log bruto de telemetria) ou matriz comparativa formatada em Markdown para apresentações de engenharia.

---

## 📊 Matriz Comparativa de Performance

Resultados consolidados em condições de estresse físico real (embalagens amassadas, cilíndricas e reflexivas):

| Motor de Leitura | Arquitetura | Throughput Real | Latência Média | Tolerância a Deformações | Taxa de Falsos Positivos |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 🟢 **OptiScan SDK** | **WASM + Heurística Proprietária de Sinal** | **60 FPS** | **~11 ms** | **Alta (Blindada)** | **< 0.1% (Imune)** |
| 🔵 **Google Barcode API** | Chromium Nativo / SO | ~30 FPS | ~65 ms | Média (Falha em dobras severas) | Moderada (~15%) |
| 🟠 **Vanilla ZXing-JS** | JS Puro (Dual-Axis) | 12-18 FPS | ~80 ms | Baixa (Sensível a reflexos) | Alta (~25%) |
| 🟠 **HTML5-QRCode** | Canvas + Fallbacks | 15 FPS | ~45 ms | Baixa | Alta (~30%) |
| 🔴 **Quagga2** | JS Canvas 1D | 10-15 FPS | ~55 ms | Crítica (Gargalo de CPU) | Crítica (> 40%) |

---

## 📁 Estrutura Modular & Arquitetura de Software

O frontend do showcase foi estruturado com padrão rigoroso de excelência (Clean Code, SOLID, Design Pattern Adapter/Strategy e ES Modules nativos sem bundlers pesados), permitindo inspeção direta de código:

```text
optiscan-sdk-showcase/
├── index.html                   # Shell SPA da aplicação de demonstração e benchmark
├── style.css                    # Obsidian glassmorphism e responsividade (M53 / Mobile-first)
├── docs/
│   └── ARCHITECTURE.md          # Especificação técnica aprofundada, contratos e paridade
├── js/                          # Arquitetura modular ES Modules (Frontend Enterprise)
│   ├── main.js                  # Entry point e orquestrador reativo da aplicação
│   ├── config/
│   │   └── constants.js         # Constantes de configuração, motores e condições
│   ├── core/
│   │   ├── audio.js             # Sintetizador Web Audio API puro (Bips com latência zero)
│   │   ├── camera.js            # Gerenciador resiliente de hardware (Anti-lock para Android/Samsung)
│   │   └── telemetry.js         # Monitor de FPS real e latência de processamento por frame
│   ├── engines/                 # Camada de Adaptadores (Strategy / Adapter Pattern)
│   │   ├── engine-adapter.js    # Contrato abstrato padronizado (BaseScannerAdapter)
│   │   ├── optiscan-adapter.js  # Adaptador do OptiScan WASM SDK
│   │   ├── google-adapter.js    # Adaptador da BarcodeDetector API nativa
│   │   ├── zxing-adapter.js     # Adaptador Vanilla ZXing-JS (com análise de duplo eixo)
│   │   ├── html5qr-adapter.js   # Adaptador HTML5-QRCode (com isolamento de hardware)
│   │   └── quagga-adapter.js    # Adaptador Quagga2
│   ├── benchmark/
│   │   ├── ground-truth.js      # Validador de código de controle, checksum e alucinações
│   │   ├── series-manager.js    # Gerenciador de baterias de 10 amostras e matriz agregada
│   │   └── exporter.js          # Exportador de evidências em CSV, Markdown e JSON
│   └── ui/
│       ├── trigger-controller.js# Controle de disparo único (single-shot), trava e atalhos
│       └── ui-controller.js     # Manipulação de DOM, toasts e renderização de tabelas
├── sdk/
│   ├── OptiScanScanner.wasm     # Binário WebAssembly otimizado (-O3, sem símbolos de debug)
│   ├── OptiScanScanner.js       # Emscripten glue loader
│   ├── optiscan-sdk.min.js      # Wrapper JS do SDK com domain-lock e proteção anti-tampering
│   └── optiscan-sdk.css         # Estilos isolados do componente do scanner
└── README.md                    # Documentação do projeto e benchmarks
```

Para uma análise minuciosa de cada classe e dos princípios de isolamento de teste:  
👉 **[Documentação de Arquitetura & Paridade de Motores (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)**

---

## 📱 Engenharia Mobile & Resiliência de Hardware (Samsung Galaxy M53)

Durante a engenharia do showcase, cenários extremos de uso em smartphones modernos com sensores de alta resolução (como a câmera de 108 MP do **Samsung Galaxy M53**, viewport `412 × 915px`) receberam tratamento especializado:

1. **Prevenção de Camera Driver Lock (`NotReadableError`):**
   No Android, abrir uma stream de câmera temporária para inspecionar capacidades e fechá-la milissegundos antes de chamar a stream de trabalho trava o driver nativo. O `CameraManager` unificou a aquisição em uma chamada única com restrições relaxadas (`facingMode: { ideal: 'environment' }`), blindando contra falhas de hardware.
2. **Gatilho Ergonômico de Disparo Único:**
   Botão de disparo com 52px de altura posicionado na zona natural de alcance do polegar (*thumb zone*), acionando 1 leitura e travando imediatamente para auditoria visual.
3. **ROI Verde Unificado:**
   Área de interesse (`#standard-viewfinder`) centralizada a 72% × 48% sobreposta de forma idêntica em todos os 5 motores, garantindo que nenhum algoritmo receba vantagens espaciais durante os testes.

---

## 🚀 Integração Rápida em 3 Passos

### 1. Inclua o CSS no `<head>`
```html
<link rel="stylesheet" href="sdk/optiscan-sdk.css">
```

### 2. Defina o contêiner no HTML
```html
<div id="scanner-container" style="width: 100%; max-width: 600px; height: 420px;"></div>
```

### 3. Inicialize o SDK
```html
<script src="sdk/OptiScanScanner.js"></script>
<script src="sdk/optiscan-sdk.min.js"></script>
<script>
    const leitor = new OptiScanSDK({
        containerId: 'scanner-container',
        wasmPath: 'sdk/OptiScanScanner.js',
        scanInterval: 250, // Throttling de fallback secundário
        cooldown: 250,     // Cooldown anti-duplicação
        vibrate: true,     // Feedback háptico no mobile
        onSuccess: (code) => {
            console.log("Código validado por Heurística Proprietária:", code);
            alert(`Lido com sucesso: ${code}`);
        },
        onError: (err) => {
            console.error("Erro no sensor:", err);
        }
    });

    leitor.start();
</script>
```

---

## 🛡️ Propriedade Intelectual & Licenciamento

Os binários compilados contidos na pasta `sdk/` (`OptiScanScanner.wasm` e `optiscan-sdk.min.js`) incorporam algoritmos proprietários protegidos e são distribuídos exclusivamente para fins de homologação técnica, avaliação de arquitetura e benchmarking dentro deste repositório de vitrine.

Para licenciamento comercial, integração em aplicações empresariais móveis/híbridas (React Native, Flutter, Capacitor, PWA) ou parcerias tecnológicas, entre em contato com o autor.
