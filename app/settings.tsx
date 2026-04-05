import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { auth, storage } from "../service/firebaseConfig";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";

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

const LOCATION_PREF_KEY = "@settings/locationEnabled";

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

function fileUriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve(xhr.response as Blob);
        return;
      }
      reject(new Error(`Falha ao carregar arquivo local (${xhr.status}).`));
    };
    xhr.onerror = () =>
      reject(new Error("Não foi possível ler o arquivo local da imagem."));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send();
  });
}

export default function SettingsScreen() {
  const { entries, totalGrams } = usePlasticConsumption();
  const { currentProfile, myPosts, updateProfilePhoto } = useSocial();
  const { darkModeEnabled, setDarkModeEnabled } = useThemePreference();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
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

  React.useEffect(() => {
    let mounted = true;

    const loadLocationPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCATION_PREF_KEY);
        if (!mounted || saved === null) return;
        setLocationEnabled(saved === "true");
      } catch {
        // ignore preference read errors and keep default value
      }
    };

    void loadLocationPreference();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    void AsyncStorage.setItem(LOCATION_PREF_KEY, String(locationEnabled));
  }, [locationEnabled]);

  useEffect(() => {
    setSelectedBarKey(null);
  }, [statsRange]);

  const user = auth.currentUser;
  const avatarUrl = currentProfile?.avatarUrl || user?.photoURL || "";
  const fullName =
    currentProfile?.username ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Usuario";
  const memberSince = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR")
    : "Nao disponivel";

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return entries
      .filter((entry) => new Date(entry.createdAt).toDateString() === today)
      .reduce((sum, entry) => sum + entry.amountGrams, 0);
  }, [entries]);

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

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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
      quality: 0.75,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploadingPhoto(true);
    try {
      const selectedAsset = result.assets[0];
      const contentType = selectedAsset.mimeType || "image/jpeg";
      const extension = contentType.includes("png") ? "png" : "jpg";

      let blob: Blob;
      try {
        const response = await fetch(selectedAsset.uri);
        blob = await response.blob();
      } catch {
        blob = await fileUriToBlob(selectedAsset.uri);
      }

      const photoRef = ref(
        storage,
        `avatars/${user.uid}/profile-${Date.now()}.${extension}`,
      );
      await uploadBytes(photoRef, blob, { contentType });
      const downloadUrl = await getDownloadURL(photoRef);
      await updateProfile(user, { photoURL: downloadUrl });
      await updateProfilePhoto(downloadUrl);
      Alert.alert("Ok", "Foto de perfil atualizada.");
    } catch (error: any) {
      const code = error?.code ? ` (${error.code})` : "";
      const message =
        error?.message || "Não foi possível atualizar a foto agora.";
      const serverPayload =
        error?.customData?.serverResponse || error?.serverResponse || "";

      const hint =
        typeof serverPayload === "string" && serverPayload.length > 0
          ? `\n\nDetalhe do servidor: ${serverPayload.slice(0, 240)}`
          : "";

      Alert.alert("Erro", `${message}${code}${hint}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || !currentPassword.trim()) {
      Alert.alert("Erro", "Preencha novo e-mail e senha atual.");
      return;
    }

    setLoadingAccount(true);
    try {
      const activeUser = auth.currentUser;
      if (!activeUser?.email) return;
      const credential = EmailAuthProvider.credential(
        activeUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(activeUser, credential);
      await updateEmail(activeUser, newEmail.trim());
      setNewEmail("");
      setCurrentPassword("");
      Alert.alert("Ok", "E-mail atualizado.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao atualizar e-mail.");
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !currentPassword.trim()) {
      Alert.alert("Erro", "Preencha senha atual e nova senha.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }

    setLoadingAccount(true);
    try {
      const activeUser = auth.currentUser;
      if (!activeUser?.email) return;
      const credential = EmailAuthProvider.credential(
        activeUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(activeUser, credential);
      await updatePassword(activeUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      Alert.alert("Ok", "Senha atualizada.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao atualizar senha.");
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
                      Alert.alert(
                        "Erro",
                        error?.message ||
                          "Não foi possível excluir sua conta agora.",
                      );
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
      <TouchableOpacity
        onPress={() => navigation.navigate("MainTabs")}
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 14,
          paddingVertical: 6,
          paddingRight: 8,
        }}
      >
        <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
      </TouchableOpacity>

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
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 72, height: 72 }}
              />
            ) : (
              <MaterialCommunityIcons
                name="account"
                size={38}
                color="#36a3ff"
              />
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
                <Text style={{ color: "#fff", fontSize: 12 }}>
                  Atualizando...
                </Text>
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
            <Text style={{ color: palette.textSecondary, marginBottom: 4 }}>
              {user?.email}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              Membro desde {memberSince}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 14,
          }}
        >
          {[
            { label: "Seguidores", value: currentProfile?.followersCount || 0 },
            { label: "Seguindo", value: currentProfile?.followingCount || 0 },
            { label: "Publicações", value: myPosts.length },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                alignItems: "center",
                backgroundColor: palette.panelAlt,
                borderRadius: 14,
                paddingVertical: 10,
                marginHorizontal: 4,
              }}
            >
              <Text
                style={{
                  color: palette.textPrimary,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                {item.value}
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                {item.label}
              </Text>
            </View>
          ))}
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
          Preferências e conta
        </Text>

        <TouchableOpacity
          onPress={() => setActivePanel("settings")}
          style={{
            backgroundColor: palette.panelAlt,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
            Alterar informações
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            Email, senha e dados da conta
          </Text>
        </TouchableOpacity>

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
              Notificações
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              {notificationsEnabled ? "Ativadas" : "Desativadas"}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor={palette.switchThumb}
            trackColor={{ true: palette.switchOn, false: palette.switchOff }}
          />
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
              Localização
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              {locationEnabled ? "Ativada" : "Desativada"}
            </Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            thumbColor={palette.switchThumb}
            trackColor={{ true: palette.switchOn, false: palette.switchOff }}
          />
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
