import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";

import MapsScreen from "@/app/maps";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { signOut } from "firebase/auth";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../service/firebaseConfig";
import { PlasticCategoriesProvider } from "../src/PlasticCategoriesContext";
import { PlasticConsumptionProvider } from "../src/PlasticConsumptionContext";
import { SocialProvider } from "../src/SocialContext";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "../src/ThemePreferenceContext";
import LoginScreen from "./auth/login";
import RegisterScreen from "./auth/register";
import VerifyEmailScreen from "./auth/verifyEmail";
import CommunityScreen from "./community";
import HomeScreen from "./home";
import MissionsScreen from "./missions";
import RecordsScreen from "./records";
import NotificationsScreen from "./notifications";
import SettingsScreen from "./settings";
import StatisticsScreen from "./statistics";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        header: "#2a2f36",
        textMuted: "#7f98b1",
        textPrimary: "#9fb3c7",
        textAccent: "#a9c0d9",
        activeBg: "#102a40",
        surface: "#061526",
        dangerText: "#d3a3a5",
        dangerBg: "#2a1d1d",
      }
    : {
        header: "#d0deed",
        textMuted: "#4f6477",
        textPrimary: "#385065",
        textAccent: "#24435f",
        activeBg: "#d8e6f3",
        surface: "#f4f8fc",
        dangerText: "#8d4c55",
        dangerBg: "#f3dfe2",
      };

  const openMainTab = (screen: "Mapas", params?: Record<string, unknown>) => {
    (props.navigation as any).navigate("MainTabs", { screen, params });
  };

  const openRecords = () => {
    (props.navigation as any).navigate("Registros");
  };

  const openSettings = (params?: Record<string, unknown>) => {
    (props.navigation as any).navigate("Configuracoes", params);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "flex-start",
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 6),
      }}
    >
      <View style={{ paddingHorizontal: 0 }}>
        <View
          style={{
            height: 1,
            backgroundColor: palette.header,
            marginHorizontal: 16,
            marginBottom: 10,
          }}
        />
        <Text
          style={{
            color: palette.textMuted,
            fontSize: 13,
            letterSpacing: 0.8,
            marginHorizontal: 16,
            marginBottom: 4,
          }}
        >
          ACOES
        </Text>
        <DrawerItem
          label="Mapa"
          onPress={() => openMainTab("Mapas")}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.textPrimary}
          activeBackgroundColor={palette.activeBg}
          labelStyle={{
            color: palette.textPrimary,
            fontSize: 16,
            fontWeight: "600",
          }}
          style={{
            borderRadius: 10,
            marginHorizontal: 8,
            marginBottom: 2,
            backgroundColor: "transparent",
          }}
          icon={({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          )}
        />
        <DrawerItem
          label="Registros"
          onPress={openRecords}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.textPrimary}
          activeBackgroundColor={palette.activeBg}
          labelStyle={{
            color: palette.textPrimary,
            fontSize: 16,
            fontWeight: "600",
          }}
          style={{
            borderRadius: 10,
            marginHorizontal: 8,
            marginBottom: 2,
            backgroundColor: "transparent",
          }}
          icon={({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          )}
        />
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: palette.header,
          paddingTop: 4,
          marginHorizontal: 0,
        }}
      >
        <Text
          style={{
            color: palette.textMuted,
            fontSize: 13,
            letterSpacing: 0.8,
            marginHorizontal: 16,
            marginBottom: 4,
          }}
        >
          CONTA
        </Text>
        <DrawerItem
          label="Configurações"
          onPress={() => openSettings({ section: undefined })}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.textPrimary}
          activeBackgroundColor={palette.activeBg}
          labelStyle={{
            color: palette.textPrimary,
            fontSize: 16,
            fontWeight: "600",
          }}
          style={{
            borderRadius: 10,
            marginHorizontal: 8,
            marginBottom: 2,
            backgroundColor: "transparent",
          }}
          icon={({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          )}
        />
        <DrawerItem
          label="Sair"
          activeTintColor={palette.dangerText}
          inactiveTintColor={palette.dangerText}
          activeBackgroundColor={palette.dangerBg}
          labelStyle={{
            color: palette.dangerText,
            fontSize: 16,
            fontWeight: "600",
          }}
          style={{
            borderRadius: 10,
            marginHorizontal: 8,
            backgroundColor: "transparent",
            borderWidth: 0,
          }}
          icon={({ size, color }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          )}
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
      </View>
    </DrawerContentScrollView>
  );
}

function BottomTabNavigator() {
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        headerBg: "#0c2740",
        headerText: "#eaf4ff",
        tabBg: "#0a2238",
        tabBorder: "#123252",
        active: "#36a3ff",
        inactive: "#9ab6d3",
      }
    : {
        headerBg: "#f4f8fc",
        headerText: "#1a3551",
        tabBg: "#e8f0f8",
        tabBorder: "#c8d8e8",
        active: "#1f6fb2",
        inactive: "#5e768d",
      };

  return (
    <BottomTab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: palette.headerBg },
        headerTintColor: palette.headerText,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "800",
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Ionicons name="menu" size={24} color={palette.headerText} />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: palette.tabBg,
          borderTopColor: palette.tabBorder,
          paddingHorizontal: 0,
          marginHorizontal: 0,
          paddingLeft: 0,
          paddingRight: 0,
          columnGap: 0,
        },
        tabBarItemStyle: {
          flexGrow: route.name === "Mapas" ? 0 : 1,
          flexBasis: route.name === "Mapas" ? 0 : 0,
          marginHorizontal: 0,
          marginVertical: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
          borderRadius: 0,
          alignItems: "stretch",
          minWidth: 0,
          display: route.name === "Mapas" ? "none" : "flex",
        },
        tabBarIconStyle: { margin: 0 },
        tabBarLabelStyle: { margin: 0, padding: 0 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Missões") {
            iconName = focused ? "flag" : "flag-outline";
          } else if (route.name === "Estatísticas") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "Notificações") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "Mapas") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Amigos") {
            iconName = focused ? "people" : "people-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: palette.active,
        tabBarInactiveTintColor: palette.inactive,
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
        name="Estatísticas"
        component={StatisticsScreen}
        options={{ title: "Estatísticas" }}
      />
      <BottomTab.Screen
        name="Notificações"
        component={NotificationsScreen}
        options={{ title: "Notificações" }}
      />
      <BottomTab.Screen
        name="Amigos"
        component={CommunityScreen}
        options={{ title: "Amigos" }}
      />
      <BottomTab.Screen
        name="Mapas"
        component={MapsScreen}
        options={{ title: "Mapas", tabBarButton: () => null }}
      />
    </BottomTab.Navigator>
  );
}

function AppDrawer() {
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        drawerText: "#9fb3c7",
        drawerInactive: "#8fa5bc",
        drawerActiveBg: "#102a40",
        drawerActiveText: "#a9c0d9",
        drawerBg: "#061526",
        headerBg: "#0c2740",
        headerText: "#eaf4ff",
      }
    : {
        drawerText: "#3b536a",
        drawerInactive: "#5c748b",
        drawerActiveBg: "#d8e6f3",
        drawerActiveText: "#24435f",
        drawerBg: "#f4f8fc",
        headerBg: "#f4f8fc",
        headerText: "#1a3551",
      };

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerLabelStyle: {
          color: palette.drawerText,
          fontSize: 16,
          fontWeight: "600",
        },
        drawerInactiveTintColor: palette.drawerInactive,
        drawerActiveBackgroundColor: palette.drawerActiveBg,
        drawerActiveTintColor: palette.drawerActiveText,
        drawerStyle: { backgroundColor: palette.drawerBg },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{
          title: "App",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="Configuracoes"
        component={SettingsScreen}
        options={{
          title: "Configurações",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="Registros"
        component={RecordsScreen}
        options={({ navigation }) => ({
          title: "Registros",
          headerShown: true,
          headerStyle: { backgroundColor: palette.headerBg },
          headerTintColor: palette.headerText,
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "800",
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons
                name="menu"
                size={24}
                color={palette.headerText}
              />
            </TouchableOpacity>
          ),
          drawerItemStyle: { display: "none" },
        })}
      />
    </Drawer.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <ThemePreferenceProvider>
      <PlasticCategoriesProvider>
        <PlasticConsumptionProvider>
          <SocialProvider>
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
          </SocialProvider>
        </PlasticConsumptionProvider>
      </PlasticCategoriesProvider>
    </ThemePreferenceProvider>
  );
}
