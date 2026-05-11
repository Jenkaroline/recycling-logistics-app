import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Alert } from "react-native";
import { Button, TextInput, Card } from "react-native-paper";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import {
  sendPhoneEnrollmentCode,
  enrollPhoneNumber,
} from "../../src/TwoFactorAuthService";
import { firebaseConfig } from "../../service/firebaseConfig";

type RootStackParamList = {
  EnrollPhone: undefined;
  VerifyEmailEnroll: undefined;
  Main: undefined;
};

export default function EnrollPhoneScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { darkModeEnabled } = useThemePreference();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const recaptchaVerifier = useRef<any>(null);

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        textPrimary: "#ffffff",
        inputBg: "#e8f2ff",
        inputText: "#0a2740",
        inputBorder: "#5b7ea6",
        link: "#b7cde6",
        card: "#0f2a3d",
      }
    : {
        bg: "#f4f8fc",
        textPrimary: "#1d3750",
        inputBg: "#ffffff",
        inputText: "#1f3346",
        inputBorder: "#96aec6",
        link: "#5d748b",
        card: "#ffffff",
      };

  const handleSendCode = async () => {
    setError("");
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setError("Insira um número de telefone válido com DDD");
      return;
    }

    setIsLoading(true);
    try {
      await sendPhoneEnrollmentCode(phoneNumber, recaptchaVerifier.current);
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Erro ao enviar código. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    setError("");
    if (!smsCode.trim() || smsCode.length < 6) {
      setError("Insira o código de 6 dígitos");
      return;
    }

    setIsLoading(true);
    try {
      await enrollPhoneNumber(smsCode);
      Alert.alert(
        "Sucesso!",
        "Autenticação de dois fatores ativada com sucesso!"
      );
      navigation.navigate("Main");
    } catch (err: any) {
      setError(err.message || "Código inválido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Pular 2FA?",
      "Você pode ativar depois nas configurações da conta.",
      [
        { text: "Cancelar", onPress: () => {} },
        { text: "Pular", onPress: () => navigation.navigate("Main") },
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: palette.bg },
      ]}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification
      />
      <Card style={[styles.card, { backgroundColor: palette.card }]}>
        <Card.Content>
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            Segurança Adicional
          </Text>
          <Text style={[styles.description, { color: palette.link }]}>
            Ative a autenticação de dois fatores para proteger sua conta
          </Text>

          {step === "phone" ? (
            <>
              <TextInput
                label="Número de Telefone"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="(11) 99999-9999"
                keyboardType="phone-pad"
                editable={!isLoading}
                style={[styles.input, { backgroundColor: palette.inputBg }]}
                mode="outlined"
                activeOutlineColor="#36a3ff"
                outlineColor={palette.inputBorder}
                textColor={palette.inputText}
                theme={{
                  colors: { primary: "#36a3ff", onSurfaceVariant: "#365a7d" },
                }}
                outlineStyle={{ borderRadius: 16 }}
              />

              {error && (
                <Text style={[styles.error, { color: "#ff6b6b" }]}>
                  {error}
                </Text>
              )}

              <Button
                mode="contained"
                buttonColor="#36a3ff"
                textColor="#032746"
                onPress={handleSendCode}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
              >
                Enviar Código
              </Button>
            </>
          ) : (
            <>
              <Text style={[styles.info, { color: palette.textPrimary }]}>
                Código enviado para: {phoneNumber}
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
                theme={{
                  colors: { primary: "#36a3ff", onSurfaceVariant: "#365a7d" },
                }}
                outlineStyle={{ borderRadius: 16 }}
              />

              {error && (
                <Text style={[styles.error, { color: "#ff6b6b" }]}>
                  {error}
                </Text>
              )}

              <Button
                mode="contained"
                buttonColor="#36a3ff"
                textColor="#032746"
                onPress={handleConfirmCode}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
              >
                Confirmar
              </Button>

              <Button
                mode="text"
                textColor="#36a3ff"
                onPress={() => {
                  setStep("phone");
                  setError("");
                }}
              >
                Voltar
              </Button>
            </>
          )}

          <Button
            mode="text"
            textColor={palette.link}
            onPress={handleSkip}
            disabled={isLoading}
          >
            Pular por enquanto
          </Button>
        </Card.Content>
      </Card>

      <Card style={[styles.infoCard, { backgroundColor: palette.card }]}>
        <Card.Content>
          <Text style={[styles.infoTitle, { color: palette.textPrimary }]}>
            ℹ️ Por que usar 2FA?
          </Text>
          <Text style={[styles.infoText, { color: palette.link }]}>
            Mesmo se alguém descobrir sua senha, não conseguirá acessar sem o
            código SMS único enviado para seu telefone.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  card: {
    marginBottom: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  info: {
    fontSize: 14,
    marginBottom: 15,
    fontWeight: "500",
  },
  error: {
    fontSize: 14,
    marginBottom: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  infoCard: {
    borderRadius: 16,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
