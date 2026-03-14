import React from "react";
import { View, Text } from "react-native";
import { Button } from "react-native-paper";
import { signOut } from "firebase/auth";
import { auth } from "../../service/firebaseConfig";
import { useRouter } from "expo-router";

export default function HomeScreen() {

  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/home");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Usuário logado</Text>

      <Button mode="contained" onPress={handleLogout}>
        Sair
      </Button>
    </View>
  );
}
