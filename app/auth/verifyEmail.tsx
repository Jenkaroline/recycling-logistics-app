import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { reload, sendEmailVerification } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "react-native-paper";
import { auth } from "../../service/firebaseConfig";
import { useThemePreference } from "../../src/ThemePreferenceContext";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: undefined;
};

export default function VerifyEmailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { darkModeEnabled } = useThemePreference();
  const [canResend, setCanResend] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const user = auth.currentUser;

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        textPrimary: "#ffffff",
        textSecondary: "#b7cde6",
        error: "#ff8a8a",
      }
    : {
        bg: "#f4f8fc",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        error: "#c74848",
      };

  const handleSendVerification = async () => {
    setError("");
    if (user) {
      try {
        await sendEmailVerification(user);
        setCanResend(false);
        setTimeout(() => setCanResend(true), 60000); // 60 segundos
      } catch (e: any) {
        setError("Erro ao enviar e-mail de verificação. " + (e?.message || ""));
      }
    } else {
      setError("Usuário não autenticado. Faça login novamente.");
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    setError("");
    try {
      if (user) {
        await reload(user);
        if (user.emailVerified) {
          navigation.navigate("Main");
        } else {
          setError("E-mail ainda não verificado.");
        }
      }
    } catch {
      setError("Erro ao checar verificação.");
    }
    setChecking(false);
  };

  useEffect(() => {
    setCanResend(true);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: "absolute", left: 0, marginTop: 50 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={28} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.description, { color: palette.textSecondary }]}>
        Um e-mail de verificação foi enviado para {user?.email}. Por favor,
        verifique seu e-mail para continuar.
      </Text>
      {error ? (
        <Text style={[styles.error, { color: palette.error }]}>{error}</Text>
      ) : null}
      <Button
        mode="contained"
        buttonColor="#36a3ff"
        textColor="#032746"
        onPress={handleCheckVerification}
        loading={checking}
      >
        Já verifiquei meu e-mail
      </Button>
      <Button
        mode="text"
        textColor={palette.textSecondary}
        onPress={handleSendVerification}
        disabled={!canResend}
        style={{ marginTop: 8 }}
      >
        Reenviar e-mail
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 0,
    marginBottom: 0,
    textAlign: "center",
  },
  description: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: "center",
  },
  error: {
    marginBottom: 8,
  },
});
