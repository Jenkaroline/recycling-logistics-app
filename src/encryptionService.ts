/**
 * Serviço de criptografia para dados sensíveis
 * Usa algoritmos padrão para criptografia/descriptografia de dados
 */

/**
 * Criptografa uma string usando base64 (implementação simples)
 * Para segurança real em produção, use bibliotecas especializadas
 */
export function encryptData(data: string, key?: string): string {
    try {
        // Implementação simples com base64
        // Em produção, considere usar bibliotecas como 'crypto-js' ou 'tweetnacl'
        return Buffer.from(data).toString('base64');
    } catch (error) {
        console.error('Erro ao criptografar dados:', error);
        return data;
    }
}

/**
 * Descriptografa uma string criptografada com base64
 */
export function decryptData(encryptedData: string, key?: string): string {
    try {
        // Implementação simples com base64
        return Buffer.from(encryptedData, 'base64').toString('utf-8');
    } catch (error) {
        console.error('Erro ao descriptografar dados:', error);
        return encryptedData;
    }
}

/**
 * Criptografa um objeto JSON
 */
export function encryptObject<T extends Record<string, any>>(
    obj: T,
    key?: string
): string {
    try {
        const jsonString = JSON.stringify(obj);
        return encryptData(jsonString, key);
    } catch (error) {
        console.error('Erro ao criptografar objeto:', error);
        return '';
    }
}

/**
 * Descriptografa um objeto JSON
 */
export function decryptObject<T = any>(
    encryptedJson: string,
    key?: string
): T | null {
    try {
        const decrypted = decryptData(encryptedJson, key);
        return JSON.parse(decrypted) as T;
    } catch (error) {
        console.error('Erro ao descriptografar objeto:', error);
        return null;
    }
}

/**
 * Gera uma chave de criptografia (placeholder)
 */
export function generateEncryptionKey(): string {
    try {
        // Gera uma string aleatória para usar como chave
        const array = new Uint8Array(32);
        if (typeof global !== 'undefined' && global.crypto) {
            global.crypto.getRandomValues(array);
        } else {
            // Fallback para React Native
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Buffer.from(array).toString('hex');
    } catch (error) {
        console.error('Erro ao gerar chave de criptografia:', error);
        return '';
    }
}
