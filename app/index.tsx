import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { auth } from "../service/firebaseConfig";
import { useRouter } from "expo-router";

export default function LoginScreen() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);


  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (error) {
      alert((error as any).message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
      />

      <Button mode="contained" onPress={handleLogin}>
        Entrar
      </Button>

      <Button onPress={() => router.push("/auth/register")}>
        Criar conta
      </Button>
    </View>
  );
}
