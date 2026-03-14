import React, { useState } from "react";
import { View } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../service/firebaseConfig";
import { useRouter } from "expo-router";

export default function RegisterScreen() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/");
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
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button mode="contained" onPress={handleRegister}>
        Registrar
      </Button>
    </View>
  );
}
