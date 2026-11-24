/**
 * Benchmark Report Exporter
 * Generates consolidated CSVs, presentation Markdown tables, and structured JSON files.
 * (c) 2026 OptiScan Technologies
 */

export class BenchmarkExporter {
    static exportCSV(savedSeries, currentEvents = []) {
        if (savedSeries.length === 0 && currentEvents.length === 0) {
            throw new Error("Nenhum dado registrado para exportar.");
        }

        let csv = "\uFEFF"; // UTF-8 BOM for Excel compatibility

        // SEÇÃO 1: MATRIZ CONSOLIDADA DE BENCHMARK (RESUMO EXECUTIVO)
        csv += "=== MATRIZ CONSOLIDADA DE BENCHMARK (RESUMO EXECUTIVO) ===\n";
        csv += "Serie_ID,Motor_Leitura,Condicao_Embalagem,Codigo_Controle,Amostras_Totais,Leituras_Corretas,Alucinacoes_Falsas,Assertividade_Pct,Latencia_Media_ms\n";

        savedSeries.forEach(s => {
            csv += `"${s.seriesId}","${s.engineLabel}","${s.conditionLabel}","${s.groundTruth}","${s.samplesCount}","${s.correctCount}","${s.falseCount}","${s.accuracyPct}%","${s.avgLatencyMs}"\n`;
        });

        // SEÇÃO 2: LOG DETALHADO DE DISPAROS INDIVIDUAIS
        csv += "\n\n=== LOG DETALHADO DE DISPAROS INDIVIDUAIS (PAYLOAD DE AUDITORIA) ===\n";
        csv += "Serie_ID,Timestamp,Motor,Condicao,Codigo_Esperado,Codigo_Detectado,Status,Latencia_ms\n";

        savedSeries.forEach(s => {
            s.events.forEach(ev => {
                csv += `"${s.seriesId}","${ev.timestamp}","${ev.engine}","${ev.condition}","${ev.groundTruth}","${ev.detectedCode}","${ev.status}","${ev.latencyMs}"\n`;
            });
        });

        if (currentEvents.length > 0) {
            currentEvents.forEach(ev => {
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
        URL.revokeObjectURL(url);
    }

    static generateMarkdownTable(savedSeries) {
        if (savedSeries.length === 0) {
            throw new Error("Salve pelo menos 1 série para gerar a tabela Markdown.");
        }

        let md = `### 📊 Matriz Consolidada de Benchmark de Leitura de Códigos\n\n`;
        md += `| Série | Motor de Leitura | Condição da Embalagem | Amostras | Corretas | Alucinações (Ruído) | Assertividade (%) | Latência Média |\n`;
        md += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;

        savedSeries.forEach(s => {
            md += `| #${s.seriesId} | **${s.engineLabel}** | ${s.conditionLabel} | ${s.samplesCount} | ${s.correctCount} | ${s.falseCount} | **${s.accuracyPct}%** | ${s.avgLatencyMs} ms |\n`;
        });

        md += `\n*Relatório gerado via OptiScan Telemetry Lab em ${new Date().toLocaleDateString('pt-BR')}.*\n`;
        return md;
    }

    static exportJSON(savedSeries, currentEvents = []) {
        const payload = {
            exportDate: new Date().toISOString(),
            totalSeriesCount: savedSeries.length,
            consolidatedSeries: savedSeries,
            uncommittedBattery: currentEvents
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `optiscan_benchmark_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
