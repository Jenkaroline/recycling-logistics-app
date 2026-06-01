import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../service/firebaseConfig";
import { translateFirebaseError } from "../../src/firebaseErrorMapper";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import ErrorMessage from "../components/ErrorMessage";
import WavesBackground from "../components/WavesBackground";

// Defina os nomes das rotas do seu Stack
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: { message?: string; email?: string; flow?: "register" | "email-change" } | undefined;
  ResetPassword: undefined;
};

export default function LoginScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const router = useRouter();
  const { darkModeEnabled } = useThemePreference();
  const { width } = useWindowDimensions();
  const { top: insetTop } = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const sanitize = (s: string) => s.replace(/\s+/g, "");

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        bgGlow: "rgba(54, 163, 255, 0.12)",
        cardBg: "rgba(8, 28, 48, 0.88)",
        cardBorder: "rgba(183, 205, 230, 0.18)",
        textPrimary: "#ffffff",
        textSecondary: "#b7cde6",
        inputBg: "#e8f2ff",
        inputText: "#0a2740",
        inputBorder: "#5b7ea6",
        link: "#b7cde6",
        accent: "#36a3ff",
        accentSoft: "rgba(54, 163, 255, 0.14)",
      }
    : {
        bg: "#f4f8fc",
        bgGlow: "rgba(54, 163, 255, 0.16)",
        cardBg: "rgba(255, 255, 255, 0.92)",
        cardBorder: "rgba(149, 175, 198, 0.32)",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        inputBg: "#ffffff",
        inputText: "#1f3346",
        inputBorder: "#96aec6",
        link: "#5d748b",
        accent: "#36a3ff",
        accentSoft: "rgba(54, 163, 255, 0.12)",
      };

    const heroImageSource = require("../../assets/images/logo-ciclo.png");
    const horizontalPadding = width < 360 ? 14 : width < 420 ? 18 : 22;
    const cardWidth = Math.min(460, width - horizontalPadding * 2);
    const heroImageSize = Math.min(160, Math.round(cardWidth * 0.45));

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) {
      setError("Por favor, insira seu e-mail.");
      return;
    }
    if (!password) {
      setError("Por favor, insira sua senha.");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user && !userCredential.user.emailVerified) {
        const msg = encodeURIComponent("Sua conta ainda não foi verificada. Confira seu e-mail para liberar o acesso.");
        const emailParam = encodeURIComponent(userCredential.user.email || sanitize(email));
        router.push(`/auth/verifyEmail?message=${msg}&email=${emailParam}&flow=register`);
        return;
      }
      router.replace("/");
    } catch (err: any) {
      setError(translateFirebaseError(err));
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

      <View
        style={[
          styles.card,
          { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, width: cardWidth, zIndex: 2 },
        ]}
      >
          <View style={[styles.heroWrap, { marginBottom: error ? 12 : -Math.round(heroImageSize * 0.12) }]}>
          <View style={[styles.heroFrame, { backgroundColor: "transparent" }]}>
            <Image
              source={heroImageSource}
              style={[styles.heroImage, { width: heroImageSize, height: heroImageSize }]}
              contentFit="contain"
              transition={180}
            />
          </View>
        </View>

        <Text style={[styles.title, { color: palette.textPrimary }]}>Entrar</Text>
        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <Text style={[styles.description, { color: palette.textSecondary }]}> 
            Entre para continuar.
          </Text>
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
        <TextInput
          label="Senha"
          value={password}
          onChangeText={(t) => setPassword(sanitize(t))}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          style={[styles.input, { backgroundColor: palette.inputBg }]}
          mode="outlined"
          activeOutlineColor={palette.accent}
          outlineColor={palette.inputBorder}
          textColor={palette.inputText}
          theme={{ colors: { primary: palette.accent, onSurfaceVariant: "#365a7d" } }}
          outlineStyle={{ borderRadius: 16 }}
        />

        {/* error shown under title */}

        <Button
          mode="contained"
          buttonColor={palette.accent}
          textColor="#032746"
          onPress={handleLogin}
          style={styles.primaryButton}
          contentStyle={styles.primaryButtonContent}
        >
          Entrar
        </Button>
        <Button
          textColor={palette.link}
          onPress={() => router.push("/auth/resetPassword")}
          style={styles.linkButton}
        >
          Esqueci minha senha
        </Button>

        <Button
          textColor={palette.link}
          onPress={() => router.push("/auth/register")}
          style={styles.linkButton}
        >
          Criar conta
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
  heroImage: {
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
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
});
