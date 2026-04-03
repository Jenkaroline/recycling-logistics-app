import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
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
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
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
      <Button
        mode="contained"
        buttonColor="#36a3ff"
        textColor="#032746"
        onPress={handleLogin}
      >
        Entrar
      </Button>
      <Button
        textColor="#b7cde6"
        onPress={() => navigation.navigate("Register")}
      >
        Criar conta
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
