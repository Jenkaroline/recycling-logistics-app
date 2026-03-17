import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { auth } from "../../service/firebaseConfig";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Só redireciona se o cadastro for bem-sucedido
      router.push("/");
    } catch (error: any) {
      // Personaliza mensagem para e-mail já cadastrado
      if (error.code === "auth/email-already-in-use") {
        setError("Este e-mail já está em uso.");
      } else {
        setError(error.message);
      }
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput label="Email" value={email} onChangeText={setEmail} />

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
      <Button mode="contained" onPress={handleRegister}>
        Registrar
      </Button>
    </View>
  );
}
