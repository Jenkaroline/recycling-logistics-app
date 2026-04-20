import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { Button, TextInput, ActivityIndicator } from "react-native-paper";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import { resolveMultiFactorChallenge } from "../../src/TwoFactorAuthService";

type RootStackParamList = {
  VerifyEmail: undefined;
  Main: undefined;
  Verify2FA: { resolver: any };
};

export default function Verify2FAScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { darkModeEnabled } = useThemePreference();
  const [smsCode, setSmsCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const { resolver } = route.params || {};

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

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerify = async () => {
    setError("");
    if (!smsCode.trim() || smsCode.length < 6) {
      setError("Insira o código de 6 dígitos");
      return;
    }

    setIsLoading(true);
    try {
      await resolveMultiFactorChallenge(smsCode, resolver);
      navigation.navigate("Main");
    } catch (err: any) {
      setError(err.message || "Código inválido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: palette.bg },
      ]}
    >
      <Text style={[styles.title, { color: palette.textPrimary }]}>
        Verificação de Segurança
      </Text>
      <Text style={[styles.subtitle, { color: palette.link }]}>
        Insira o código enviado para seu telefone
      </Text>

      <TextInput
        label="Código SMS (6 dígitos)"
        value={smsCode}
        onChangeText={setSmsCode}
        maxLength={6}
        keyboardType="numeric"
        editable={!isLoading}
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
        onPress={handleVerify}
        loading={isLoading}
        disabled={isLoading || smsCode.length < 6}
        style={styles.button}
      >
        {isLoading ? "Verificando..." : "Confirmar"}
      </Button>

      {resendCountdown > 0 && (
        <Text style={[styles.resendInfo, { color: palette.link }]}>
          Reenviar código em {resendCountdown}s
        </Text>
      )}

      {isLoading && <ActivityIndicator animating={true} style={styles.loader} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "500",
  },
  input: {
    marginBottom: 20,
  },
  error: {
    fontSize: 14,
    marginBottom: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
  },
  resendInfo: {
    fontSize: 12,
    marginTop: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  loader: {
    marginTop: 20,
  },
});
