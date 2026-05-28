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
    "auth/invalid-email": "Endereço de e‑mail inválido. Verifique e tente novamente.",
    "auth/user-not-found": "Não encontramos uma conta com esse e‑mail.",
    "auth/email-already-in-use": "Já existe uma conta registrada com esse e‑mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "Credenciais inválidas.",
    "auth/invalid-custom-token": "Token inválido.",
    "auth/invalid-user-token": "Sessão inválida. Faça login novamente.",
    "auth/user-token-expired": "Sessão expirada. Faça login novamente.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/weak-password": "Senha muito fraca. Escolha uma senha mais segura.",
    "auth/expired-action-code": "O link expirou ou é inválido. Solicite um novo e‑mail de redefinição.",
    "auth/invalid-action-code": "O link é inválido. Solicite um novo e‑mail de redefinição.",
    "auth/requires-recent-login": "Re-autentique-se e tente novamente para realizar esta ação.",
    "auth/network-request-failed": "Erro de rede. Verifique sua conexão e tente novamente.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/popup-closed-by-user": "A ação foi cancelada pelo usuário.",
    "auth/cancelled-popup-request": "Ação cancelada.",
    "permission-denied": "Você não tem permissão para realizar essa ação.",
    "not-found": "Não encontramos os dados necessários para concluir essa ação.",
    "unavailable": "O serviço está temporariamente indisponível. Tente novamente em instantes.",
    "deadline-exceeded": "A operação demorou demais. Tente novamente.",
    "already-exists": "Esse item já existe.",
    "edit-limit-reached": "Este registro já atingiu o limite de 3 edições.",
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

  // Fallback: never expose raw Firebase internals to the UI.
  return "Não foi possível concluir a ação. Tente novamente mais tarde.";
}
