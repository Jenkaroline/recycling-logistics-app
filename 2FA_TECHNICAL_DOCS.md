# 🔒 Documentação Técnica - Implementação de 2FA com Firebase MultiFactorUser

## 📐 Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                    APP LAYER (React Native)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  login.tsx   │  │ verify2FA.tsx│  │  enrollPhone.tsx  │ │
│  │              │  │              │  │                   │ │
│  │ Captura      │  │ Insere código│  │ Configura 2FA     │ │
│  │ e-mail+pass  │  │ SMS de 6 digs│  │ durante registro  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬─────────┘ │
│         │                 │                     │           │
└─────────┼─────────────────┼─────────────────────┼───────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              SERVICE LAYER (TypeScript)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│         TwoFactorAuthService.ts                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • sendPhoneEnrollmentCode(phoneNumber)              │   │
│  │ • enrollPhoneNumber(smsCode)                        │   │
│  │ • sendPhoneLoginCode(phoneNumber)                   │   │
│  │ • resolveMultiFactorChallenge(smsCode, resolver)    │   │
│  │ • has2FAEnrolled()                                  │   │
│  │ • unenrollPhoneNumber(factorUid)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│           FIREBASE AUTH LAYER (Cloud)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ PhoneAuthProvider                                  │    │
│  │ • verifyPhoneNumber() → verificationId             │    │
│  │ • credential(verificationId, code) → credential    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ MultiFactorUser                                    │    │
│  │ • enroll(assertion, name)  [Enrollment]            │    │
│  │ • unenroll(factorUid)      [Remover 2FA]           │    │
│  │ • enrolledFactors          [Listar fatores]        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ PhoneMultiFactorGenerator                          │    │
│  │ • assertion(credential) → MultiFactorAssertion     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ MultiFactorError (Desafio)                         │    │
│  │ • resolver.hints    [Listar métodos 2FA]           │    │
│  │ • resolver.resolveSignIn(assertion)                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo Detalhado de Autenticação

### **1️⃣ Fluxo de Enrollment (Configurar 2FA)**

```typescript
// Etapa 1: Usuário preenche formulário
const phoneNumber = "+55 11 99999-9999";

// Etapa 2: Enviar código
sendPhoneEnrollmentCode(phoneNumber) {
  → PhoneAuthProvider.verifyPhoneNumber(phoneNumber, recaptchaVerifier)
  → Retorna: verificationId (string UUID)
  → SMS enviado para o número
}

// Etapa 3: Usuário recebe SMS e digita código
const smsCode = "123456";

// Etapa 4: Confirmar e registrar como fator 2FA
enrollPhoneNumber(smsCode) {
  → PhoneAuthProvider.credential(verificationId, smsCode)
  → PhoneMultiFactorGenerator.assertion(credential)
  → multiFactor(user).enroll(assertion, "Telefone Registrado")
  → Usuário agora tem 2FA ativado
}
```

**Diagrama de sequência:**
```
User                App              Firebase
│                    │                   │
│ Preenche número    │                   │
├──────────────────→ │                   │
│                    │ sendPhoneEnrollmentCode()
│                    ├──────────────────→│
│                    │← verificationId   │
│                    │                   │ [Envia SMS]
│ Recebe SMS         │                   │
│ Digita código      │                   │
├──────────────────→ │                   │
│                    │ enrollPhoneNumber(code)
│                    ├──────────────────→│
│                    │ PhoneAuthProvider.credential()
│                    │← credential       │
│                    │ PhoneMultiFactorGenerator.assertion()
│                    │← assertion        │
│                    │ multiFactor().enroll(assertion)
│                    │← success          │
│ ✅ 2FA Ativado    │                   │
```

---

### **2️⃣ Fluxo de Login com MultiFactorError**

```typescript
// Etapa 1: Usuário faz login normal
const email = "user@example.com";
const password = "senha123";

// Etapa 2: Tentar autenticação básica
signInWithEmailAndPassword(auth, email, password) {
  try {
    → Sucesso (sem 2FA)
    → Navegar para Main
  } catch (error) {
    if (error instanceof MultiFactorError) {
      // 2FA é obrigatório
      → resolver = error.resolver
      → hints = resolver.hints (array de métodos 2FA disponíveis)
      → Extrair primeiro hint (PhoneMultiFactorSignInAssertion)
      → phoneNumber = hint.phoneNumber
    }
  }
}

// Etapa 3: Enviar código SMS para o número registrado
sendPhoneLoginCode(phoneNumber) {
  → PhoneAuthProvider.verifyPhoneNumber(phoneNumber, recaptchaVerifier)
  → Retorna: verificationId
  → SMS enviado
  → Navegar para Verify2FA screen
}

// Etapa 4: Usuário digita código recebido
const smsCode = "123456";

// Etapa 5: Resolver desafio MultiFactor
resolveMultiFactorChallenge(smsCode, resolver) {
  → PhoneAuthProvider.credential(verificationId, smsCode)
  → PhoneMultiFactorGenerator.assertion(credential)
  → resolver.resolveSignIn(assertion)
  → Retorna: UserCredential (usuário logado!)
}
```

**Diagrama de sequência:**
```
User                App              Firebase
│                    │                   │
│ Digite e-mail+pass │                   │
├──────────────────→ │                   │
│                    │ signInWithEmailAndPassword()
│                    ├──────────────────→│
│                    │ ← MultiFactorError│
│                    │   (resolver, hints)
│                    │                   │
│ [Redirecionado     │                   │
│  para Verify2FA]   │                   │
│                    │ sendPhoneLoginCode()
│                    ├──────────────────→│
│                    │← verificationId   │
│                    │                   │ [Envia SMS]
│ Recebe SMS         │                   │
│ Digita código      │                   │
├──────────────────→ │                   │
│                    │ resolveMultiFactorChallenge()
│                    │ [credential + resolver]
│                    ├──────────────────→│
│                    │← UserCredential   │
│                    │ (usuário autenticado!)
│ ✅ Login Sucesso  │                   │
```

---

## 🔑 Conceitos-Chave do Firebase MultiFactor

### **1. PhoneAuthProvider**
Responsável por enviar e validar códigos SMS.

```typescript
const phoneProvider = new PhoneAuthProvider(auth);

// Enviar código
const verifyId = await phoneProvider.verifyPhoneNumber(
  "+55 11 99999-9999",
  recaptchaVerifier
);

// Criar credencial após usuário digitar código
const credential = PhoneAuthProvider.credential(verifyId, "123456");
```

### **2. MultiFactorUser**
API para gerenciar fatores de autenticação do usuário.

```typescript
const mfUser = multiFactor(auth.currentUser);

// Listar fatores já registrados
const factors = mfUser.enrolledFactors;
// [{
//   uid: "unique-id",
//   displayName: "Telefone Registrado",
//   factorId: "phone",
//   enrollmentTime: timestamp
// }]

// Registrar novo fator (depois de ter credencial)
await mfUser.enroll(assertion, "Meu Telefone");

// Remover fator existente
await mfUser.unenroll(factor.uid);
```

### **3. PhoneMultiFactorGenerator**
Converte credencial de telefone em assertion para MultiFactor.

```typescript
const assertion = await PhoneMultiFactorGenerator.assertion(credential);
// assertion é usado para:
// - Enrollment: mfUser.enroll(assertion, displayName)
// - Login: resolver.resolveSignIn(assertion)
```

### **4. MultiFactorError**
Erro especial lançado quando login precisa de 2FA.

```typescript
catch (error) {
  if (error instanceof MultiFactorError) {
    // error.resolver - usado para resolver o desafio
    // error.resolver.hints - lista de métodos 2FA disponíveis
    // error.resolver.resolveSignIn(assertion) - completa o login
    
    const hints = error.resolver.hints;
    hints.forEach(hint => {
      console.log(hint.factorId);        // "phone"
      console.log(hint.displayName);     // "Telefone Registrado"
      console.log(hint.phoneNumber);     // "+55 11 9****9999"
    });
  }
}
```

---

## 📦 Estrutura de Dados no Firebase

### **1. User Document (Firestore - Opcional)**

```typescript
// collection: users
// document: {uid}
{
  uid: "user123",
  email: "user@example.com",
  username: "johndoe",
  createdAt: Timestamp,
  
  // Opcional: rastrear 2FA
  has2FA: true,
  has2FAEnabledAt: Timestamp,
}
```

### **2. Firebase Auth (Automático)**

O Firebase Auth armazena automaticamente:
```
User {
  uid: "user123",
  email: "user@example.com",
  emailVerified: true,
  multiFactor: {
    enrolledFactors: [
      {
        uid: "factor123",
        factorId: "phone",
        displayName: "Telefone Registrado",
        enrollmentTime: 1680000000000,
        phoneNumber: "+5511999999999"
      }
    ]
  }
}
```

---

## 🔐 Fluxo de Segurança

### **1. During Enrollment (Sign-up)**
```
User signup → Email verification → 2FA enrollment → Acesso ao app
             (obrigatório)         (opcional, pode pular)
```

### **2. During Login**
```
Email + Password → Email verified? → Has 2FA? → Send SMS → Verify Code → Access
                        ↓              ↓
                    Se não → Erro      Se não → Login direto
                        ↓
                    VerifyEmail
                    screen
```

### **3. Validações de Segurança**

- ✅ **Código SMS expira**: 15 minutos (Firebase padrão)
- ✅ **Tentativas limitadas**: 5 tentativas por sessão
- ✅ **reCAPTCHA integrado**: Previne bots no enrollment
- ✅ **Rate limiting**: Firebase gerencia

---

## 🛠️ Tratamento de Erros

| Erro | Código Firebase | Solução |
|------|-----------------|----------|
| Número inválido | `auth/invalid-phone-number` | Validar formato |
| Código expirado | `auth/code-expired` | Reenviar código |
| Código inválido | `auth/invalid-verification-code` | Tentar novamente |
| SMS não enviado | Network error | Verificar conexão |
| Muitas tentativas | `auth/too-many-requests` | Aguardar 30 min |
| User não encontrado | `auth/user-not-found` | Verificar credenciais |

---

## 📊 Comparação: Enrollment vs Login

| Aspecto | Enrollment | Login |
|--------|-----------|-------|
| **Quando** | Após registration | Na autenticação |
| **Quem** | Novo usuário | Usuário retornando |
| **Fluxo** | sendPhoneEnrollmentCode → enrollPhoneNumber | sendPhoneLoginCode → resolveMultiFactorChallenge |
| **Firebase API** | mfUser.enroll() | resolver.resolveSignIn() |
| **Contexto** | Usuario já authenticated | usuario não autenticado |
| **Objetivo** | Registrar novo fator | Resolver desafio |

---

## 🔄 Ciclo de Vida do MultiFactorUser

```
┌─────────────────────────────────────────────────┐
│ 1. Usuário sem 2FA                              │
│    enrolledFactors.length = 0                   │
└─────────────┬───────────────────────────────────┘
              │
              │ sendPhoneEnrollmentCode()
              │ enrollPhoneNumber(code)
              ▼
┌─────────────────────────────────────────────────┐
│ 2. Usuário com 2FA ativado                      │
│    enrolledFactors.length = 1                   │
│    enrolledFactors[0].factorId = "phone"        │
└─────────────┬───────────────────────────────────┘
              │
              │ [Login] → MultiFactorError
              │ sendPhoneLoginCode()
              │ resolveMultiFactorChallenge()
              ▼
┌─────────────────────────────────────────────────┐
│ 3. Usuário autenticado com 2FA                  │
│    Acesso ao app com segurança                  │
└─────────────┬───────────────────────────────────┘
              │
              │ unenrollPhoneNumber(factorUid)
              ▼
┌─────────────────────────────────────────────────┐
│ 4. Usuário desativou 2FA                        │
│    enrolledFactors.length = 0                   │
│    Volta ao fluxo de login normal               │
└─────────────────────────────────────────────────┘
```

---

## 📝 Logs e Debugging

### **1. Verificar 2FA Status**
```typescript
import { has2FAEnrolled } from "./src/TwoFactorAuthService";

const check = async () => {
  const enrolled = await has2FAEnrolled();
  console.log("2FA Enrolled:", enrolled);
};
```

### **2. Ver Detalhes dos Fatores**
```typescript
import { getEnrolledFactors } from "./src/TwoFactorAuthService";

const checkFactors = async () => {
  const factors = await getEnrolledFactors();
  factors.forEach(factor => {
    console.log("Factor UID:", factor.uid);
    console.log("Display Name:", factor.displayName);
    console.log("Enrolled At:", factor.enrollmentTime);
  });
};
```

### **3. Monitorar MultiFactorError**
```typescript
catch (error: any) {
  if (error instanceof MultiFactorError) {
    console.log("MultiFactorError Detected!");
    console.log("Hints:", error.resolver.hints);
    console.log("Resolver:", error.resolver);
  }
}
```

---

## ✨ Conclusão

A implementação usa os **recursos nativos do Firebase** para 2FA:
- ✅ **Sem biblioteca externa** (apenas firebase/auth)
- ✅ **Seguro por padrão** (reCAPTCHA integrado)
- ✅ **Gerenciado pelo Firebase** (sem backend necessário)
- ✅ **Escalável** (suporta múltiplos fatores futuros)

**Próximas melhorias:**
- 🔄 Implementar Resend SMS (rate limiting)
- 🔐 Adicionar Backup Codes
- 🔔 TOTP alternative (Google Authenticator)
- 📊 Analytics e logging
