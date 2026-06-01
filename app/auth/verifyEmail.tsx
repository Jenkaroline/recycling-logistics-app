import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { deleteUser, reload, sendEmailVerification, signOut, verifyBeforeUpdateEmail } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
// using Ionicons for the hero icon instead of the app logo
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { auth } from "../../service/firebaseConfig";
import { translateFirebaseError } from "../../src/firebaseErrorMapper";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import ErrorMessage from "../components/ErrorMessage";
import SuccessMessage from "../components/SuccessMessage";
import WavesBackground from "../components/WavesBackground";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: { message?: string; error?: string; flow?: "register" | "email-change"; email?: string } | undefined;
};

export default function VerifyEmailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const router = useRouter();
  const { darkModeEnabled } = useThemePreference();
  const { width } = useWindowDimensions();
  const { top: insetTop } = useSafeAreaInsets();
  const [emailSent, setEmailSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const user = auth.currentUser;
  const route = useRoute();
  const routeParams: any = route.params;
  const errorFromParams = routeParams?.error || "";
  const verificationFlow = routeParams?.flow || "register";
  const pendingEmail = routeParams?.email || user?.email || "";

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        bgGlow: "rgba(54, 163, 255, 0.12)",
        cardBg: "rgba(8, 28, 48, 0.88)",
        cardBorder: "rgba(183, 205, 230, 0.18)",
        textPrimary: "#ffffff",
        textSecondary: "#b7cde6",
        accent: "#36a3ff",
        accentSoft: "rgba(54, 163, 255, 0.14)",
        error: "#ff8a8a",
      }
    : {
        bg: "#f4f8fc",
        bgGlow: "rgba(54, 163, 255, 0.16)",
        cardBg: "rgba(255, 255, 255, 0.92)",
        cardBorder: "rgba(149, 175, 198, 0.32)",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        accent: "#36a3ff",
        accentSoft: "rgba(54, 163, 255, 0.12)",
        error: "#c74848",
      };
  const horizontalPadding = width < 360 ? 14 : width < 420 ? 18 : 22;
  const cardWidth = Math.min(460, width - horizontalPadding * 2);
  const heroSize = width < 360 ? 126 : width < 420 ? 142 : 158;
  const heroImageSize = width < 360 ? 106 : width < 420 ? 120 : 134;
  const adjustedHeroImageSize = Math.min(160, Math.round(cardWidth * 0.45));
  const resendButtonColor = darkModeEnabled ? "rgba(91, 183, 255, 0.18)" : "rgba(54, 163, 255, 0.10)";
  const resendButtonTextColor = darkModeEnabled ? "#cbe7ff" : palette.textSecondary;
  const resendButtonLockedColor = darkModeEnabled ? "rgba(91, 183, 255, 0.12)" : "rgba(54, 163, 255, 0.08)";
  const resendButtonLockedTextColor = darkModeEnabled ? "#9fcdf5" : palette.textSecondary;

  const handleSendVerification = async () => {
    setError("");
    if (user) {
      try {
        if (verificationFlow === "email-change" && pendingEmail) {
          await verifyBeforeUpdateEmail(user, pendingEmail, {
            url: "https://jenkaroline.github.io/recycling-logistics-app/action/",
            handleCodeInApp: true,
          });
        } else {
          await sendEmailVerification(user, {
            url: "https://jenkaroline.github.io/recycling-logistics-app/action/",
            handleCodeInApp: true,
          });
        }
        setEmailSent(true);
        // start resend cooldown
        startResendCooldown(60);
      } catch (e: any) {
        setError(translateFirebaseError(e));
      }
    } else {
      setError("Usuário não autenticado. Faça login novamente.");
    }
  };

  const startResendCooldown = (seconds = 60) => {
    setCanResend(false);
    setResendTimer(seconds);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleCheckVerification = async () => {
    setChecking(true);
    setError("");
    try {
      const currentUser = auth.currentUser;
      if (verificationFlow === "email-change") {
        if (currentUser) {
          try {
            await reload(currentUser);
          } catch (reloadError) {
            console.warn("[verify-email][email-change] reload failed", reloadError);
          }
          try {
            await signOut(auth);
          } catch (signOutError) {
            console.warn("[verify-email][email-change] signOut failed", signOutError);
          }
        }
        router.replace("/auth/login");
        return;
      }

      if (currentUser) {
        await reload(currentUser);
        const refreshedUser = auth.currentUser ?? currentUser;
        const emailMatchesPending = verificationFlow !== "email-change" || !pendingEmail || refreshedUser.email === pendingEmail;
        if (refreshedUser.emailVerified && emailMatchesPending) {
          router.replace("/");
        } else {
          setError(
            "E-mail ainda não verificado. Se você acabou de confirmar no link, aguarde alguns segundos e tente novamente.",
          );
        }
      } else {
        setError("Usuário não autenticado. Faça login novamente.");
      }
    } catch (e: any) {
      setError(translateFirebaseError(e));
    }
    setChecking(false);
  };

  useEffect(() => {
    // If we arrived here after registration (route params contain a message),
    // assume the verification email was already sent and start the cooldown.
    if (routeParams?.message) {
      setEmailSent(true);
      startResendCooldown(60);
    } else {
      setCanResend(true);
    }
  }, []);

  useEffect(() => {
    if (errorFromParams) {
      setError(errorFromParams);
    }
  }, [errorFromParams]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingHorizontal: horizontalPadding, paddingTop: insetTop + 18 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <WavesBackground dark={darkModeEnabled} />

      <TouchableOpacity
        onPress={async () => {
          const currentUser = auth.currentUser;
          if (verificationFlow === "register" && currentUser && !currentUser.emailVerified) {
            try {
              await deleteUser(currentUser);
            } catch (deleteError) {
              console.warn("Não foi possível apagar o usuário não verificado.", deleteError);
            }
          }

          if ((navigation as any).canGoBack && (navigation as any).canGoBack()) {
            navigation.goBack();
          } else {
            router.replace("/auth/login");
          }
        }}
        style={[styles.backButton, { top: insetTop + 10 }]}
        accessibilityLabel="Voltar"
      >
        <Ionicons name="arrow-back" size={24} color={palette.textPrimary} />
      </TouchableOpacity>

      <View
        style={[
          styles.card,
          { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, width: cardWidth, zIndex: 2 },
        ]}
      >
          <View style={[styles.heroWrap, { marginBottom: error ? 12 : 18 }]}>
          <View style={[styles.heroFrame, { backgroundColor: 'transparent' }]}>
            <Ionicons name="mail" size={adjustedHeroImageSize} color={palette.accent} />
          </View>
        </View>

        <Text style={[styles.title, { color: palette.textPrimary }]}>Confirme seu e-mail</Text>
        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <Text style={[styles.description, { color: palette.textSecondary }]}> 
            {emailSent
              ? `Enviamos o código para ${pendingEmail || user?.email}. Abra seu e-mail e volte aqui para continuar.`
              : "Toque para enviar o email de verificação e liberar as próximas ações."}
          </Text>
        )}

        {!emailSent ? (
          <Button
            mode="contained"
            buttonColor={palette.accent}
            textColor="#032746"
            onPress={handleSendVerification}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
          >
            Enviar email de verificação
          </Button>
        ) : (
          <View style={styles.actionsWrap}>
            <Button
              mode="contained"
              buttonColor={palette.accent}
              textColor="#032746"
              onPress={handleCheckVerification}
              loading={checking}
              style={styles.primaryButton}
              contentStyle={styles.primaryButtonContent}
            >
              Já verifiquei meu e-mail
            </Button>

            <Button
              mode="contained"
              buttonColor={canResend ? resendButtonColor : resendButtonLockedColor}
              textColor={canResend ? resendButtonTextColor : resendButtonLockedTextColor}
              onPress={canResend ? handleSendVerification : undefined}
              accessibilityState={{ disabled: !canResend }}
              style={[styles.secondaryButton, { borderColor: darkModeEnabled ? "rgba(91, 183, 255, 0.28)" : palette.cardBorder }]}
              contentStyle={styles.secondaryButtonContent}
            >
              {canResend ? "Reenviar e-mail" : "Aguarde para reenviar"}
            </Button>

            {!canResend && resendTimer > 0 ? (
              <Text style={[styles.timer, { color: palette.textSecondary }]}>
                Disponível em {resendTimer}s
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 18,
    overflow: "hidden",
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroWrap: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  heroFrame: {
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: {
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 0,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 340,
    marginBottom: 10,
  },
  error: {
    marginBottom: 8,
    textAlign: "center",
  },
  actionsWrap: {
    width: "100%",
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    marginTop: 4,
    borderRadius: 18,
  },
  primaryButtonContent: {
    height: 44,
  },
  secondaryButton: {
    width: "100%",
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 0,
  },
  secondaryButtonContent: {
    height: 42,
  },
  timer: {
    marginTop: 4,
    fontSize: 12,
  },
});
