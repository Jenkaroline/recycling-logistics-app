import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getMultiFactorResolver, signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { auth } from "../../service/firebaseConfig";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import { sendPhoneLoginCode } from "../../src/TwoFactorAuthService";

// Defina os nomes das rotas do seu Stack
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: undefined;
  Verify2FA: { resolver: any };
};

export default function LoginScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { darkModeEnabled } = useThemePreference();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        textPrimary: "#ffffff",
        inputBg: "#e8f2ff",
        inputText: "#0a2740",
        inputBorder: "#5b7ea6",
        link: "#b7cde6",
      }
    : {
        bg: "#f4f8fc",
        textPrimary: "#1d3750",
        inputBg: "#ffffff",
        inputText: "#1f3346",
        inputBorder: "#96aec6",
        link: "#5d748b",
      };

  const handleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (userCredential.user && !userCredential.user.emailVerified) {
        alert("Por favor, verifique seu e-mail antes de acessar o app.");
        navigation.navigate("VerifyEmail");
        return;
      }
      navigation.navigate("Main");
    } catch (caughtError: any) {
      if (caughtError?.code === "auth/multi-factor-auth-required") {
        try {
          const resolver = getMultiFactorResolver(auth, caughtError);
          await sendPhoneLoginCode(resolver);
          navigation.navigate("Verify2FA", { resolver });
        } catch (resolverError: any) {
          setError(resolverError.message || "Erro ao processar a segunda etapa de autenticação.");
        }
      } else {
        setError(caughtError?.message || "Não foi possível entrar.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>Entrar</Text>
      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        editable={!isLoading}
        style={[styles.input, { backgroundColor: palette.inputBg }]}
        mode="outlined"
        activeOutlineColor="#36a3ff"
        outlineColor={palette.inputBorder}
        textColor={palette.inputText}
        theme={{ colors: { primary: "#36a3ff", onSurfaceVariant: "#365a7d" } }}
        outlineStyle={{ borderRadius: 16 }}
      />
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        editable={!isLoading}
        secureTextEntry={!showPassword}
        right={
          <TextInput.Icon
            icon={showPassword ? "eye-off" : "eye"}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        style={[styles.input, { backgroundColor: palette.inputBg }]}
        mode="outlined"
        activeOutlineColor="#36a3ff"
        outlineColor={palette.inputBorder}
        textColor={palette.inputText}
        theme={{ colors: { primary: "#36a3ff", onSurfaceVariant: "#365a7d" } }}
        outlineStyle={{ borderRadius: 16 }}
      />
      {error && (
        <Text style={[styles.error, { color: "#ff6b6b" }]}>{error}</Text>
      )}
      <Button
        mode="contained"
        buttonColor="#36a3ff"
        textColor="#032746"
        onPress={handleLogin}
        loading={isLoading}
        disabled={isLoading}
      >
        Entrar
      </Button>
      <Button
        textColor={palette.link}
        onPress={() => navigation.navigate("Register")}
        disabled={isLoading}
      >
        Criar conta
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    marginTop: 0,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
