import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { auth } from "../../service/firebaseConfig";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: undefined;
};

export default function RegisterScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          username: username.trim(),
          email: email,
          createdAt: new Date(),
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
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>
      <TextInput
        label="Nome de Usuário"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        mode="outlined"
        activeOutlineColor="#36a3ff"
        outlineColor="#5b7ea6"
        textColor="#0a2740"
        theme={{ colors: { primary: "#36a3ff", onSurfaceVariant: "#365a7d" } }}
        outlineStyle={{ borderRadius: 16 }}
      />
      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        mode="outlined"
        activeOutlineColor="#36a3ff"
        outlineColor="#5b7ea6"
        textColor="#0a2740"
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
        style={styles.input}
        mode="outlined"
        activeOutlineColor="#36a3ff"
        outlineColor="#5b7ea6"
        textColor="#0a2740"
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
        style={styles.input}
        mode="outlined"
        activeOutlineColor="#36a3ff"
        outlineColor="#5b7ea6"
        textColor="#0a2740"
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
        textColor="#b7cde6"
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
    backgroundColor: "#061526",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 50,
    textAlign: "center",
    color: "#ffffff",
  },
  input: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#e8f2ff",
  },
});
