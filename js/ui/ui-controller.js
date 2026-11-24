/**
 * UI Controller
 * Manages DOM updates, glitch animations, toast feedback, and table rendering.
 * (c) 2026 OptiScan Technologies
 */

export class UIController {
    constructor(domElements) {
        this.el = domElements;
        this.isGlitchActive = false;
    }

    showPlaceholder() {
        if (this.el.placeholder) this.el.placeholder.style.display = 'flex';
    }

    hidePlaceholder() {
        if (this.el.placeholder) this.el.placeholder.style.display = 'none';
    }

    setViewfinderVisible(visible) {
        if (this.el.standardViewfinder) {
            this.el.standardViewfinder.style.display = visible ? 'flex' : 'none';
        }
    }

    updateEngineHeader(engineInfo) {
        if (this.el.activeEngineDesc) {
            this.el.activeEngineDesc.innerText = engineInfo.description;
        }
        if (this.el.telemetryPulse) {
            this.el.telemetryPulse.className = 'pulse-indicator active';
            if (engineInfo.id === 'optiscan') {
                this.el.telemetryPulse.classList.add('optiscan');
            }
        }
    }

    updateGroundTruthBadge(code) {
        if (!this.el.truthStatusBadge || !this.el.truthStatusText) return;
        if (code) {
            this.el.truthStatusBadge.classList.add('active');
            this.el.truthStatusText.innerText = `Controle Ativo: [ ${code} ]`;
        } else {
            this.el.truthStatusBadge.classList.remove('active');
            this.el.truthStatusText.innerText = 'Aguardando código de controle...';
        }
    }

    updateTelemetry(fps, latencyMs) {
        if (this.el.metricFps) {
            this.el.metricFps.innerHTML = `${fps} <span class="unit">FPS</span>`;
        }
        if (this.el.metricLatency) {
            this.el.metricLatency.innerHTML = `${latencyMs} <span class="unit">ms</span>`;
        }
    }

    updateBatteryProgress(currentCount, maxCount = 10) {
        if (this.el.testProgressCounter) {
            this.el.testProgressCounter.innerText = `${currentCount} / ${maxCount} leituras`;
        }
        if (this.el.progressFill) {
            const pct = Math.min((currentCount / maxCount) * 100, 100);
            this.el.progressFill.style.width = `${pct}%`;
        }
    }

    updateAccuracyUI(correct, falsePos, total, hasGroundTruth) {
        if (this.el.metricReadsRatio) {
            this.el.metricReadsRatio.innerHTML = `<span class="correct-count">${correct}</span> / <span class="false-count">${falsePos}</span>`;
        }
        if (this.el.metricTotalReads) {
            this.el.metricTotalReads.innerText = `${total} leituras neste motor`;
        }

        if (this.el.metricAccuracy && this.el.metricAccuracyDetail) {
            if (total > 0) {
                const pct = ((correct / total) * 100).toFixed(1);
                this.el.metricAccuracy.innerHTML = `${pct} <span class="unit">%</span>`;
                if (pct >= 95) {
                    this.el.metricAccuracy.style.color = 'var(--color-optiscan)';
                    this.el.metricAccuracyDetail.innerText = 'Assertividade Excelente';
                } else if (pct >= 70) {
                    this.el.metricAccuracy.style.color = 'var(--color-competitor)';
                    this.el.metricAccuracyDetail.innerText = 'Instável sob estresse';
                } else {
                    this.el.metricAccuracy.style.color = 'var(--color-error)';
                    this.el.metricAccuracyDetail.innerText = 'Taxa de ruído crítica';
                }
            } else {
                this.el.metricAccuracy.innerHTML = `-- <span class="unit">%</span>`;
                this.el.metricAccuracyDetail.innerText = hasGroundTruth ? 'Aguardando leituras...' : 'Defina o código de controle';
            }
        }
    }

    addLogItem(codeText, engineName, conditionLabel, statusText, badgeClass, itemClass, currentCount) {
        if (this.el.logEmptyMsg) this.el.logEmptyMsg.style.display = 'none';

        const li = document.createElement('li');
        li.className = `log-item ${itemClass}`;
        const timeStr = new Date().toLocaleTimeString('pt-BR');

        li.innerHTML = `
            <div class="log-item-left">
                <span class="log-code">${codeText}</span>
                <span class="log-meta">${timeStr} • ${engineName} • ${conditionLabel}</span>
            </div>
            <span class="log-badge ${badgeClass}">${statusText}</span>
        `;

        if (this.el.logList) {
            this.el.logList.insertBefore(li, this.el.logList.firstChild);
            while (this.el.logList.children.length > 11) {
                this.el.logList.removeChild(this.el.logList.lastChild);
            }
        }

        if (this.el.logCounter) {
            this.el.logCounter.innerText = `${currentCount} / 10 eventos`;
        }
    }

    clearLogItems() {
        if (this.el.logList && this.el.logEmptyMsg) {
            this.el.logList.innerHTML = '';
            this.el.logList.appendChild(this.el.logEmptyMsg);
            this.el.logEmptyMsg.style.display = 'flex';
        }
        if (this.el.logCounter) {
            this.el.logCounter.innerText = '0 / 10 eventos';
        }
    }

    triggerGlitch(subtext = '') {
        if (this.isGlitchActive || !this.el.glitchOverlay) return;
        this.isGlitchActive = true;
        if (subtext && this.el.glitchSubtext) {
            this.el.glitchSubtext.innerText = subtext;
        }
        this.el.glitchOverlay.classList.add('active');

        setTimeout(() => {
            this.el.glitchOverlay?.classList.remove('active');
            this.isGlitchActive = false;
        }, 450);
    }

    hideGlitch() {
        this.el.glitchOverlay?.classList.remove('active');
        this.isGlitchActive = false;
    }

    renderSavedSeriesTable(savedSeries, onRemoveSeries) {
        if (!this.el.benchmarkTableBody) return;

        if (this.el.savedSeriesCount) {
            this.el.savedSeriesCount.innerText = `${savedSeries.length} séries salvas`;
        }

        if (savedSeries.length === 0) {
            if (this.el.tableEmptyRow) this.el.tableEmptyRow.style.display = 'table-row';
            return;
        }

        if (this.el.tableEmptyRow) this.el.tableEmptyRow.style.display = 'none';
        this.el.benchmarkTableBody.innerHTML = '';

        savedSeries.forEach((s, idx) => {
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
            this.el.benchmarkTableBody.appendChild(tr);
        });

        this.el.benchmarkTableBody.querySelectorAll('.btn-delete-series').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (onRemoveSeries) onRemoveSeries(index);
            });
        });
    }

    showToast(message) {
        if (!this.el.toastNotification || !this.el.toastMessage) return;
        this.el.toastMessage.innerText = message;
        this.el.toastNotification.classList.add('show');

        setTimeout(() => {
            this.el.toastNotification?.classList.remove('show');
        }, 2800);
    }
}
