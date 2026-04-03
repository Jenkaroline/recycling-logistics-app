import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { reload, sendEmailVerification } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "react-native-paper";
import { auth } from "../../service/firebaseConfig";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: undefined;
};

export default function VerifyEmailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [canResend, setCanResend] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const user = auth.currentUser;

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
    <View style={styles.container}>
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
          <Ionicons name="arrow-back" size={28} color="#eaf4ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Verificar E-mail</Text>
      </View>
      <Text style={styles.description}>
        Um e-mail de verificação foi enviado para {user?.email}. Por favor,
        verifique seu e-mail para continuar.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
        textColor="#b7cde6"
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
    backgroundColor: "#061526",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 50,
    textAlign: "center",
    color: "#ffffff",
  },
  description: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: "center",
    color: "#b7cde6",
  },
  error: {
    color: "#ff8a8a",
    marginBottom: 8,
  },
});
