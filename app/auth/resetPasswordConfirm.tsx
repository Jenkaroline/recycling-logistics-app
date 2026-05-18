import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { StackScreenProps } from "@react-navigation/stack";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../../service/firebaseConfig";
import { translateFirebaseError } from "../../src/firebaseErrorMapper";
import { useThemePreference } from "../../src/ThemePreferenceContext";
import ErrorMessage from "../components/ErrorMessage";

type Props = StackScreenProps<any, any>;

export default function ResetPasswordConfirmScreen({ route, navigation }: Props) {
  const { darkModeEnabled } = useThemePreference();
  const [oobCode, setOobCode] = useState<string | undefined>(
    (route?.params as any)?.oobCode
  );
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (oobCode) {
      // verify the code and get email
      verifyPasswordResetCode(auth, oobCode)
        .then((emailAddr) => setEmail(emailAddr))
        .catch((err) => setError(translateFirebaseError(err)));
    }
  }, [oobCode]);

  const handleConfirm = async () => {
    setError("");
    if (!oobCode) {
      setError("Código de redefinição inválido. Cole o link completo ou o código.");
      return;
    }
    const isStrongPassword = (s: string) => {
      return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(s);
    };
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError(
        "A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (err: any) {
      setError(translateFirebaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const palette = darkModeEnabled
    ? { bg: "#061526", text: "#fff", accent: "#36a3ff", inputBg: "#e8f2ff" }
    : { bg: "#f4f8fc", text: "#1d3750", accent: "#36a3ff", inputBg: "#fff" };

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}> 
      <Text style={[styles.title, { color: palette.text }]}>Redefinir senha</Text>
      {error ? <ErrorMessage message={error} /> : null}
      {email ? <Text style={[styles.info, { color: palette.text }]}>Redefinindo senha para {email}</Text> : null}

      <TextInput
        label="Código/O link (se necessário)"
        value={oobCode || ""}
        onChangeText={(t) => setOobCode(t)}
        style={[styles.input, { backgroundColor: palette.inputBg }]}
      />

      <TextInput
        label="Nova senha"
        value={newPassword}
        onChangeText={(t) => setNewPassword(t)}
        secureTextEntry
        style={[styles.input, { backgroundColor: palette.inputBg }]}
      />

      <TextInput
        label="Confirmar nova senha"
        value={confirmPassword}
        onChangeText={(t) => setConfirmPassword(t)}
        secureTextEntry
        style={[styles.input, { backgroundColor: palette.inputBg }]}
      />

      <Button mode="contained" onPress={handleConfirm} loading={isSubmitting} disabled={isSubmitting} buttonColor={palette.accent}>
        Atualizar senha
      </Button>

      {isSubmitting && (
        <View style={[styles.overlay, { backgroundColor: darkModeEnabled ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)' }]} pointerEvents="auto">
          <ActivityIndicator size={48} color={palette.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  input: { marginBottom: 12 },
  info: { textAlign: "center", marginBottom: 8 },
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
