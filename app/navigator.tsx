import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";

import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { signOut } from "firebase/auth";
import React from "react";
import { Alert } from "react-native";
import { auth } from "../service/firebaseConfig";
import { PlasticCategoriesProvider } from "../src/PlasticCategoriesContext";
import { PlasticConsumptionProvider } from "../src/PlasticConsumptionContext";
import LoginScreen from "./auth/login";
import RegisterScreen from "./auth/register";
import VerifyEmailScreen from "./auth/verifyEmail";
import HomeScreen from "./home";
import MapsScreen from "@/app/maps";
import MissionsScreen from "./missions";
import SettingsScreen from "./settings";
import StatisticsScreen from "./statistics";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();

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

function BottomTabNavigator() {
  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: "#0c2740" },
        headerTintColor: "#eaf4ff",
        tabBarStyle: { backgroundColor: "#0a2238", borderTopColor: "#123252" },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Missões") {
            iconName = focused ? "flag" : "flag-outline";
          } else if (route.name === "Estatística") {
            iconName = focused ? "stats-chart" : "stats-chart-outline";
          } else if (route.name === "Mapas") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Perfil") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#36a3ff",
        tabBarInactiveTintColor: "#9ab6d3",
      })}
    >
      <BottomTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />
      <BottomTab.Screen
        name="Missões"
        component={MissionsScreen}
        options={{ title: "Missões" }}
      />
      <BottomTab.Screen
        name="Estatística"
        component={StatisticsScreen}
        options={{ title: "Estatística" }}
      />
      <BottomTab.Screen
        name="Mapas"
        component={MapsScreen}
        options={{ title: "Mapas" }}
      />
      <BottomTab.Screen
        name="Perfil"
        component={SettingsScreen}
        options={{ title: "Perfil" }}
      />
    </BottomTab.Navigator>
  );
}

function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: "#061526" },
        drawerInactiveTintColor: "#b7cde6",
        drawerActiveBackgroundColor: "#123252",
        drawerActiveTintColor: "#ffffff",
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ title: "App" }}
      />
    </Drawer.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <PlasticCategoriesProvider>
      <PlasticConsumptionProvider>
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
      </PlasticConsumptionProvider>
    </PlasticCategoriesProvider>
  );
}
