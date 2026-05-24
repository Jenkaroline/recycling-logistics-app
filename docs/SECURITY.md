# Guia de Segurança e Criptografia

## 📋 Visão Geral

Este projeto implementa criptografia para proteger dados sensíveis, especialmente as credenciais do Firebase.

## 🔐 Como Funciona

### 1. Variáveis de Ambiente (Primeira Camada)
- As credenciais do Firebase são armazenadas em `.env.local`
- Nunca são commitadas no repositório
- Usam o prefixo `EXPO_PUBLIC_` para Expo reconhecer

### 2. Criptografia AES-256-CBC (Segunda Camada Opcional)
- Implementada em `src/encryptionService.ts`
- Usa chave de 256 bits derivada com `scrypt`
- IV (Initialization Vector) aleatório para cada criptografia
- Algoritmo padrão da indústria

## 🚀 Como Usar

### Setup Inicial

1. **Gerar chave de criptografia segura:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Copiar arquivo de exemplo:**
```bash
cp .env.example .env.local
```

3. **Preencher com suas credenciais do Firebase:**
```
EXPO_PUBLIC_FIREBASE_API_KEY=sua_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_domain
# ... outras variáveis
ENCRYPTION_KEY=sua_chave_gerada_acima
```

### Usar o Serviço de Criptografia

```typescript
import { encryptValue, decryptValue } from '@/src/encryptionService';

// Criptografar
const sensitive = "dados-sensiveis";
const encrypted = encryptValue(sensitive);
console.log(encrypted); // output: "iv:encrypted"

// Descriptografar
const decrypted = decryptValue(encrypted);
console.log(decrypted); // output: "dados-sensiveis"
```

## ✅ Boas Práticas

1. **Nunca commitar `.env.local`**
   - Adicione ao `.gitignore` (já está configurado)

2. **Usar chaves diferentes por ambiente**
   - `.env.local` - desenvolvimento
   - `.env.production` - produção (sincronizar via variáveis do servidor)

3. **Rotar chaves periodicamente**
   - Atualize `ENCRYPTION_KEY` em intervalos regulares
   - Recriptografe dados se necessário

4. **Validação em tempo de execução**
   - `firebaseConfig.js` valida se todas as variáveis foram carregadas

5. **Logs seguros**
   - Nunca faça log de valores descriptografados
   - Use `console.error()` para alertas de segurança

## 🛡️ Segurança em Produção

Para produção Expo/React Native:

1. **Use Expo Secrets:**
   ```bash
   eas secret create
   ```

2. **Configure no eas.json:**
   ```json
   {
     "build": {
       "production": {
         "env": ["ENCRYPTION_KEY"]
       }
     }
   }
   ```

3. **Firebase Security Rules:**
   - Configure rules estritas no Firestore
   - Implemente autenticação robusta

## 📱 Para React Native/Expo

Se precisar armazenar dados sensíveis localmente:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptValue, decryptValue } from '@/src/encryptionService';

// Salvar criptografado
const encrypted = encryptValue(sensitiveData);
await AsyncStorage.setItem('sensitive_key', encrypted);

// Recuperar descriptografado
const encrypted = await AsyncStorage.getItem('sensitive_key');
const decrypted = decryptValue(encrypted);
```

## 🔍 Verificação de Segurança

- [x] Credenciais em variáveis de ambiente
- [x] Criptografia AES-256-CBC implementada
- [x] IV aleatório para cada operação
- [x] Validação de variáveis obrigatórias
- [x] Arquivo `.gitignore` protege `.env.local`
- [ ] Implementar Expo Secrets para produção
- [ ] Configurar Firebase Security Rules

## 📚 Referências

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
