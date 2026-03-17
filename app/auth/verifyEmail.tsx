import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { reload, sendEmailVerification } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { Button } from "react-native-paper";
import { Ionicons } from '@expo/vector-icons';
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
    } catch (e) {
      setError("Erro ao checar verificação.");
    }
    setChecking(false);
  };

  useEffect(() => {
    setCanResend(true);
  }, []);

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', left: 0 }} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={28} color="#222" />
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Verificar E-mail</Text>
      </View>
      <Text style={{ fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
        Um e-mail de verificação foi enviado para {user?.email}. Por favor,
        verifique seu e-mail para continuar.
      </Text>
      {error ? (
        <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text>
      ) : null}
      <Button
        mode="contained"
        onPress={handleCheckVerification}
        loading={checking}
      >
        Já verifiquei meu e-mail
      </Button>
      <Button
        mode="text"
        onPress={handleSendVerification}
        disabled={!canResend}
        style={{ marginTop: 8 }}
      >
        Reenviar e-mail
      </Button>
    </View>
  );
}
