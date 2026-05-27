import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Image } from "expo-image";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
} from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../service/firebaseConfig";
import { translateFirebaseError } from "../../src/firebaseErrorMapper";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import ErrorMessage from "../components/ErrorMessage";
import WavesBackground from "../components/WavesBackground";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: { message?: string; error?: string; email?: string } | undefined;
};

export default function RegisterScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { darkModeEnabled } = useThemePreference();
  const { width } = useWindowDimensions();
  const { top: insetTop } = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const sanitize = (s: string) => s.replace(/\s+/g, "");

  const withTimeout = async <T,>(promise: Promise<T>, label: string, timeoutMs = 8000) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} demorou demais para responder.`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const isStrongPassword = (s: string) => {
    // mínimo 8 caracteres, pelo menos uma maiúscula, uma minúscula, um número e um caractere especial
    return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(s);
  };

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

  const handleRegister = async () => {
    setError("");
    setStatusMessage("");
    if (!username.trim()) {
      setError("Nome de usuário é obrigatório!");
      return;
    }
    if (!email.trim()) {
      setError("E-mail é obrigatório!");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }
    if (!isStrongPassword(password)) {
      setError(
        "A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial."
      );
      return;
    }

    setIsRegistering(true);
    setStatusMessage("Criando sua conta...");
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (userCredential.user) {
        setStatusMessage("Atualizando perfil...");
        const db = getFirestore();
        await withTimeout(
          updateProfile(userCredential.user, {
            displayName: username.trim(),
          }),
          "Atualização de perfil",
        );

        setStatusMessage("Salvando seus dados no banco...");
        try {
          await withTimeout(
            setDoc(doc(db, "users", userCredential.user.uid), {
              uid: userCredential.user.uid,
              username: username.trim(),
              email: email,
              emailLower: email.trim().toLowerCase(),
              avatarUrl: "",
              bio: "",
              followersCount: 0,
              followingCount: 0,
              createdAt: serverTimestamp(),
            }),
            "Gravação no banco",
          );
        } catch (dbError: any) {
          setStatusMessage(
            `Conta criada no Auth. Falha ao salvar perfil: ${dbError?.message || "erro desconhecido"}`
          );
        }

        setStatusMessage("Enviando confirmação por e-mail...");
        let verificationSent = false;
        try {
          await withTimeout(
            sendEmailVerification(userCredential.user, {
              url: "https://jenkaroline.github.io/recycling-logistics-app/action/",
              handleCodeInApp: true,
            }),
            "Envio da confirmação por e-mail",
          );
          verificationSent = true;
        } catch (sendError: any) {
          if (String(sendError?.message || "").includes("demorou demais")) {
            console.warn("[register] verification email timed out after queueing", sendError);
            verificationSent = true;
          } else {
            throw sendError;
          }
        }

        if (!verificationSent) {
          throw new Error("Não foi possível enviar o e-mail de verificação.");
        }

        setStatusMessage("Indo para a verificação...");
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "VerifyEmail",
              params: {
                message: "Conta criada com sucesso! Verifique seu e-mail.",
                email: userCredential.user.email || email,
                flow: "register",
              },
            },
          ],
        });
      }
    } catch (error: any) {
      const mappedError = translateFirebaseError(error);
      setError(mappedError);
      setStatusMessage("");
    } finally {
      setIsRegistering(false);
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
                style={[styles.heroImage, { width: heroImageSize, height: heroImageSize } ]}
                contentFit="contain"
                transition={180}
              />
            </View>
        </View>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Cadastro</Text>
        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <Text style={[styles.description, { color: palette.textSecondary }]}> 
            Preencha os dados e siga para a verificação.
          </Text>
        )}

        <TextInput
          label="Nome de Usuário"
          value={username}
          onChangeText={(t) => setUsername(sanitize(t))}
          style={[styles.input, { backgroundColor: palette.inputBg }]}
          mode="outlined"
          activeOutlineColor={palette.accent}
          outlineColor={palette.inputBorder}
          textColor={palette.inputText}
          theme={{ colors: { primary: palette.accent, onSurfaceVariant: "#365a7d" } }}
          outlineStyle={{ borderRadius: 16 }}
        />
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
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={(t) => setPassword(sanitize(t))}
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
        <TextInput
          label="Confirmar Senha"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={(t) => setConfirmPassword(sanitize(t))}
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
        {/* error shown above title now */}
        {statusMessage ? (
          <View style={styles.statusContainer}>
            {!error && !isRegistering && <ActivityIndicator color={palette.accent} />}
            <Text style={[styles.statusText, { color: palette.textPrimary }]}>{statusMessage}</Text>
          </View>
        ) : null}
        <Button
          mode="contained"
          buttonColor={palette.accent}
          textColor="#032746"
          onPress={handleRegister}
          loading={isRegistering}
          disabled={isRegistering}
          style={styles.primaryButton}
          contentStyle={styles.primaryButtonContent}
        >
          Registrar
        </Button>
        <Button
          mode="text"
          textColor={palette.link}
          onPress={() => navigation.navigate("Login")}
          style={styles.linkButton}
        >
          Já tem uma conta? Login
        </Button>
        {isRegistering && (
          <View style={[styles.overlay, { backgroundColor: darkModeEnabled ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)' }]} pointerEvents="auto">
            <ActivityIndicator size={48} color={palette.accent} />
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
