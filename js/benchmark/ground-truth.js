/**
 * Ground Truth & Barcode Checksum Validator
 * Provides rigorous verification against expected barcode codes and calculates checksums.
 * (c) 2026 OptiScan Technologies
 */

export class GroundTruthValidator {
    constructor() {
        this.groundTruthCode = '';
    }

    setGroundTruth(code) {
        this.groundTruthCode = String(code || '').trim();
        return this.groundTruthCode;
    }

    clearGroundTruth() {
        this.groundTruthCode = '';
    }

    hasGroundTruth() {
        return Boolean(this.groundTruthCode);
    }

    getGroundTruth() {
        return this.groundTruthCode;
    }

    /**
     * Valida o código lido contra o Ground Truth e/ou algoritmo de checksum EAN/UPC
     * @param {string} code Código detectado pelo motor
     * @param {boolean} isOptiScanConsensus Se foi obtido via consenso temporal/espacial
     * @returns {{ isMatch: boolean, status: string }}
     */
    validate(code, isOptiScanConsensus = false) {
        const cleanCode = String(code || '').trim();

        if (this.hasGroundTruth()) {
            const isMatch = (cleanCode === this.groundTruthCode);
            return {
                isMatch: isMatch,
                status: isMatch ? 'MATCH' : 'FALSE_POSITIVE'
            };
        }

        // Sem controle definido: baseia-se na validação matemática de integridade
        const checksumValid = this.isValidChecksum(cleanCode);
        const isMatch = isOptiScanConsensus || checksumValid;

        return {
            isMatch: isMatch,
            status: isMatch ? 'MATCH' : 'FALSE_POSITIVE'
        };
    }

    /**
     * Algoritmo padrão de Checksum Modulo-10 para EAN-13, EAN-8 e UPC-A
     */
    isValidChecksum(code) {
        if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(code)) {
            return false;
        }

        const digits = code.split('').map(Number);
        const checkDigit = digits.pop();

        let sum = 0;
        for (let i = 0; i < digits.length; i++) {
            const digit = digits[digits.length - 1 - i];
            const weight = (i % 2 === 0) ? 3 : 1;
            sum += digit * weight;
        }

        const calculatedCheck = (10 - (sum % 10)) % 10;
        return calculatedCheck === checkDigit;
    }
}
