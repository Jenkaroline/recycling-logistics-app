import React, { useState } from "react";
import { Image } from "expo-image";
import { ScrollView, View, Text, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { sendPasswordResetEmail } from "firebase/auth";
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

  const handleSendReset = async () => {
    setError("");
    setStatusMessage("");
    if (!email.trim()) {
      setError("E-mail é obrigatório!");
      return;
    }

    setIsSending(true);
    try {
      const redirectUrl = "https://jenkaroline.github.io/recycling-logistics-app/reset";
      const actionCodeSettings = {
        // Use an HTTPS redirect page (GitHub Pages) that forwards the oobCode to the app scheme.
        url: redirectUrl,
        handleCodeInApp: true,
      } as any;
      await sendPasswordResetEmail(auth, sanitize(email), actionCodeSettings);
      setStatusMessage("E-mail de redefinição enviado. Verifique sua caixa de entrada.");
    } catch (err: any) {
      const mapped = translateFirebaseError(err);
      setError(mapped);
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
            {!error && <ActivityIndicator color={palette.accent} />}
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
          onPress={() => navigation.navigate("Login")}
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
});
