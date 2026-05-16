type FirebaseLikeError = {
  code?: string;
  message?: string;
  [key: string]: any;
};

export function translateFirebaseError(error: FirebaseLikeError | any): string {
  if (!error) return "Ocorreu um erro. Tente novamente mais tarde.";

  const code = error?.code?.toString?.() || "";
  const message = (error?.message || "").toString();

  const map: Record<string, string> = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "Credenciais inválidas.",
    "auth/invalid-custom-token": "Token inválido.",
    "auth/invalid-user-token": "Sessão inválida. Faça login novamente.",
    "auth/user-token-expired": "Sessão expirada. Faça login novamente.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/weak-password": "Senha muito fraca. Escolha uma senha mais segura.",
    "auth/requires-recent-login": "Re-autentique-se e tente novamente para realizar esta ação.",
    "auth/network-request-failed": "Erro de rede. Verifique sua conexão e tente novamente.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/popup-closed-by-user": "A ação foi cancelada pelo usuário.",
    "auth/cancelled-popup-request": "Ação cancelada.",
  };

  if (code && map[code]) return map[code];

  // Some Firebase errors arrive without a `code` field and include the code
  // inside the message text (e.g. "Firebase: Error (auth/wrong-password).").
  // Extract such codes and map them to friendly messages.
  const codeFromMessageMatch = message.match(/\b(auth\/[a-z0-9-]+)\b/i);
  const codeFromMessage = codeFromMessageMatch ? codeFromMessageMatch[1].toLowerCase() : "";
  if (codeFromMessage && map[codeFromMessage]) return map[codeFromMessage];

  // Heurísticas simples para mensagens em inglês
  if (/already in use/i.test(message) || /email.*already/i.test(message))
    return "Este e-mail já está em uso.";
  if (/invalid email/i.test(message) || /invalid-email/i.test(message))
    return "E-mail inválido.";
  if (/user not found|no user record/i.test(message))
    return "Usuário não encontrado.";
  if (/wrong password|invalid password/i.test(message))
    return "Senha incorreta.";
  if (/too many requests|blocked all requests/i.test(message))
    return "Muitas tentativas. Tente novamente mais tarde.";
  if (/weak password|password should be at least/i.test(message))
    return "Senha muito fraca. Escolha uma senha mais segura.";
  if (/network/i.test(message)) return "Erro de rede. Verifique sua conexão.";
  if (/requires recent login/i.test(message))
    return "Re-autentique-se e tente novamente para realizar esta ação.";

  // Fallback: show a readable generic message including the original message
  const cleaned = message.replace(/^Firebase:\s*/i, "").trim();
  return cleaned ? `Erro: ${cleaned}` : "Ocorreu um erro. Tente novamente mais tarde.";
}
