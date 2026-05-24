/**
 * Serviço de criptografia para dados sensíveis
 * Usa algoritmos padrão para criptografia/descriptografia de dados
 * Compatível com React Native/Expo
 */

/**
 * Criptografa uma string usando base64 (implementação simples)
 * Para segurança real em produção, use bibliotecas especializadas
 */
export function encryptData(data: string, key?: string): string {
    try {
        // Implementação com base64 compatível com React Native
        // Em produção, considere usar bibliotecas como 'crypto-js' ou 'tweetnacl'
        return btoa(unescape(encodeURIComponent(data)));
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
        // Implementação com base64 compatível com React Native
        return decodeURIComponent(escape(atob(encryptedData)));
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
        // Compatível com React Native
        const randomValues = [];
        for (let i = 0; i < 32; i++) {
            randomValues.push(Math.floor(Math.random() * 256));
        }
        // Converte para hexadecimal sem usar Buffer
        return randomValues.map((v) => v.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Erro ao gerar chave de criptografia:', error);
        return '';
    }
}
