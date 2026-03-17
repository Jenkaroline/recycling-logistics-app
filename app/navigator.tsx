import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { signOut } from "firebase/auth";
import React from "react";
import { Alert, Text, View } from "react-native";
import { auth } from "../service/firebaseConfig";
import LoginScreen from "./auth/login";
import RegisterScreen from "./auth/register";
import VerifyEmailScreen from "./auth/verifyEmail";
import HomeScreen from "./home";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function SettingsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Configurações</Text>
    </View>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Sair"
        onPress={async () => {
          Alert.alert("Sair", "Deseja realmente sair da conta?", [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Sair",
              style: "destructive",
              onPress: async () => {
                await signOut(auth);
                props.navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              },
            },
          ]);
        }}
      />
    </DrawerContentScrollView>
  );
}

function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        drawerActiveBackgroundColor: '#9f7ab0',
        drawerActiveTintColor: '#ffffff'
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Configurações" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={AppDrawer}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
