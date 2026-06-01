import React, { useState } from "react";
import { Image } from "expo-image";
import { ScrollView, View, Text, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useRouter } from "expo-router";
import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../service/firebaseConfig";
import { translateFirebaseError } from "../../src/firebaseErrorMapper";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ErrorMessage from "../components/ErrorMessage";
import WavesBackground from "../components/WavesBackground";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { message?: string; error?: string } | undefined;
  ResetPassword: undefined;
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const router = useRouter();
  const { darkModeEnabled } = useThemePreference();
  const { width } = useWindowDimensions();
  const { top: insetTop } = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sanitize = (s: string) => s.replace(/\s+/g, "");

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        cardBg: "rgba(8, 28, 48, 0.88)",
        cardBorder: "rgba(183, 205, 230, 0.18)",
        textPrimary: "#ffffff",
        textSecondary: "#b7cde6",
        inputBg: "#e8f2ff",
        inputText: "#0a2740",
        inputBorder: "#5b7ea6",
        accent: "#36a3ff",
      }
    : {
        bg: "#f4f8fc",
        cardBg: "rgba(255, 255, 255, 0.92)",
        cardBorder: "rgba(149, 175, 198, 0.32)",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        inputBg: "#ffffff",
        inputText: "#1f3346",
        inputBorder: "#96aec6",
        accent: "#36a3ff",
      };

  const horizontalPadding = width < 360 ? 14 : width < 420 ? 18 : 22;
  const cardWidth = Math.min(460, width - horizontalPadding * 2);
  const heroImageSize = Math.min(140, Math.round(cardWidth * 0.42));

  const heroImageSource = error
    ? require("../../assets/images/erro-ilustracao.png")
    : require("../../assets/images/senha.png");

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendReset = async () => {
    setError("");
    setStatusMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    console.info("[ResetPassword] handleSendReset start", { normalizedEmail });

    if (!normalizedEmail) {
      setError("E-mail é obrigatório!");
      console.warn("[ResetPassword] blocked: empty email");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("Digite um e-mail válido para recuperar a senha.");
      console.warn("[ResetPassword] blocked: invalid email format", { normalizedEmail });
      return;
    }
    setIsSending(true);
    try {
      console.info("[ResetPassword] validating account existence", {
        inputEmail: normalizedEmail,
      });

      const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      console.info("[ResetPassword] validation result", {
        inputEmail: normalizedEmail,
        methodsCount: signInMethods.length,
      });

      if (signInMethods.length === 0) {
        console.warn("[ResetPassword] account not registered in app", {
          inputEmail: normalizedEmail,
        });
        setError("Não encontramos uma conta cadastrada com esse e-mail no app. Confira o endereço ou crie uma conta.");
        return;
      }

      console.info("[ResetPassword] sending password reset", {
        inputEmail: normalizedEmail,
      });

      const redirectUrl = "https://jenkaroline.github.io/recycling-logistics-app/action/";
      const actionCodeSettings = {
        // Use an HTTPS redirect page (GitHub Pages) that forwards the oobCode to the app scheme.
        url: redirectUrl,
        handleCodeInApp: true,
      } as any;
      await sendPasswordResetEmail(auth, normalizedEmail, actionCodeSettings);
      console.info("[ResetPassword] reset email sent", {
        inputEmail: normalizedEmail,
      });
      setStatusMessage("E-mail de redefinição enviado. Verifique sua caixa de entrada.");
    } catch (err: any) {
      const code = err?.code?.toString?.() || "";
      console.warn("[ResetPassword] send reset failed", {
        inputEmail: normalizedEmail,
        code,
        message: err?.message || String(err),
      });
      if (code === "auth/invalid-email") {
        setError("Digite um e-mail válido para recuperar a senha.");
      } else if (code === "auth/user-not-found") {
        setError("Não encontramos uma conta cadastrada com esse e-mail no app. Confira o endereço ou crie uma conta.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (code === "auth/network-request-failed") {
        setError("Falha de conexão. Verifique sua internet e tente novamente.");
      } else {
        const mapped = translateFirebaseError(err);
        setError(mapped === "Não foi possível concluir a ação. Tente novamente mais tarde." ? "Não foi possível enviar o e-mail de redefinição agora. Tente novamente em instantes." : mapped);
      }
      setStatusMessage("");
    } finally {
      setIsSending(false);
    }
  };

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

      {isSending && (
        <View style={[styles.overlay, { backgroundColor: darkModeEnabled ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)' }]} pointerEvents="auto">
          <ActivityIndicator size={48} color={palette.accent} />
        </View>
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, width: cardWidth, zIndex: 2 },
        ]}
      >
        <View style={[styles.heroWrap, { marginBottom: error ? 12 : 12 }]}> 
          <View style={[styles.heroFrame, { backgroundColor: "transparent" }]}>
            <Image
              source={heroImageSource}
              style={[styles.heroImage, { width: heroImageSize, height: heroImageSize }]}
              contentFit="contain"
              transition={180}
            />
          </View>
        </View>

        <Text style={[styles.title, { color: palette.textPrimary }]}>Redefinir senha</Text>
        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <Text style={[styles.description, { color: palette.textSecondary }]}>Insira seu e‑mail para receber o link de redefinição.</Text>
        )}

        <TextInput
          label="E-mail"
          value={email}
          onChangeText={(t) => setEmail(sanitize(t))}
          style={[styles.input, { backgroundColor: palette.inputBg }]}
          mode="outlined"
          activeOutlineColor={palette.accent}
          outlineColor={palette.inputBorder}
          textColor={palette.inputText}
          theme={{ colors: { primary: palette.accent, onSurfaceVariant: "#365a7d" } }}
          outlineStyle={{ borderRadius: 16 }}
        />

        {statusMessage ? (
          <View style={styles.statusContainer}>
            {isSending && <ActivityIndicator color={palette.accent} />}
            <Text style={[styles.statusText, { color: palette.textPrimary }]}>{statusMessage}</Text>
          </View>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSendReset}
          loading={isSending}
          disabled={isSending}
          buttonColor={palette.accent}
          textColor="#032746"
          style={styles.primaryButton}
          contentStyle={styles.primaryButtonContent}
        >
          Enviar e-mail
        </Button>

        <Button
          mode="text"
          textColor={palette.textSecondary}
          onPress={() => router.replace("/auth/login")}
          style={styles.linkButton}
        >
          Voltar ao login
        </Button>
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
  heroImage: {},
  title: {
    fontSize: 23,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 0,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 340,
    marginBottom: 10,
  },
  input: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "transparent",
    width: "100%",
  },
  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statusText: {
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    marginTop: 4,
    borderRadius: 18,
  },
  primaryButtonContent: {
    height: 44,
  },
  linkButton: {
    marginTop: 2,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
