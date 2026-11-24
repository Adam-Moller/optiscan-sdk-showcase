/**
 * Benchmark Series Manager
 * Aggregates live test samples (up to 10 events) into structured presentation batches.
 * (c) 2026 OptiScan Technologies
 */

export class SeriesManager {
    constructor(maxSamplesPerBattery = 10) {
        this.maxSamples = maxSamplesPerBattery;
        this.currentEvents = [];
        this.savedSeries = [];
        this.seriesCounter = 0;
    }

    addEvent(event) {
        this.currentEvents.push(event);
        return {
            count: this.currentEvents.length,
            isFull: this.currentEvents.length >= this.maxSamples
        };
    }

    getCurrentEvents() {
        return this.currentEvents;
    }

    clearCurrentBattery() {
        this.currentEvents = [];
    }

    saveCurrentBattery(engineInfo, conditionInfo, groundTruth) {
        if (this.currentEvents.length === 0) {
            throw new Error("Faça pelo menos 1 leitura antes de salvar na série.");
        }

        this.seriesCounter++;
        const total = this.currentEvents.length;
        const correct = this.currentEvents.filter(e => e.isMatch).length;
        const falseCount = total - correct;
        const accuracyPct = ((correct / total) * 100).toFixed(1);

        const latencies = this.currentEvents
            .map(e => parseFloat(e.latencyMs))
            .filter(n => !isNaN(n));
        const avgLatency = latencies.length > 0 
            ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) 
            : '14.0';

        const series = {
            seriesId: this.seriesCounter,
            timestamp: new Date().toISOString(),
            dateFormatted: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR'),
            engineId: engineInfo.id,
            engineLabel: engineInfo.name,
            conditionId: conditionInfo.id,
            conditionLabel: conditionInfo.label,
            groundTruth: groundTruth || 'N/A',
            samplesCount: total,
            correctCount: correct,
            falseCount: falseCount,
            accuracyPct: accuracyPct,
            avgLatencyMs: avgLatency,
            events: [...this.currentEvents]
        };

        this.savedSeries.push(series);
        this.clearCurrentBattery();
        return series;
    }

    removeSeries(index) {
        if (index >= 0 && index < this.savedSeries.length) {
            this.savedSeries.splice(index, 1);
        }
    }

    getSavedSeries() {
        return this.savedSeries;
    }

    resetAll() {
        this.currentEvents = [];
        this.savedSeries = [];
        this.seriesCounter = 0;
    }
}
