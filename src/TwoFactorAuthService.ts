import {
  MultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  multiFactor,
} from "firebase/auth";
import { auth } from "../service/firebaseConfig";

let verificationId: string | null = null;

const formatFirebaseError = (error: any) => {
  if (error?.code === "auth/operation-not-allowed") {
    return new Error(
      "Autenticação por telefone não está habilitada no Firebase. Ative o provedor Phone em Authentication > Sign-in method."
    );
  }
  return error;
};

/**
 * Enviar código SMS para configurar 2FA durante o registro
 */
export const sendPhoneEnrollmentCode = async (
  phoneNumber: string,
  recaptchaVerifier: any,
) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const phoneProvider = new PhoneAuthProvider(auth);
    const verifyId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      recaptchaVerifier,
    );

    verificationId = verifyId;
    console.log("Código SMS enviado para:", phoneNumber);
    return true;
  } catch (error) {
    const formattedError = formatFirebaseError(error);
    console.error("Erro ao enviar código SMS:", formattedError);
    throw formattedError;
  }
};

/**
 * Confirmar e registrar número de telefone como fator de autenticação
 */
export const enrollPhoneNumber = async (smsCode: string) => {
  try {
    if (!verificationId) {
      throw new Error("ID de verificação não encontrado. Solicite um novo código.");
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const phoneCredential = PhoneAuthProvider.credential(verificationId, smsCode);
    const multiFactorUser = multiFactor(user);
    const multiFactorAssertion =
      await PhoneMultiFactorGenerator.assertion(phoneCredential);

    await multiFactorUser.enroll(multiFactorAssertion, "Telefone Registrado");

    verificationId = null;
    console.log("Número de telefone registrado como 2FA com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao registrar 2FA:", error);
    throw error;
  }
};

/**
 * Enviar código SMS para fazer login com 2FA
 */
export const sendPhoneLoginCode = async (
  resolver: MultiFactorResolver,
  recaptchaVerifier: any,
) => {
  try {
    const phoneHint = resolver.hints.find(
      (hint) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID,
    );

    if (!phoneHint) {
      throw new Error("Nenhum fator de telefone configurado para este usuário.");
    }

    const phoneProvider = new PhoneAuthProvider(auth);
    const verifyId = await phoneProvider.verifyPhoneNumber(
      {
        multiFactorHint: phoneHint,
        session: resolver.session,
      },
      recaptchaVerifier,
    );

    verificationId = verifyId;
    console.log("Código SMS de login enviado para o fator registrado");
    return true;
  } catch (error) {
    const formattedError = formatFirebaseError(error);
    console.error("Erro ao enviar código SMS de login:", formattedError);
    throw formattedError;
  }
};

/**
 * Resolver desafio 2FA durante o login
 */
export const resolveMultiFactorChallenge = async (
  smsCode: string,
  resolver: MultiFactorResolver,
) => {
  try {
    if (!verificationId) {
      throw new Error("ID de verificação não encontrado");
    }

    const phoneCredential = PhoneAuthProvider.credential(verificationId, smsCode);
    const multiFactorAssertion =
      await PhoneMultiFactorGenerator.assertion(phoneCredential);

    const userCredential = await resolver.resolveSignIn(multiFactorAssertion);

    verificationId = null;
    console.log("Login com 2FA confirmado com sucesso");
    return userCredential;
  } catch (error) {
    console.error("Erro ao resolver desafio 2FA:", error);
    throw error;
  }
};

/**
 * Obter informações de fatores de autenticação do usuário
 */
export const getEnrolledFactors = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const multiFactorUser = multiFactor(user);
    return multiFactorUser.enrolledFactors;
  } catch (error) {
    console.error("Erro ao obter fatores de autenticação:", error);
    return [];
  }
};

/**
 * Verificar se usuário tem 2FA ativado
 */
export const has2FAEnrolled = async (): Promise<boolean> => {
  try {
    const factors = await getEnrolledFactors();
    return factors.length > 0;
  } catch (error) {
    console.error("Erro ao verificar 2FA:", error);
    return false;
  }
};

/**
 * Remover número de telefone do 2FA
 */
export const unenrollPhoneNumber = async (factorUid: string) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const multiFactorUser = multiFactor(user);
    await multiFactorUser.unenroll(factorUid);

    console.log("Número de telefone removido do 2FA");
    return true;
  } catch (error) {
    console.error("Erro ao remover 2FA:", error);
    throw error;
  }
};

export default {
  sendPhoneEnrollmentCode,
  enrollPhoneNumber,
  sendPhoneLoginCode,
  resolveMultiFactorChallenge,
  getEnrolledFactors,
  has2FAEnrolled,
  unenrollPhoneNumber,
};
