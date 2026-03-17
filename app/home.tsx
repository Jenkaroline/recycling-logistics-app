import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React from "react";
import { Alert, Text, View } from "react-native";
import { Button } from "react-native-paper";
import { auth } from "../service/firebaseConfig";

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Confirmar Saída", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", onPress: () => {
          router.replace("/");
          auth.signOut();
        }
      }
    ]);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Bem-vindo à Home!</Text>
      <Button mode="contained" onPress={handleLogout}>
        Sair
      </Button>
    </View>
  );
}
