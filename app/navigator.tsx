import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import { onAuthStateChanged, reload } from "firebase/auth";
import { useSocial } from "../src/SocialContext";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { Image } from "react-native";

import MapsScreen from "./maps";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { signOut } from "firebase/auth";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../service/firebaseConfig";
import { PlasticCategoriesProvider } from "../src/PlasticCategoriesContext";
import { PlasticConsumptionProvider } from "../src/PlasticConsumptionContext";
import { RecyclingCompetitionProvider } from "../src/RecyclingCompetitionContext";
import { RecyclingProvider } from "../src/RecyclingContext";
import { RecyclingTypesProvider } from "../src/RecyclingTypesContext";
import { SocialProvider } from "../src/SocialContext";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "../src/ThemePreferenceContext";
import { toLocalDayKey, useCurrentDayKey } from "../src/useCurrentDayKey";
import LoginScreen from "./auth/login";
import RegisterScreen from "./auth/register";
import VerifyEmailScreen from "./auth/verifyEmail";
import ResetPasswordScreen from "./auth/resetPassword";
import ResetPasswordConfirmScreen from "./auth/resetPasswordConfirm";
import MeusGruposScreen from "./myGroups.tsx";
import HomeScreen from "./home";
import RecordsScreen from "./records";
import NotificationsScreen from "../src/NotificationsScreen";
import SettingsScreen from "./settings";
import StatisticsScreen from "./statistics";
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { darkModeEnabled } = useThemePreference();
  const currentDayKey = useCurrentDayKey();
  const { currentProfile } = useSocial();
  const { entries } = usePlasticConsumption();

  const todayCount = React.useMemo(() => {
    return entries.filter((entry) => toLocalDayKey(entry.createdAt) === currentDayKey).length;
  }, [entries, currentDayKey]);

  const palette = darkModeEnabled
    ? {
        header: "#2a2f36",
        textMuted: "#7f98b1",
        textPrimary: "#9fb3c7",
        textAccent: "#a9c0d9",
        iconInactive: "#9fb3c7",
        iconActive: "#c7d8ea",
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
        iconInactive: "#385065",
        iconActive: "#24435f",
        activeBg: "#d8e6f3",
        surface: "#f4f8fc",
        dangerText: "#8d4c55",
        dangerBg: "#f3dfe2",
      };

  const openMainScreen = (screen: string, params?: Record<string, unknown>) => {
    (props.navigation as any).navigate(screen, params);
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
        backgroundColor: palette.surface || (darkModeEnabled ? "#061526" : "#f4f8fc"),
      }}
    >
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {currentProfile?.avatarUrl ? (
            <Image source={{ uri: currentProfile.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 12 }} />
          ) : (
            <Image source={require("../assets/images/logo-ciclo.png")} style={{ width: 56, height: 56, borderRadius: 12 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "800" }}>{currentProfile?.username || "Você"}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{todayCount} registros hoje</Text>
          </View>
          <TouchableOpacity onPress={() => openSettings()} style={{ padding: 6 }}>
            <Ionicons name="settings-outline" size={20} color={palette.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 8 }}>
        <DrawerItem
          label="Início"
          onPress={() => openMainScreen("Home")}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.iconInactive}
          icon={({ color, size }) => <Ionicons name="home-outline" size={size} color={color || palette.iconInactive} />}
          activeBackgroundColor={palette.activeBg}
          labelStyle={{ color: palette.textPrimary, fontSize: 15, fontWeight: "700" }}
          style={{ borderRadius: 10, marginBottom: 6 }}
        />

        <DrawerItem
          label="Registros"
          onPress={openRecords}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.iconInactive}
          labelStyle={{ color: palette.textPrimary, fontSize: 15, fontWeight: "700" }}
          style={{ borderRadius: 10, marginBottom: 6 }}
          icon={({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color || palette.iconInactive} />}
        />

        <DrawerItem
          label="Mapas"
          onPress={() => openMainScreen("Mapas")}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.iconInactive}
          labelStyle={{ color: palette.textPrimary, fontSize: 15, fontWeight: "700" }}
          style={{ borderRadius: 10, marginBottom: 6 }}
          icon={({ color, size }) => <Ionicons name="map-outline" size={size} color={color || palette.iconInactive} />}
        />
      </View>

      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: palette.header, paddingTop: 8, paddingHorizontal: 8 }}>
        <DrawerItem
          label="Meus grupos"
          onPress={() => (props.navigation as any).navigate("MeusGrupos")}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.iconInactive}
          labelStyle={{ color: palette.textPrimary, fontSize: 15, fontWeight: "700" }}
          style={{ borderRadius: 10, marginBottom: 6 }}
          icon={({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color || palette.iconInactive} />}
        />

        <DrawerItem
          label="Notificações"
          onPress={() => (props.navigation as any).navigate("Notificações")}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.iconInactive}
          labelStyle={{ color: palette.textPrimary, fontSize: 15, fontWeight: "700" }}
          style={{ borderRadius: 10, marginBottom: 6 }}
          icon={({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color || palette.iconInactive} />}
        />

        <DrawerItem
          label="Configurações"
          onPress={() => openSettings({ section: undefined })}
          activeTintColor={palette.textAccent}
          inactiveTintColor={palette.iconInactive}
          labelStyle={{ color: palette.textPrimary, fontSize: 15, fontWeight: "700" }}
          style={{ borderRadius: 10, marginBottom: 6 }}
          icon={({ color, size }) => <Ionicons name="settings-outline" size={size} color={color || palette.iconInactive} />}
        />

        <DrawerItem
          label="Sair"
          activeTintColor={palette.dangerText}
          inactiveTintColor={palette.dangerText}
          activeBackgroundColor={palette.dangerBg}
          labelStyle={{ color: palette.dangerText, fontSize: 15, fontWeight: "700" }}
          style={{ borderRadius: 10, marginBottom: 6 }}
          icon={({ size, color }) => <Ionicons name="log-out-outline" size={size} color={color} />}
          onPress={async () => {
            Alert.alert("Sair", "Deseja realmente sair da conta?", [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Sair",
                style: "destructive",
                onPress: async () => {
                  props.navigation.closeDrawer();
                  await signOut(auth);
                  props.navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                },
              },
            ]);
          }}
        />
      </View>
    </DrawerContentScrollView>
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
      id="MainDrawer"
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        drawerType: "back",
        swipeEnabled: false,
        overlayColor: "transparent",
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
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: "Home", drawerItemStyle: { display: "none" } }} />
      <Drawer.Screen name="Estatísticas" component={StatisticsScreen} options={{ title: "Estatísticas", drawerItemStyle: { display: "none" } }} />
      <Drawer.Screen name="Mapas" component={MapsScreen} options={{ title: "Mapas", drawerItemStyle: { display: "none" } }} />
      <Drawer.Screen
        name="Configuracoes"
        component={SettingsScreen}
        options={{
          title: "Configurações",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="MeusGrupos"
        component={MeusGruposScreen}
        options={{
          title: "Meus grupos",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="Notificações"
        component={NotificationsScreen}
        options={{
          title: "Notificações",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="Registros"
        component={RecordsScreen}
        options={({ navigation }) => ({
            title: "Registros",
            headerShown: false,
          drawerItemStyle: { display: "none" },
        })}
      />
    </Drawer.Navigator>
  );
}

function AppGate() {
  const [currentUser, setCurrentUser] = React.useState(auth.currentUser);
  const [authReady, setAuthReady] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await reload(user);
        } catch {
          // keep the current snapshot if reload fails
        }
        setCurrentUser(auth.currentUser ?? user);
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  if (!authReady) {
    return null;
  }

  const initialRouteName = currentUser?.emailVerified
    ? "Main"
    : currentUser
      ? "VerifyEmail"
      : "Login";

  return (
    <Stack.Navigator
      key={currentUser ? (currentUser.emailVerified ? "main" : "verify") : "auth"}
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ResetPasswordConfirm"
        component={ResetPasswordConfirmScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Main" component={AppDrawer} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <ThemePreferenceProvider>
      <PlasticCategoriesProvider>
        <PlasticConsumptionProvider>
          <RecyclingProvider>
            <RecyclingTypesProvider>
              <SocialProvider>
                <RecyclingCompetitionProvider>
                  <AppGate />
                </RecyclingCompetitionProvider>
              </SocialProvider>
            </RecyclingTypesProvider>
          </RecyclingProvider>
        </PlasticConsumptionProvider>
      </PlasticCategoriesProvider>
    </ThemePreferenceProvider>
  );
}
