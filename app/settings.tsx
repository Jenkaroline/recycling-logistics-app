import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useNavigation, useRoute, DrawerActions } from "@react-navigation/native";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Alert,
  Linking,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, Line, LinearGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { auth, db } from "../service/firebaseConfig";
import { translateFirebaseError } from "../src/firebaseErrorMapper";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { toLocalDayKey, useCurrentDayKey } from "../src/useCurrentDayKey";

type ActivePanel = "none" | "settings" | "statistics";
type DashboardRange = "week" | "month" | "year";
type InsightFocus = "week" | "month" | "next";

type BarSegment = {
  key: string;
  label: string;
  detail: string;
  grams: number;
  start: Date;
  end: Date;
  categories: Array<{ label: string; value: number; icon?: string }>;
};

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthPart] = month.split("-");
  return `${monthPart}/${year.slice(2)}`;
}

function shortMonthLabel(date: Date) {
  return [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ][date.getMonth()];
}

function shortWeekday(date: Date) {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][date.getDay()];
}

function bucketLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function trendTone(delta: number) {
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

function trendMessage(tone: ReturnType<typeof trendTone>) {
  if (tone === "positive")
    return "Semana no modo turbo. Você subiu o nível sem pedir licença.";
  if (tone === "negative")
    return "A semana deu uma leve derrapada. Nada que um ajuste de rota não resolva.";
  return "Ritmo estável. Sem drama, sem susto, sem novela.";
}

export default function SettingsScreen() {
  const { entries, totalGrams } = usePlasticConsumption();
  const { currentProfile, myPosts, updateProfilePhoto } = useSocial();
  const { darkModeEnabled, setDarkModeEnabled } = useThemePreference();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const drawerNavigation = navigation.getParent?.("MainDrawer") || navigation.getParent?.();
  const drawerOpen = false;
  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#9ab6d3",
        textSoft: "#d7ebff",
        switchThumb: "#eaf4ff",
        switchOn: "#2f77b4",
        switchOff: "#6a7f96",
        dangerPanel: "#2b1821",
        dangerBorder: "#5f3140",
        dangerText: "#fca5a5",
        dangerSubtext: "#e9b9c3",
        modalPanel: "#0c2740",
        modalInput: "#e8f2ff",
        statsPanel: "#0e0e0e",
        statsPanelAlt: "#1f1f1f",
        statsBorder: "#2b2b2b",
        statsBorderAlt: "#2f2f2f",
        statsTextMuted: "#b7b7b7",
        statsTextSubtle: "#d7d7d7",
        segmentBg: "#121212",
        segmentBgActive: "#f5f5f5",
        segmentBorder: "#444444",
        segmentBorderActive: "#ffffff",
        segmentText: "#f4f4f4",
        segmentTextActive: "#000000",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#7690a8",
        textSoft: "#33506b",
        switchThumb: "#f9fcff",
        switchOn: "#2f77b4",
        switchOff: "#b2c5d8",
        dangerPanel: "#fdecef",
        dangerBorder: "#f4c6cf",
        dangerText: "#b3314d",
        dangerSubtext: "#8a4a59",
        modalPanel: "#ffffff",
        modalInput: "#f3f8fd",
        statsPanel: "#ffffff",
        statsPanelAlt: "#f8fbff",
        statsBorder: "#d7e5f2",
        statsBorderAlt: "#dbe8f5",
        statsTextMuted: "#6d8398",
        statsTextSubtle: "#5c748b",
        segmentBg: "#eef4fa",
        segmentBgActive: "#dbe9f6",
        segmentBorder: "#c7d8e8",
        segmentBorderActive: "#89aac7",
        segmentText: "#4e657c",
        segmentTextActive: "#1d3750",
      };
  const { width } = useWindowDimensions();
  const route = useRoute<any>();

  const [activePanel, setActivePanel] = useState<ActivePanel>("none");
  const [statsRange, setStatsRange] = useState<DashboardRange>("month");
  const [insightFocus, setInsightFocus] = useState<InsightFocus>("week");
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [settingsOption, setSettingsOption] = useState<"email" | "username" | "password" | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");

  const stripSpaces = (value: string) => value.replace(/\s+/g, "");

  const sanitizePassword = (s: string) => s || "";

  useEffect(() => {
    setAvatarPreviewUrl(currentProfile?.avatarUrl || "");
  }, [currentProfile?.avatarUrl]);

  const isStrongPassword = (s: string) => {
    return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(s);
  };

  const passwordRequirementsStatus = (s: string) => {
    return {
      length: (s || "").length >= 8,
      upper: /[A-Z]/.test(s || ""),
      lower: /[a-z]/.test(s || ""),
      number: /\d/.test(s || ""),
      special: /[^A-Za-z0-9]/.test(s || ""),
    };
  };

  const getMissingPasswordRequirements = (s: string) => {
    const requirements = passwordRequirementsStatus(s);
    const missing: string[] = [];
    if (!requirements.length) missing.push("pelo menos 8 caracteres");
    if (!requirements.upper) missing.push("uma letra maiúscula");
    if (!requirements.lower) missing.push("uma letra minúscula");
    if (!requirements.number) missing.push("um número");
    if (!requirements.special) missing.push("um caractere especial");
    return missing;
  };
  const consumedSectionRef = React.useRef<string | null>(null);
  const barPositiveColor = darkModeEnabled ? "#2cb67d" : "#17603f";
  const barNegativeColor = darkModeEnabled ? "#ef4444" : "#a61d24";
  const chartLinePrimary = darkModeEnabled ? "#5d7da1" : "#20384f";
  const chartLineSecondary = darkModeEnabled ? "#304d68" : "#3a5169";
  const chartLabelColor = darkModeEnabled ? "#dfeaf4" : "#244057";
  const chartValueColor = darkModeEnabled ? "#ffffff" : "#173047";
  const chartBaseRing = darkModeEnabled ? "#1f1f1f" : "#d8e2eb";

  const closeActivePanel = React.useCallback(() => {
    setActivePanel("none");
  }, []);

  const openSystemSettings = React.useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert("Ajustes indisponíveis", "Não foi possível abrir os ajustes do dispositivo agora.");
    }
  }, []);

  const refreshPermissions = React.useCallback(async () => {
    try {
      const [cameraPermission, locationPermission] = await Promise.all([
        ImagePicker.getCameraPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);

      setCameraPermissionGranted(cameraPermission.granted);
      setLocationPermissionGranted(locationPermission.granted);
    } catch {
      setCameraPermissionGranted(false);
      setLocationPermissionGranted(false);
    }
  }, []);

  const requestCameraPermission = React.useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermissionGranted(permission.granted);
    if (!permission.granted) {
      Alert.alert(
        "Permissão de câmera",
        "A câmera foi negada. Você pode habilitá-la nos ajustes do dispositivo.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir ajustes", onPress: openSystemSettings },
        ],
      );
    }
  }, [openSystemSettings]);

  const requestLocationPermission = React.useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationPermissionGranted(permission.granted);
    if (!permission.granted) {
      Alert.alert(
        "Permissão de localização",
        "A localização foi negada. Você pode habilitá-la nos ajustes do dispositivo.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir ajustes", onPress: openSystemSettings },
        ],
      );
    }
  }, [openSystemSettings]);

  const handlePermissionToggle = React.useCallback(
    async (permissionType: "camera" | "location", enabled: boolean) => {
      if (!enabled) {
        Alert.alert(
          "Gerenciar no sistema",
          "Essa permissão é controlada pelos ajustes do dispositivo. Abra os ajustes para desativá-la ou revogá-la.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Abrir ajustes", onPress: openSystemSettings },
          ],
        );
        return;
      }

      if (permissionType === "camera") {
        await requestCameraPermission();
        return;
      }

      if (permissionType === "location") {
        await requestLocationPermission();
        return;
      }
    },
    [openSystemSettings, requestCameraPermission, requestLocationPermission],
  );

  useEffect(() => {
    void refreshPermissions();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshPermissions();
      }
    });

    return () => subscription.remove();
  }, [refreshPermissions]);

  React.useEffect(() => {
    const section = route.params?.section;
    if (
      (section === "settings" || section === "statistics") &&
      consumedSectionRef.current !== section
    ) {
      setActivePanel(section);
      consumedSectionRef.current = section;
    }
    if (!section) {
      setActivePanel("none");
      consumedSectionRef.current = null;
    }
  }, [route.params?.section]);

  useEffect(() => {
    setSelectedBarKey(null);
  }, [statsRange]);

  const user = auth.currentUser;
  const avatarUrl = avatarPreviewUrl || currentProfile?.avatarUrl || "";
  const fullName =
    currentProfile?.username ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Usuario";
  const memberSince = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR")
    : "Nao disponivel";
  const currentDayKey = useCurrentDayKey();

  const passwordReq = passwordRequirementsStatus(newPassword);

  const todayTotal = useMemo(() => {
    return entries
      .filter((entry) => toLocalDayKey(entry.createdAt) === currentDayKey)
      .reduce((sum, entry) => sum + entry.amountGrams, 0);
  }, [entries, currentDayKey]);

  const dashboard = useMemo(() => {
    const goalPerDay = 50;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const currentStart = new Date(today);
    currentStart.setHours(0, 0, 0, 0);
    if (statsRange === "week") {
      currentStart.setDate(currentStart.getDate() - 6);
    } else if (statsRange === "month") {
      currentStart.setDate(1);
    } else {
      currentStart.setMonth(0, 1);
    }

    const rangeDays = Math.max(
      1,
      Math.floor((today.getTime() - currentStart.getTime()) / 86400000) + 1,
    );

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - rangeDays);

    const normalized = [...entries]
      .map((entry) => ({
        grams: entry.amountGrams,
        date: new Date(entry.createdAt),
        categoryName: entry.categoryName,
        categoryIcon: entry.categoryIcon,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const dailyMap = new Map<string, number>();
    let currentTotal = 0;
    let previousTotal = 0;

    normalized.forEach((item) => {
      if (item.date < previousStart || item.date > today) return;
      const key = dayKey(item.date);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + item.grams);
      if (item.date >= currentStart) currentTotal += item.grams;
      else previousTotal += item.grams;
    });

    const currentAverage = currentTotal / rangeDays;
    const previousAverage = previousTotal / rangeDays;
    const growthPercent =
      previousAverage > 0
        ? ((currentAverage - previousAverage) / previousAverage) * 100
        : 0;

    let aboveGoalDays = 0;
    for (let i = 0; i < rangeDays; i += 1) {
      const date = new Date(currentStart);
      date.setDate(currentStart.getDate() + i);
      const grams = dailyMap.get(dayKey(date)) ?? 0;
      if (grams >= goalPerDay) aboveGoalDays += 1;
    }
    const belowGoalDays = rangeDays - aboveGoalDays;
    const topPercent = Math.max(
      5,
      Math.min(
        99,
        Math.round(
          100 -
            (currentAverage / goalPerDay) * 42 -
            (aboveGoalDays / Math.max(rangeDays, 1)) * 28,
        ),
      ),
    );

    const buildCategories = (start: Date, end: Date) => {
      const grouped = new Map<
        string,
        { label: string; value: number; icon?: string }
      >();
      normalized.forEach((item) => {
        if (item.date < start || item.date > end) return;
        const label = item.categoryName?.trim() || "Sem categoria";
        const current = grouped.get(label) ?? {
          label,
          value: 0,
          icon: item.categoryIcon,
        };
        current.value += item.grams;
        if (!current.icon && item.categoryIcon)
          current.icon = item.categoryIcon;
        grouped.set(label, current);
      });
      return [...grouped.values()].sort((a, b) => b.value - a.value);
    };

    const barSegments: BarSegment[] =
      statsRange === "week"
        ? Array.from({ length: 7 }, (_, index) => {
            const start = new Date(currentStart);
            start.setDate(currentStart.getDate() + index);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            return {
              key: dayKey(start),
              label: shortWeekday(start),
              detail: bucketLabel(start),
              grams: dailyMap.get(dayKey(start)) ?? 0,
              start,
              end,
              categories: buildCategories(start, end),
            };
          })
        : statsRange === "month"
          ? Array.from(
              {
                length: Math.max(
                  4,
                  Math.ceil(
                    new Date(
                      today.getFullYear(),
                      today.getMonth() + 1,
                      0,
                    ).getDate() / 7,
                  ),
                ),
              },
              (_, index) => {
                const bucketStart = new Date(currentStart);
                bucketStart.setDate(1 + index * 7);
                bucketStart.setHours(0, 0, 0, 0);
                const bucketEnd = new Date(bucketStart);
                bucketEnd.setDate(
                  Math.min(
                    bucketStart.getDate() + 6,
                    new Date(
                      today.getFullYear(),
                      today.getMonth() + 1,
                      0,
                    ).getDate(),
                  ),
                );
                bucketEnd.setHours(23, 59, 59, 999);
                let grams = 0;
                for (let i = 0; i < 7; i += 1) {
                  const date = new Date(bucketStart);
                  date.setDate(bucketStart.getDate() + i);
                  if (date.getMonth() === currentStart.getMonth())
                    grams += dailyMap.get(dayKey(date)) ?? 0;
                }
                return {
                  key: dayKey(bucketStart),
                  label: `Semana ${index + 1}`,
                  detail: `${bucketLabel(bucketStart)} - ${bucketLabel(bucketEnd)}`,
                  grams,
                  start: bucketStart,
                  end: bucketEnd,
                  categories: buildCategories(bucketStart, bucketEnd),
                };
              },
            )
          : Array.from({ length: 12 }, (_, index) => {
              const monthStart = new Date(today.getFullYear(), index, 1);
              monthStart.setHours(0, 0, 0, 0);
              const monthEnd = new Date(today.getFullYear(), index + 1, 1);
              monthEnd.setDate(0);
              monthEnd.setHours(23, 59, 59, 999);
              let grams = 0;
              normalized.forEach((item) => {
                if (item.date >= monthStart && item.date <= monthEnd)
                  grams += item.grams;
              });
              return {
                key: monthKey(monthStart),
                label: shortMonthLabel(monthStart),
                detail: shortMonthLabel(monthStart),
                grams,
                start: monthStart,
                end: monthEnd,
                categories: buildCategories(monthStart, monthEnd),
              };
            });

    const barMax = Math.max(...barSegments.map((item) => item.grams), 1);
    const pieSlices = [
      { label: "Abaixo da meta", value: belowGoalDays, color: "#22c55e" },
      { label: "Acima da meta", value: aboveGoalDays, color: "#ef4444" },
    ];
    const pieTotal = pieSlices.reduce((sum, item) => sum + item.value, 0) || 1;
    const pieSize = 174;
    const pieStrokeWidth = 26;
    const pieRadius = (pieSize - pieStrokeWidth) / 2;
    const pieCircumference = 2 * Math.PI * pieRadius;
    let accumulated = 0;
    const doughnut = pieSlices.map((item) => {
      const sliceSize = (item.value / pieTotal) * pieCircumference;
      const next = {
        ...item,
        dashArray: `${sliceSize} ${pieCircumference - sliceSize}`,
        dashOffset: -accumulated,
      };
      accumulated += sliceSize;
      return next;
    });

    return {
      rangeDays,
      goalPerDay,
      currentTotal,
      currentAverage,
      previousAverage,
      growthPercent,
      aboveGoalDays,
      belowGoalDays,
      topPercent,
      barSegments,
      barMax,
      pieSize,
      pieStrokeWidth,
      pieRadius,
      pieCircumference,
      pieSlices: doughnut,
    };
  }, [entries, statsRange]);

  const weekTone = trendTone(dashboard.growthPercent);
  const monthTone = trendTone(dashboard.growthPercent); // mobile simplification: same growth drives both cards here
  const selectedSegment = selectedBarKey
    ? (dashboard.barSegments.find(
        (segment) => segment.key === selectedBarKey,
      ) ?? null)
    : null;
  const categoryColors = [
    "#4fd1ff",
    "#2cb67d",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#84cc16",
    "#fb7185",
  ];
  const pieTotal =
    selectedSegment?.categories.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const pieCircumference = 2 * Math.PI * 58;
  let accumulated = 0;
  const categorySlices = (selectedSegment?.categories ?? []).map(
    (item, index) => {
      const sliceSize =
        pieTotal > 0 ? (item.value / pieTotal) * pieCircumference : 0;
      const next = {
        ...item,
        color: categoryColors[index % categoryColors.length],
        dashArray: `${sliceSize} ${pieCircumference - sliceSize}`,
        dashOffset: -accumulated,
      };
      accumulated += sliceSize;
      return next;
    },
  );
  const chartWidth = Math.max(250, Math.min(width - 72, 286));
  const handlePickProfilePhoto = async () => {
    if (!user) return;

    console.info("[settings][photo] start", {
      uid: user.uid,
      hasPhotoURL: Boolean(user.photoURL),
      hasProfilePhoto: Boolean(currentProfile?.avatarUrl),
    });

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.info("[settings][photo] permission", {
      granted: permission.granted,
      canAskAgain: permission.canAskAgain,
      status: permission.status,
    });
    if (!permission.granted) {
      console.warn("[settings][photo] permission denied");
      Alert.alert(
        "Permissão",
        "Permita acesso às fotos para atualizar o perfil.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
      base64: true,
    });

    console.info("[settings][photo] picker result", {
      canceled: result.canceled,
      assetCount: result.assets?.length || 0,
      firstAsset: result.assets?.[0]
        ? {
            uri: result.assets[0].uri,
            mimeType: result.assets[0].mimeType,
            width: result.assets[0].width,
            height: result.assets[0].height,
          }
        : null,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      console.info("[settings][photo] picker cancelled or without uri");
      return;
    }

    setUploadingPhoto(true);
    try {
      const selectedAsset = result.assets[0];
      const contentType = selectedAsset.mimeType || "image/jpeg";
      const extension = contentType.includes("png") ? "png" : "jpg";
      const base64Data = selectedAsset.base64;

      console.info("[settings][photo] selected asset", {
        uri: selectedAsset.uri,
        contentType,
        extension,
        hasBase64: Boolean(base64Data),
      });

      if (!base64Data) {
        throw new Error("A imagem selecionada não veio com base64.");
      }

      const avatarDataUrl = `data:${contentType};base64,${base64Data}`;
      console.info("[settings][photo] data url ready", {
        dataUrlLength: avatarDataUrl.length,
      });

      if (avatarDataUrl.length > 900000) {
        throw new Error("A imagem ficou grande demais para salvar no Firestore. Tente uma foto menor.");
      }

      setAvatarPreviewUrl(avatarDataUrl);
      await updateProfilePhoto(avatarDataUrl);
      console.info("[settings][photo] firestore profile updated");
      Alert.alert("Ok", "Foto de perfil atualizada.");
    } catch (error: any) {
      console.error("[settings][photo] failed", {
        code: error?.code,
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        customData: error?.customData,
        serverResponse: error?.customData?.serverResponse || error?.serverResponse,
      });
      const serverPayload =
        error?.customData?.serverResponse || error?.serverResponse || "";

      const hint =
        typeof serverPayload === "string" && serverPayload.length > 0
          ? `\n\nDetalhe do servidor: ${serverPayload.slice(0, 240)}`
          : "";

      Alert.alert("Erro", `${translateFirebaseError(error)}${hint}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateEmail = async () => {
    const trimmedEmail = stripSpaces(newEmail).trim();
    const trimmedPassword = currentPassword.trim();
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Campos obrigatórios", "Preencha o novo e-mail e a senha atual.");
      return;
    }
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      Alert.alert("E-mail inválido", "Digite um e-mail válido, sem espaços.");
      return;
    }

    setLoadingAccount(true);
    try {
      const activeUser = auth.currentUser;
      if (!activeUser?.email) return;
      console.info("[settings][email-change] start", {
        uid: activeUser.uid,
        currentEmail: activeUser.email,
        nextEmail: trimmedEmail,
      });
      const credential = EmailAuthProvider.credential(
        activeUser.email,
        trimmedPassword,
      );
      console.info("[settings][email-change] reauthenticating");
      await reauthenticateWithCredential(activeUser, credential);
      console.info("[settings][email-change] sending verification before update");
      await verifyBeforeUpdateEmail(activeUser, trimmedEmail, {
        url: "https://jenkaroline.github.io/recycling-logistics-app/action/",
        handleCodeInApp: true,
      });
      console.info("[settings][email-change] verification sent", {
        uid: activeUser.uid,
        nextEmail: trimmedEmail,
      });
      setNewEmail("");
      setCurrentPassword("");
      setSettingsOption(null);
      setActivePanel("none");
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "VerifyEmail",
            params: {
              message: "Enviamos a verificação para o novo e-mail. Confirme a mudança na sua caixa de entrada.",
              flow: "email-change",
              email: trimmedEmail,
            },
          },
        ],
      });
    } catch (error: any) {
      console.error("[settings][email-change] failed", {
        code: error?.code,
        message: error?.message,
        customData: error?.customData,
        serverResponse:
          error?.customData?.serverResponse || error?.serverResponse,
      });
      if (error?.code === "auth/operation-not-allowed") {
        setNewEmail("");
        setCurrentPassword("");
        setSettingsOption(null);
        setActivePanel("none");
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "VerifyEmail",
              params: {
                message: "Enviamos a verificação para o novo e-mail. Confirme a mudança na sua caixa de entrada.",
                flow: "email-change",
                email: trimmedEmail,
              },
            },
          ],
        });
        return;
      }
      Alert.alert(
        "Falha ao atualizar e-mail",
        `${translateFirebaseError(error)}\n\nDica: confira a senha atual e tente novamente.`,
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleUpdatePassword = async () => {
    const trimmedNew = stripSpaces(newPassword);
    const trimmedCurrent = currentPassword.trim();
    if (!trimmedNew || !trimmedCurrent) {
      Alert.alert("Campos obrigatórios", "Preencha a senha atual e a nova senha.");
      return;
    }
    if (trimmedNew !== confirmPassword.trim()) {
      Alert.alert("Senhas diferentes", "A confirmação da nova senha precisa ser igual à senha digitada.");
      return;
    }

    const missing = getMissingPasswordRequirements(trimmedNew);
    if (missing.length > 0) {
      Alert.alert(
        "Senha não atende aos requisitos",
        `Sua senha precisa conter: ${missing.join(", ")}.`,
      );
      return;
    }

    setLoadingAccount(true);
    try {
      const activeUser = auth.currentUser;
      if (!activeUser?.email) return;
      const credential = EmailAuthProvider.credential(
        activeUser.email,
        trimmedCurrent,
      );
      await reauthenticateWithCredential(activeUser, credential);
      await updatePassword(activeUser, trimmedNew);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      Alert.alert("Ok", "Senha atualizada.");
    } catch (error: any) {
      Alert.alert(
        "Falha ao atualizar senha",
        `${translateFirebaseError(error)}\n\nDica: confira a senha atual e os requisitos da nova senha.`,
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleUpdateUsername = async () => {
    const trimmedUsername = stripSpaces(newUsername).trim();
    if (!trimmedUsername) {
      Alert.alert("Campo obrigatório", "Preencha um nome de usuário.");
      return;
    }
    if (trimmedUsername.length < 3) {
      Alert.alert("Nome muito curto", "Use pelo menos 3 caracteres no nome de usuário.");
      return;
    }

    setLoadingAccount(true);
    try {
      const activeUser = auth.currentUser;
      if (!activeUser) return;
      await updateProfile(activeUser, { displayName: trimmedUsername });
      // Persist username to Firestore so SocialContext and other parts stay in sync
      await setDoc(doc(db, "users", activeUser.uid), { username: trimmedUsername }, { merge: true });
      setNewUsername("");
      setSettingsOption(null);
      setActivePanel("none");
      Alert.alert("Ok", "Nome de usuário atualizado.");
    } catch (error: any) {
      Alert.alert("Falha ao atualizar nome", translateFirebaseError(error));
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Excluir conta",
      "Essa ação remove sua conta e seu acesso de forma permanente. Você realmente quer continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmação final",
              "Depois de excluir, não será possível recuperar sua conta. Deseja excluir permanentemente?",
              [
                { text: "Voltar", style: "cancel" },
                {
                  text: "Excluir permanentemente",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const activeUser = auth.currentUser;
                      if (!activeUser) return;
                      await deleteUser(activeUser);
                      Alert.alert(
                        "Conta excluída",
                        "Sua conta foi removida com sucesso.",
                      );
                    } catch (error: any) {
                      Alert.alert("Erro", translateFirebaseError(error));
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 36,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => {
            if (drawerNavigation) {
              drawerNavigation.dispatch(DrawerActions.openDrawer());
            }
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            paddingRight: 8,
          }}
        >
          <Ionicons name={drawerOpen ? "close" : "menu"} size={22} color={palette.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate("Notificações")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.panel,
            borderWidth: 1,
            borderColor: palette.panelAlt,
          }}
        >
          <Ionicons name="notifications-outline" size={20} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: palette.panel,
          borderRadius: 28,
          padding: 16,
          borderWidth: 1,
          borderColor: palette.panelAlt,
          marginBottom: 14,
          shadowColor: "#000",
          shadowOpacity: darkModeEnabled ? 0.18 : 0.06,
          shadowOffset: { width: 0, height: 12 },
          shadowRadius: 24,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <View style={{ flex: 1, paddingTop: 2 }}>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: darkModeEnabled ? "rgba(15, 211, 182, 0.14)" : "rgba(15, 211, 182, 0.10)",
                borderWidth: 1,
                borderColor: darkModeEnabled ? "rgba(15, 211, 182, 0.32)" : "rgba(15, 211, 182, 0.24)",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#0fd3b6", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }}>
                CONFIGURAÇÕES
              </Text>
            </View>

            <Text style={{ color: palette.textPrimary, fontSize: 24, lineHeight: 28, fontWeight: "900" }}>
              Ajustes da conta
            </Text>
            <Text style={{ color: palette.textSecondary, marginTop: 4, fontSize: 12, lineHeight: 17 }}>
              Conta, notificações, localização e aparência.
            </Text>
          </View>

         </View>
      </View>

      <View
        style={{
          backgroundColor: palette.panel,
          borderRadius: 18,
          padding: 18,
          borderWidth: 1,
          borderColor: palette.panelAlt,
          marginBottom: 16,
        }}
      >

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={handlePickProfilePhoto}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              overflow: "hidden",
              backgroundColor: palette.panelAlt,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              borderWidth: 1,
              borderColor: "rgba(15, 211, 182, 0.32)",
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 72, height: 72 }}
              />
            ) : (
              <MaterialCommunityIcons name="account" size={38} color="#36a3ff" />
            )}
            {uploadingPhoto ? (
              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(6,21,38,0.7)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12 }}>Atualizando...</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>            
            <Text
              style={{
                color: palette.textPrimary,
                fontSize: 20,
                fontWeight: "800",
              }}
            >
              {fullName}
            </Text>
            <Text style={{ color: palette.textSecondary, marginTop: 2, marginBottom: 4 }}>
              {user?.email}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              Membro desde {memberSince}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: palette.panel,
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: palette.panelAlt,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: palette.textPrimary,
            fontSize: 18,
            fontWeight: "800",
            marginBottom: 10,
          }}
        >
          Permissões do dispositivo
        </Text>

        <View style={{ marginBottom: 10 }}>
          <TouchableOpacity
            onPress={() => {
              if (settingsDropdownOpen) {
                setSettingsDropdownOpen(false);
                return;
              }
              if (settingsOption) {
                setSettingsOption(null);
                setSettingsDropdownOpen(false);
                return;
              }
              setSettingsDropdownOpen(true);
            }}
            style={{
              backgroundColor: palette.panelAlt,
              borderRadius: 12,
              padding: 12,
              marginBottom: 6,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
                Alterar informações
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                Email, nome de usuário ou senha
              </Text>
            </View>
            <Ionicons name={settingsDropdownOpen || settingsOption ? "chevron-up" : "chevron-down"} size={18} color={palette.textSecondary} />
          </TouchableOpacity>

          {settingsDropdownOpen ? (
            <View style={{ backgroundColor: palette.panelAlt, borderRadius: 12, padding: 6, borderWidth: 1, borderColor: palette.panel }}>
              <TouchableOpacity
                onPress={() => {
                  setSettingsOption("email");
                  setSettingsDropdownOpen(false);
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 8 }}
              >
                <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Alterar e-mail</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>Atualizar seu endereço de e-mail</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSettingsOption("username");
                  setNewUsername(fullName || "");
                  setSettingsDropdownOpen(false);
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 8 }}
              >
                <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Alterar nome de usuário</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>Atualizar o nome exibido</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSettingsOption("password");
                  setSettingsDropdownOpen(false);
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 8 }}
              >
                <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Alterar senha</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>Atualizar sua senha</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {settingsOption ? (
            <View style={{ backgroundColor: palette.panel, borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: palette.panelAlt, shadowColor: '#000', shadowOpacity: darkModeEnabled ? 0.12 : 0.06, shadowRadius: 8, elevation: 2 }}>
              {settingsOption === "email" ? (
                <>
                  <TextInput
                    label="Novo e-mail"
                    mode="outlined"
                    value={newEmail}
                    onChangeText={(value) => setNewEmail(stripSpaces(value))}
                    outlineColor={palette.panelAlt}
                    activeOutlineColor={palette.switchOn}
                    contentStyle={{ paddingVertical: 6 }}
                    style={{ marginBottom: 10, backgroundColor: palette.modalInput, borderRadius: 10 }}
                  />
                  <TextInput
                    label="Senha atual"
                    mode="outlined"
                    value={currentPassword}
                    onChangeText={(value) => setCurrentPassword(stripSpaces(value))}
                    secureTextEntry={!showPassword}
                    right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                    outlineColor={palette.panelAlt}
                    activeOutlineColor={palette.switchOn}
                    contentStyle={{ paddingVertical: 6 }}
                    style={{ marginBottom: 10, backgroundColor: palette.modalInput, borderRadius: 10 }}
                  />
                  <Button mode="contained" buttonColor={palette.switchOn} textColor={palette.panel} onPress={handleUpdateEmail} loading={loadingAccount} style={{ marginBottom: 8 }}>
                    Atualizar e-mail
                  </Button>
                </>
              ) : settingsOption === "username" ? (
                <>
                  <TextInput
                    label="Novo nome de usuário"
                    mode="outlined"
                    value={newUsername}
                    onChangeText={(value) => setNewUsername(stripSpaces(value))}
                    outlineColor={palette.panelAlt}
                    activeOutlineColor={palette.switchOn}
                    contentStyle={{ paddingVertical: 6 }}
                    style={{ marginBottom: 10, backgroundColor: palette.modalInput, borderRadius: 10 }}
                  />
                  <Button mode="contained" buttonColor={palette.switchOn} textColor={palette.panel} onPress={handleUpdateUsername} loading={loadingAccount} style={{ marginBottom: 8 }}>
                    Atualizar nome
                  </Button>
                </>
              ) : (
                <>
                  <TextInput
                    label="Senha atual"
                    mode="outlined"
                    value={currentPassword}
                    onChangeText={(value) => setCurrentPassword(stripSpaces(value))}
                    secureTextEntry={!showPassword}
                    right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                    outlineColor={palette.panelAlt}
                    activeOutlineColor={palette.switchOn}
                    contentStyle={{ paddingVertical: 6 }}
                    style={{ marginBottom: 10, backgroundColor: palette.modalInput, borderRadius: 10 }}
                  />
                  <TextInput
                    label="Nova senha"
                    mode="outlined"
                    value={newPassword}
                    onChangeText={(value) => setNewPassword(stripSpaces(value))}
                    secureTextEntry={!showPassword}
                    outlineColor={palette.panelAlt}
                    activeOutlineColor={palette.switchOn}
                    contentStyle={{ paddingVertical: 6 }}
                    style={{ marginBottom: 10, backgroundColor: palette.modalInput, borderRadius: 10 }}
                  />
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>A senha deve conter:</Text>
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name={passwordReq.length ? "checkmark-circle" : "close-circle"} size={14} color={passwordReq.length ? barPositiveColor : barNegativeColor} style={{ marginRight: 8 }} />
                        <Text style={{ color: passwordReq.length ? palette.textPrimary : palette.textMuted, fontSize: 12 }}>Pelo menos 8 caracteres</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name={passwordReq.upper ? "checkmark-circle" : "close-circle"} size={14} color={passwordReq.upper ? barPositiveColor : barNegativeColor} style={{ marginRight: 8 }} />
                        <Text style={{ color: passwordReq.upper ? palette.textPrimary : palette.textMuted, fontSize: 12 }}>Uma letra maiúscula</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name={passwordReq.lower ? "checkmark-circle" : "close-circle"} size={14} color={passwordReq.lower ? barPositiveColor : barNegativeColor} style={{ marginRight: 8 }} />
                        <Text style={{ color: passwordReq.lower ? palette.textPrimary : palette.textMuted, fontSize: 12 }}>Uma letra minúscula</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name={passwordReq.number ? "checkmark-circle" : "close-circle"} size={14} color={passwordReq.number ? barPositiveColor : barNegativeColor} style={{ marginRight: 8 }} />
                        <Text style={{ color: passwordReq.number ? palette.textPrimary : palette.textMuted, fontSize: 12 }}>Um número</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name={passwordReq.special ? "checkmark-circle" : "close-circle"} size={14} color={passwordReq.special ? barPositiveColor : barNegativeColor} style={{ marginRight: 8 }} />
                        <Text style={{ color: passwordReq.special ? palette.textPrimary : palette.textMuted, fontSize: 12 }}>Um caractere especial</Text>
                      </View>
                    </View>
                  </View>
                  <TextInput
                    label="Confirmar nova senha"
                    mode="outlined"
                    value={confirmPassword}
                    onChangeText={(value) => setConfirmPassword(stripSpaces(value))}
                    secureTextEntry={!showPassword}
                    outlineColor={palette.panelAlt}
                    activeOutlineColor={palette.switchOn}
                    contentStyle={{ paddingVertical: 6 }}
                    style={{ marginBottom: 10, backgroundColor: palette.modalInput, borderRadius: 10 }}
                  />
                  <Button mode="contained" buttonColor={palette.switchOn} textColor={palette.panel} onPress={handleUpdatePassword} loading={loadingAccount} style={{ marginBottom: 8 }}>
                    Atualizar senha
                  </Button>
                </>
              )}
              <Button mode="text" textColor={palette.textSecondary} onPress={() => setSettingsOption(null)}>Cancelar</Button>
            </View>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: palette.panelAlt,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: darkModeEnabled ? "rgba(77, 144, 254, 0.14)" : "rgba(77, 144, 254, 0.12)",
                marginRight: 10,
              }}
            >
              <Ionicons name="camera-outline" size={18} color="#4d90fe" />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
                Câmera
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                {cameraPermissionGranted === null
                  ? "Verificando..."
                  : cameraPermissionGranted
                    ? "Concedida no sistema"
                    : "Negada no sistema"}
              </Text>
            </View>
            <Switch
              value={cameraPermissionGranted === true}
              onValueChange={(value) => void handlePermissionToggle("camera", value)}
              disabled={cameraPermissionGranted === null}
              thumbColor={palette.switchThumb}
              trackColor={{ true: palette.switchOn, false: palette.switchOff }}
            />
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 17 }}>
            Necessária para tirar fotos diretamente no app.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: palette.panelAlt,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: darkModeEnabled ? "rgba(19, 192, 160, 0.14)" : "rgba(19, 192, 160, 0.12)",
                marginRight: 10,
              }}
            >
              <Ionicons name="location-outline" size={18} color="#13c0a0" />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
                Localização
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                {locationPermissionGranted === null
                  ? "Verificando..."
                  : locationPermissionGranted
                    ? "Concedida no sistema"
                    : "Negada no sistema"}
              </Text>
            </View>
            <Switch
              value={locationPermissionGranted === true}
              onValueChange={(value) => void handlePermissionToggle("location", value)}
              disabled={locationPermissionGranted === null}
              thumbColor={palette.switchThumb}
              trackColor={{ true: palette.switchOn, false: palette.switchOff }}
            />
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 17 }}>
            Usada para mostrar ecopontos próximos e rotas mais precisas.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: palette.panelAlt,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
              Aparência
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              {darkModeEnabled ? "Modo escuro" : "Modo claro"}
            </Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            thumbColor={palette.switchThumb}
            trackColor={{ true: palette.switchOn, false: palette.switchOff }}
          />
        </View>

        <View
          style={{
            backgroundColor: palette.dangerPanel,
            borderWidth: 1,
            borderColor: palette.dangerBorder,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text
            style={{
              color: palette.dangerText,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            Zona de risco
          </Text>
          <Text
            style={{
              color: palette.dangerSubtext,
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            Use esta ação somente se quiser encerrar sua conta definitivamente.
          </Text>
          <Button
            mode="contained"
            buttonColor="#7d1f34"
            textColor="#ffe4ea"
            onPress={handleDeleteAccount}
          >
            Excluir conta
          </Button>
        </View>
      </View>

      <Modal
        visible={activePanel !== "none"}
        transparent
        animationType="slide"
        onRequestClose={closeActivePanel}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          <View
            style={{
              backgroundColor: palette.modalPanel,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderColor: palette.panelAlt,
              maxHeight: "92%",
            }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 52,
              }}
            >
              <Button
                mode="text"
                textColor={palette.textSecondary}
                onPress={closeActivePanel}
                style={{ alignSelf: "flex-start" }}
              >
                Fechar
              </Button>

              {activePanel === "settings" ? (
                <View>
                  <Text
                    style={{
                      color: palette.textPrimary,
                      fontWeight: "800",
                      fontSize: 18,
                      marginBottom: 12,
                    }}
                  >
                    Configurações da conta
                  </Text>

                  {!settingsOption ? (
                    <View>
                      <Text style={{ color: palette.textMuted, marginBottom: 10 }}>O que você deseja alterar?</Text>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                        <Button mode="outlined" onPress={() => setSettingsOption("email")} style={{ flex: 1, marginRight: 6 }}>E-mail</Button>
                        <Button mode="outlined" onPress={() => { setSettingsOption("username"); setNewUsername(fullName || ""); }} style={{ flex: 1, marginHorizontal: 6 }}>Nome</Button>
                        <Button mode="outlined" onPress={() => setSettingsOption("password")} style={{ flex: 1, marginLeft: 6 }}>Senha</Button>
                      </View>
                      <Button mode="text" onPress={() => { setActivePanel("none"); }}>Fechar</Button>
                    </View>
                  ) : settingsOption === "email" ? (
                    <View>
                      <TextInput
                        label="Novo e-mail"
                        mode="outlined"
                        value={newEmail}
                        onChangeText={setNewEmail}
                        style={{
                          marginBottom: 10,
                          backgroundColor: palette.modalInput,
                        }}
                      />
                      <TextInput
                        label="Senha atual"
                        mode="outlined"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showPassword}
                        right={
                          <TextInput.Icon
                            icon={showPassword ? "eye-off" : "eye"}
                            onPress={() => setShowPassword(!showPassword)}
                          />
                        }
                        style={{
                          marginBottom: 10,
                          backgroundColor: palette.modalInput,
                        }}
                      />
                      <Button
                        mode="contained"
                        buttonColor="#36a3ff"
                        textColor="#032746"
                        onPress={handleUpdateEmail}
                        loading={loadingAccount}
                        style={{ marginBottom: 14 }}
                      >
                        Atualizar e-mail
                      </Button>
                      <Button mode="text" onPress={() => setSettingsOption(null)}>Voltar</Button>
                    </View>
                  ) : settingsOption === "username" ? (
                    <View>
                      <TextInput
                        label="Novo nome de usuário"
                        mode="outlined"
                        value={newUsername}
                        onChangeText={setNewUsername}
                        style={{
                          marginBottom: 10,
                          backgroundColor: palette.modalInput,
                        }}
                      />
                      <Button
                        mode="contained"
                        buttonColor="#36a3ff"
                        textColor="#032746"
                        onPress={handleUpdateUsername}
                        loading={loadingAccount}
                        style={{ marginBottom: 14 }}
                      >
                        Atualizar nome
                      </Button>
                      <Button mode="text" onPress={() => setSettingsOption(null)}>Voltar</Button>
                    </View>
                  ) : (
                    <View>
                      <TextInput
                        label="Senha atual"
                        mode="outlined"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showPassword}
                        right={
                          <TextInput.Icon
                            icon={showPassword ? "eye-off" : "eye"}
                            onPress={() => setShowPassword(!showPassword)}
                          />
                        }
                        style={{
                          marginBottom: 10,
                          backgroundColor: palette.modalInput,
                        }}
                      />
                      <TextInput
                        label="Nova senha"
                        mode="outlined"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        style={{
                          marginBottom: 10,
                          backgroundColor: palette.modalInput,
                        }}
                      />
                      <TextInput
                        label="Confirmar nova senha"
                        mode="outlined"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        style={{
                          marginBottom: 10,
                          backgroundColor: palette.modalInput,
                        }}
                      />
                      <Button
                        mode="contained"
                        buttonColor="#36a3ff"
                        textColor="#032746"
                        onPress={handleUpdatePassword}
                        loading={loadingAccount}
                        style={{ marginBottom: 10 }}
                      >
                        Atualizar senha
                      </Button>
                      <Button mode="text" onPress={() => setSettingsOption(null)}>Voltar</Button>
                    </View>
                  )}
                </View>
              ) : null}

              {activePanel === "statistics" ? (
                <View>
                  <Text
                    style={{
                      color: palette.textSecondary,
                      marginBottom: 12,
                      fontSize: 13,
                    }}
                  >
                    {fullName} —{" "}
                    {statsRange === "week"
                      ? "Semana"
                      : statsRange === "month"
                        ? "Mês"
                        : "Ano"}
                  </Text>

                  <View style={{ flexDirection: "row", marginBottom: 12 }}>
                    {(["week", "month", "year"] as DashboardRange[]).map(
                      (range) => {
                        const active = statsRange === range;
                        return (
                          <TouchableOpacity
                            key={range}
                            onPress={() => setStatsRange(range)}
                            style={{
                              flex: 1,
                              marginRight: range === "year" ? 0 : 8,
                              paddingVertical: 9,
                              borderRadius: 999,
                              alignItems: "center",
                              backgroundColor: active
                                ? palette.segmentBgActive
                                : palette.segmentBg,
                              borderWidth: 1,
                              borderColor: active
                                ? palette.segmentBorderActive
                                : palette.segmentBorder,
                            }}
                          >
                            <Text
                              style={{
                                color: active
                                  ? palette.segmentTextActive
                                  : palette.segmentText,
                                fontWeight: "700",
                                fontSize: 12,
                              }}
                            >
                              {range === "week"
                                ? "Semana"
                                : range === "month"
                                  ? "Mês"
                                  : "Ano"}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    {[
                      {
                        label: "Média diária",
                        value: `${dashboard.currentAverage.toFixed(0)}g`,
                        note:
                          dashboard.growthPercent >= 0
                            ? `↑ ${dashboard.growthPercent.toFixed(0)}%`
                            : `↓ ${Math.abs(dashboard.growthPercent).toFixed(0)}%`,
                      },
                      {
                        label: "Total evitado",
                        value: `${dashboard.currentTotal.toFixed(0)}g`,
                        note: "período selecionado",
                      },
                      {
                        label: "Meta atingida",
                        value: `${dashboard.aboveGoalDays}/${dashboard.rangeDays}`,
                        note: "dias no alvo",
                      },
                      {
                        label: "Ranking",
                        value: `Top ${dashboard.topPercent}%`,
                        note: "neste recorte",
                      },
                    ].map((card) => (
                      <View
                        key={card.label}
                        style={{
                          width: "48%",
                          backgroundColor: palette.statsPanelAlt,
                          borderRadius: 18,
                          padding: 12,
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: palette.statsBorderAlt,
                          minHeight: 92,
                        }}
                      >
                        <Text
                          style={{
                            color: palette.statsTextMuted,
                            marginBottom: 8,
                            fontSize: 13,
                          }}
                        >
                          {card.label}
                        </Text>
                        <Text
                          style={{
                            color: palette.textPrimary,
                            fontSize: 24,
                            fontWeight: "700",
                          }}
                        >
                          {card.value}
                        </Text>
                        <Text
                          style={{
                            color: "#8bd14f",
                            marginTop: 6,
                            fontSize: 11,
                          }}
                        >
                          {card.note}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View
                    style={{
                      backgroundColor: palette.statsPanel,
                      borderRadius: 22,
                      padding: 14,
                      paddingRight: 20,
                      borderWidth: 1,
                      borderColor: palette.statsBorder,
                      marginBottom: 12,
                      overflow: "hidden",
                    }}
                  >
                    <Text
                      style={{
                        color: palette.textPrimary,
                        fontWeight: "800",
                        fontSize: 16,
                        marginBottom: 6,
                      }}
                    >
                      Seu ritmo
                    </Text>
                    <Text
                      style={{
                        color: palette.statsTextMuted,
                        fontSize: 12,
                        marginBottom: 10,
                      }}
                    >
                      As barras respondem ao período escolhido. Toque nos
                      períodos acima para mudar o recorte.
                    </Text>
                    <View
                      style={{
                        position: "relative",
                        width: chartWidth,
                        height: 176,
                      }}
                    >
                      <Svg width={chartWidth} height={176}>
                        <Defs>
                          <LinearGradient
                            id="dashBar"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <Stop offset="0%" stopColor="#4fd1ff" />
                            <Stop offset="100%" stopColor="#1d6fa8" />
                          </LinearGradient>
                        </Defs>
                        <Line
                          x1="16"
                          y1={138}
                          x2={chartWidth - 20}
                          y2={138}
                          stroke={chartLinePrimary}
                          strokeWidth="1"
                        />
                        <Line
                          x1="16"
                          y1={94}
                          x2={chartWidth - 20}
                          y2={94}
                          stroke={chartLineSecondary}
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <Line
                          x1="16"
                          y1={50}
                          x2={chartWidth - 20}
                          y2={50}
                          stroke={chartLineSecondary}
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />

                        {dashboard.barSegments.map((segment, index) => {
                          const barAreaHeight = 88;
                          const barWidth = Math.max(
                            7,
                            Math.floor(
                              (chartWidth - 60) /
                                Math.max(dashboard.barSegments.length * 2.9, 1),
                            ),
                          );
                          const barGap = Math.max(
                            5,
                            (chartWidth -
                              44 -
                              dashboard.barSegments.length * barWidth) /
                              Math.max(dashboard.barSegments.length - 1, 1),
                          );
                          const barHeight =
                            (segment.grams / dashboard.barMax) * barAreaHeight;
                          const x = 18 + index * (barWidth + barGap);
                          const y = 138 - barHeight;
                          return (
                            <G key={segment.key}>
                              <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={Math.max(barHeight, 4)}
                                fill={
                                  segment.grams >= dashboard.goalPerDay
                                    ? barNegativeColor
                                    : barPositiveColor
                                }
                                opacity={
                                  selectedBarKey &&
                                  selectedBarKey !== segment.key
                                    ? 0.65
                                    : 1
                                }
                                stroke={
                                  selectedBarKey === segment.key
                                    ? darkModeEnabled
                                      ? "#ffffff"
                                      : "#1d3750"
                                    : "transparent"
                                }
                                strokeWidth={
                                  selectedBarKey === segment.key ? 1.5 : 0
                                }
                              />
                              <SvgText
                                x={x + barWidth / 2}
                                y={152}
                                fontSize="8"
                                textAnchor="middle"
                                fill={chartLabelColor}
                              >
                                {segment.label}
                              </SvgText>
                              <SvgText
                                x={x + barWidth / 2}
                                y={y - 4}
                                fontSize="8"
                                textAnchor="middle"
                                fill={chartValueColor}
                              >
                                {segment.grams.toFixed(0)}g
                              </SvgText>
                            </G>
                          );
                        })}
                      </Svg>
                      {dashboard.barSegments.map((segment, index) => {
                        const barAreaHeight = 88;
                        const barWidth = Math.max(
                          7,
                          Math.floor(
                            (chartWidth - 60) /
                              Math.max(dashboard.barSegments.length * 2.9, 1),
                          ),
                        );
                        const barGap = Math.max(
                          5,
                          (chartWidth -
                            44 -
                            dashboard.barSegments.length * barWidth) /
                            Math.max(dashboard.barSegments.length - 1, 1),
                        );
                        const barHeight =
                          (segment.grams / dashboard.barMax) * barAreaHeight;
                        const x = 18 + index * (barWidth + barGap);
                        const y = 138 - barHeight;
                        return (
                          <TouchableOpacity
                            key={`${segment.key}-touch`}
                            onPress={() => setSelectedBarKey(segment.key)}
                            style={{
                              position: "absolute",
                              left: x,
                              top: y,
                              width: barWidth,
                              height: Math.max(barHeight, 18),
                            }}
                          />
                        );
                      })}
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: palette.statsPanel,
                      borderRadius: 22,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: palette.statsBorder,
                      marginTop: 18,
                      marginBottom: 24,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: palette.textPrimary,
                          fontWeight: "800",
                          fontSize: 16,
                        }}
                      >
                        Categorias consumidas
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: palette.segmentBg,
                        borderRadius: 18,
                        padding: 14,
                        alignItems: "center",
                        paddingTop: 20,
                      }}
                    >
                      {selectedSegment ? (
                        <>
                          <Text
                            style={{
                              color: palette.textPrimary,
                              fontWeight: "800",
                              marginBottom: 4,
                            }}
                          >
                            {selectedSegment.label}
                          </Text>
                          <Text
                            style={{
                              color: palette.statsTextMuted,
                              fontSize: 12,
                              marginBottom: 14,
                            }}
                          >
                            {selectedSegment.detail} •{" "}
                            {selectedSegment.grams.toFixed(0)}g
                          </Text>
                          <View style={{ alignItems: "center", marginTop: 4 }}>
                            <Svg width={170} height={170}>
                              <G rotation="-90" origin="85, 85">
                                <Circle
                                  cx={85}
                                  cy={85}
                                  r={58}
                                  stroke={chartBaseRing}
                                  strokeWidth={24}
                                  fill="none"
                                />
                                {categorySlices.map((slice) => (
                                  <Circle
                                    key={slice.label}
                                    cx={85}
                                    cy={85}
                                    r={58}
                                    stroke={slice.color}
                                    strokeWidth={24}
                                    fill="none"
                                    strokeDasharray={slice.dashArray}
                                    strokeDashoffset={slice.dashOffset}
                                  />
                                ))}
                              </G>
                            </Svg>
                            <View
                              style={{ marginTop: -112, alignItems: "center" }}
                            >
                              <Text
                                style={{
                                  color: palette.textPrimary,
                                  fontSize: 22,
                                  fontWeight: "800",
                                }}
                              >
                                {selectedSegment.grams.toFixed(0)}g
                              </Text>
                              <Text
                                style={{
                                  color: palette.statsTextMuted,
                                  fontSize: 12,
                                }}
                              >
                                consumo
                              </Text>
                            </View>
                          </View>
                          <View style={{ width: "100%", marginTop: 50 }}>
                            {categorySlices.length > 0 ? (
                              categorySlices.map((slice) => (
                                <View
                                  key={slice.label}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 6,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: 5,
                                      backgroundColor: slice.color,
                                      marginRight: 8,
                                    }}
                                  />
                                  <Text
                                    style={{
                                      color: palette.statsTextSubtle,
                                      fontSize: 12,
                                      flex: 1,
                                    }}
                                  >
                                    {slice.label}
                                  </Text>
                                  <Text
                                    style={{
                                      color: palette.textPrimary,
                                      fontSize: 12,
                                    }}
                                  >
                                    {slice.value.toFixed(0)}g
                                  </Text>
                                </View>
                              ))
                            ) : (
                              <Text
                                style={{
                                  color: palette.statsTextMuted,
                                  fontSize: 12,
                                  textAlign: "center",
                                }}
                              >
                                Sem categorias registradas nesse trecho.
                              </Text>
                            )}
                          </View>
                        </>
                      ) : (
                        <Text
                          style={{
                            color: palette.statsTextMuted,
                            fontSize: 12,
                            textAlign: "center",
                          }}
                        >
                          Toque em uma barra acima para ver a pizza das
                          categorias consumidas.
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
