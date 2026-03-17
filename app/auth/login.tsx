import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { auth } from "../../service/firebaseConfig";

// Defina os nomes das rotas do seu Stack
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  VerifyEmail: undefined;
};

export default function LoginScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (userCredential.user && !userCredential.user.emailVerified) {
        alert("Por favor, verifique seu e-mail antes de acessar o app.");
        navigation.navigate("VerifyEmail");
        return;
      }
      navigation.navigate("Main");
    } catch (error) {
      alert((error as any).message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 12,
          marginTop: 0,
          textAlign: "center",
        }}
      >
        Login
      </Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={{ marginBottom: 16, borderRadius: 16, backgroundColor: "#fff" }}
        mode="outlined"
        outlineStyle={{ borderRadius: 16 }}
      />
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        right={
          <TextInput.Icon
            icon={showPassword ? "eye-off" : "eye"}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        style={{ marginBottom: 16, borderRadius: 16, backgroundColor: "#fff" }}
        mode="outlined"
        outlineStyle={{ borderRadius: 16 }}
      />
      <Button mode="contained" onPress={handleLogin}>
        Entrar
      </Button>
      <Button onPress={() => navigation.navigate("Register")}>
        Criar conta
      </Button>
    </View>
  );
}
