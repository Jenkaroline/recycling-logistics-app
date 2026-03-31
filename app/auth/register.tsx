import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { View, Text } from "react-native";
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
    <View style={{ padding: 20 }}>
      <Text style={{ 
          fontSize: 24, 
          fontWeight: 'bold', 
          marginBottom: 12, 
          marginTop: 50, 
          textAlign: 'center' 
        }}> 
        Cadastro
      </Text>
      <TextInput
        label="Nome de Usuário"
        value={username}
        onChangeText={setUsername}
        style={{ marginBottom: 16, borderRadius: 16, backgroundColor: '#fff' }}
        mode="outlined"
        outlineStyle={{ borderRadius: 16 }}
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={{ marginBottom: 16, borderRadius: 16, backgroundColor: '#fff' }}
        mode="outlined"
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
        style={{ marginBottom: 16, borderRadius: 16, backgroundColor: '#fff' }}
        mode="outlined"
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
        style={{ marginBottom: 16, borderRadius: 16, backgroundColor: '#fff' }}
        mode="outlined"
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
      <Button mode="contained" onPress={handleRegister}>
        Registrar
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.navigate("Login")}
        style={{ marginTop: 12 }}
      >
        Já tem uma conta? Login
      </Button>
    </View>
  );
}
