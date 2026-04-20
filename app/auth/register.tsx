import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
} from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { auth } from "../../service/firebaseConfig";
import { useThemePreference } from "../../src/ThemePreferenceContext";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: undefined;
  EnrollPhone: undefined;
};
export default function RegisterScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { darkModeEnabled } = useThemePreference();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleRegister = async () => {
    setError("");
    if (!username.trim()) {
      setError("Nome de usuário é obrigatório!");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (userCredential.user) {
        const db = getFirestore();
        await updateProfile(userCredential.user, {
          displayName: username.trim(),
        });

        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          username: username.trim(),
          email: email,
          avatarUrl: "",
          bio: "",
          followersCount: 0,
          followingCount: 0,
          createdAt: serverTimestamp(),
        });
        await sendEmailVerification(userCredential.user);
        navigation.navigate("VerifyEmail");
      }
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setError("Este e-mail já está em uso.");
      } else {
        setError(error.message);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>Cadastro</Text>
      <TextInput
        label="Nome de Usuário"
        value={username}
        onChangeText={setUsername}
        style={[styles.input, { backgroundColor: palette.inputBg }]}
        mode="outlined"
        activeOutlineColor="#36a3ff"
        outlineColor={palette.inputBorder}
        textColor={palette.inputText}
        theme={{ colors: { primary: "#36a3ff", onSurfaceVariant: "#365a7d" } }}
        outlineStyle={{ borderRadius: 16 }}
      />
      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
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
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
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
      <TextInput
        label="Confirmar Senha"
        secureTextEntry={!showPassword}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
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
      {error ? (
        <View style={{ marginVertical: 8 }}>
          <Button
            disabled
            color="red"
            style={{ backgroundColor: "transparent", elevation: 0 }}
          >
            {error}
          </Button>
        </View>
      ) : null}
      <Button
        mode="contained"
        buttonColor="#36a3ff"
        textColor="#032746"
        onPress={handleRegister}
      >
        Registrar
      </Button>
      <Button
        mode="text"
        textColor={palette.link}
        onPress={() => navigation.navigate("Login")}
        style={{ marginTop: 12 }}
      >
        Já tem uma conta? Login
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
});
