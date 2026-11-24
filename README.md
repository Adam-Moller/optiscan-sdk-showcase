# OptiScan Barcode Engine — WebAssembly SDK Showcase

<p align="center">
  <img src="https://img.shields.io/badge/WebAssembly-Compiled-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" alt="WebAssembly" />
  <img src="https://img.shields.io/badge/C%2B%2B%20Core-ZXing%20Optimized-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++ Core" />
  <img src="https://img.shields.io/badge/Frame%20Rate-60%20FPS-00FF88?style=for-the-badge" alt="60 FPS" />
  <img src="https://img.shields.io/badge/Environment-Retail%20%26%20Industrial-00F0FF?style=for-the-badge" alt="Retail & Industrial" />
</p>

---

## ⚡ Visão Geral

O **OptiScan Barcode Engine** é um motor de leitura de códigos de barras de altíssima performance para a Web, compilado diretamente de C++ para **WebAssembly (WASM)**.

Diferente de soluções convencionais baseadas em JavaScript puro ou APIs nativas de leitura de frame estático, o OptiScan foi especificamente desenvolvido para superar os maiores gargalos do varejo físico, logística e self-checkout:
* 🥫 **Superfícies Cilíndricas e Curvas:** Latas, garrafas e tubos onde o código sofre distorção geométrica.
* ⚡ **Embalagens Amassadas e Dobradas:** Sachês, pacotes plásticos e caixas deformadas onde partes das barras ficam obstruídas.
* 💡 **Reflexo Especular e Plástico Brilhante:** Superfícies reflexivas sob iluminação direta de lojas.

---

## 🌐 Demonstração Interativa ao Vivo

Experimente o leitor diretamente pelo seu navegador no computador ou celular:

👉 **[Acessar Live Showcase & Benchmark](https://adam-moller.github.io/optiscan-sdk-showcase/)**

*(Para testar no celular, utilize o navegador Chrome ou Safari e conceda permissão de câmera).*

---

## 🎯 Laboratório de Contraprova (Ground Truth & Alucinações)

No ambiente de varejo, a pior falha que um scanner pode cometer não é demorar para ler, mas sim **registrar um código errado (leitura falsa / alucinação)** gerado por dobras ou reflexos da embalagem.

A aplicação deste showcase conta com um **Sistema de Auditoria por Ground Truth**:
1. **Fixação do Código de Controle:** Você aponta a câmera ou digita o código real da embalagem (ex: `7891000100103`).
2. **Contraprova Instantânea:**
   - 🟢 **Match Perfeito:** O código lido confere com o controle.
   - 🔴 **Alucinação / Leitura Falsa:** Leituras concorrentes que capturam sequências truncadas disparam um efeito visual de **Glitch** e são computadas como erro.
3. **Exportação de Evidências:** Botões integrados na interface permitem exportar a sessão completa em **CSV** ou copiar a tabela comparativa pronta para documentação.

---

## 📊 Matriz Comparativa de Performance

Resultados consolidados em condições de estresse físico (embalagens amassadas, curvas e com reflexo):

| Motor de Leitura | Tecnologia | Throughput | Tolerância a Dobras / Curvatura | Taxa de Alucinação (Falsos Positivos) |
| :--- | :---: | :---: | :---: | :---: |
| 🟢 **OptiScan SDK** | **WASM + Heurística Proprietária de Validação** | **60 FPS** | **Alta (Heurística Dinâmica)** | **< 0.1% (Blindado)** |
| 🔵 **Google Barcode API** | Chromium Nativo | ~30 FPS | Média (Falha em dobras severas) | Moderada (Leituras truncadas) |
| 🟠 **Vanilla ZXing-JS** | JS Puro | 12-18 FPS | Baixa (Sensível a reflexo) | Alta sob movimentação |
| 🟠 **HTML5-QRCode** | Canvas + ZXing | 15 FPS | Baixa | Alta |
| 🔴 **Quagga2** | JS Canvas 1D | 10-15 FPS | Crítica (Gargalo de CPU) | Crítica (Ruídos frequentes) |

---

## 🚀 Integração Rápida em 3 Passos

### 1. Inclua a folha de estilos no `<head>`
```html
<link rel="stylesheet" href="sdk/optiscan-sdk.css">
```

### 2. Adicione o contêiner no HTML
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
        scanInterval: 250, // Throttling do fallback secundário
        cooldown: 2000,    // Cooldown anti-duplicação
        vibrate: true,     // Feedback tátil no mobile
        onSuccess: (code) => {
            console.log("Código validado por Heurística Proprietária", code);
            alert(`Lido com sucesso: ${code}`);
        },
        onStateChange: (state) => {
            console.log("Estado do motor:", state);
        }
    });
</script>
```

---

## 📁 Estrutura Modular & Arquitetura de Software

O frontend do showcase foi projetado com rigor de engenharia de software (Clean Code, SOLID, Design Pattern Adapter/Strategy e ES Modules nativos), servindo como vitrine técnica para recrutadores e avaliadores de código:

```text
optiscan-sdk-showcase/
├── index.html                   # Aplicação SPA do Showcase & Laboratório
├── style.css                    # Obsidian glassmorphism e responsividade (M53 / Mobile-first)
├── docs/
│   └── ARCHITECTURE.md          # Especificação da arquitetura, Adapter Pattern e Test Parity
├── js/                          # Arquitetura modular ES Modules
│   ├── main.js                  # Entry point da aplicação
│   ├── config/
│   │   └── constants.js         # Configurações de motores, condições de teste e constantes
│   ├── core/
│   │   ├── audio.js             # Sintetizador Web Audio API para feedbacks sonoros (zero dependências)
│   │   ├── camera.js            # Gerenciador resiliente de hardware de câmera (anti-lock Android)
│   │   └── telemetry.js         # Monitor de telemetria (FPS e latência em tempo real)
│   ├── engines/                 # Strategy / Adapter Pattern para paridade de testes
│   │   ├── engine-adapter.js    # Classe base abstrata com contrato padronizado
│   │   ├── optiscan-adapter.js  # Adaptador do OptiScan WASM SDK
│   │   ├── google-adapter.js    # Adaptador do Google BarcodeDetector API
│   │   ├── zxing-adapter.js     # Adaptador do Vanilla ZXing-JS
│   │   ├── html5qr-adapter.js   # Adaptador do HTML5-QRCode
│   │   └── quagga-adapter.js    # Adaptador do Quagga2
│   ├── benchmark/
│   │   ├── ground-truth.js      # Validação de código de controle e Modulo-10
│   │   ├── series-manager.js    # Gerenciador de bateria de 10 amostras e matriz de testes
│   │   └── exporter.js          # Exportador de payloads (CSV, Markdown e JSON)
│   └── ui/
│       ├── trigger-controller.js# Controle de disparo único (single-shot trigger) e atalhos
│       └── ui-controller.js     # Manipulação de DOM, toasts e renderização de tabelas
├── sdk/
│   ├── OptiScanScanner.wasm     # Binário WebAssembly otimizado (-O3, sem símbolos de debug)
│   ├── OptiScanScanner.js       # Emscripten glue loader
│   ├── optiscan-sdk.min.js      # Wrapper JS do SDK com domain-lock e anti-tampering
│   └── optiscan-sdk.css         # Estilos isolados do componente do scanner
└── README.md                    # Apresentação do projeto e benchmarks
```

Consulte a documentação técnica aprofundada:  
👉 **[Documentação de Arquitetura & Paridade de Motores (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)**

---

## 📱 Otimização Mobile & Calibração Samsung Galaxy M53

A interface do laboratório foi desenhada com abordagem **mobile-first** e refinada para dispositivos com proporção alongada como o **Samsung Galaxy M53 (412 × 915px)**:
* **Gatilho de Disparo Ergonômico:** Botão de ativação single-shot com altura de toque de 52px na zona natural do polegar, impedindo disparo de eventos em loop.
* **Layout Compacto de Controle:** Botões de ação do Ground Truth (`Salvar Padrão`, `Último Lido`, `Limpar`) dispostos em grid uniforme.
* **Viewport Adaptativo do Scanner:** Altura calibrada a 320px para manter controles e tabela de logs visíveis sem rolagem excessiva.
* **Gerenciamento Resiliente de Câmera:** Eliminação de chamadas concorrentes a `getUserMedia()`, prevenindo o bloqueio do driver de câmera nativo do Android.

---

## 🛡️ Propriedade Intelectual & Licenciamento

Os binários compilados contidos na pasta `sdk/` são distribuídos exclusivamente para fins de demonstração, validação técnica e homologação do **OptiScan Barcode Engine**. 

Para licenciamento comercial, integração em aplicativos móveis híbridos (React Native, Flutter, Capacitor/PWA) ou parcerias, entre em contato com o autor.
