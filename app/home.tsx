import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions, useRoute } from "@react-navigation/native";
import { useDrawerStatus } from "@react-navigation/drawer";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View, useWindowDimensions, Animated, Easing, Alert } from "react-native";
import { Image } from "expo-image";
import { Button, TextInput } from "react-native-paper";
import { usePlasticCategories } from "../src/PlasticCategoriesContext";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useRecyclingCompetition } from "../src/RecyclingCompetitionContext";
import { useRecycling } from "../src/RecyclingContext";
import { useRecyclingTypes } from "../src/RecyclingTypesContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { captureRecyclingEvidenceLocation, captureRecyclingEvidencePhoto } from "../src/recyclingEvidence";
import { useAppNotifications } from "../src/useAppNotifications";
import { toLocalDayKey, useCurrentDayKey } from "../src/useCurrentDayKey";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../service/firebaseConfig";

type QuickActionsProps = {
  onPressHistory: () => void;
  onPressPlus: () => void;
  onPressStats?: () => void;
  onPressPrevGroup?: () => void;
  onPressNextGroup?: () => void;
  onPressAllGroups?: () => void;
  showGroupControls?: boolean;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  historyColor: string;
  plusColor: string;
  statsColor?: string;
  borderColor: string;
  backgroundColor: string;
};

function QuickActions({
  onPressHistory,
  onPressPlus,
  onPressStats,
  onPressPrevGroup,
  onPressNextGroup,
  onPressAllGroups,
  showGroupControls,
  canGoPrev,
  canGoNext,
  historyColor,
  plusColor,
  statsColor,
  borderColor,
  backgroundColor,
}: QuickActionsProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <TouchableOpacity
        onPress={onPressHistory}
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          borderWidth: 0,
          borderColor: "transparent",
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name="history" size={18} color={historyColor} />
      </TouchableOpacity>
      

      <TouchableOpacity
        onPress={onPressPlus}
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          borderWidth: 0,
          borderColor: "transparent",
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name="plus" size={18} color={plusColor} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPressStats}
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          borderWidth: 0,
          borderColor: "transparent",
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="stats-chart-outline" size={18} color={statsColor ?? historyColor} />
      </TouchableOpacity>
      

      {showGroupControls ? (
        <>
          <TouchableOpacity
            onPress={onPressAllGroups}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              borderWidth: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="view-grid-outline" size={18} color={historyColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPressPrevGroup}
            disabled={!canGoPrev}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              borderWidth: 0,
              alignItems: "center",
              justifyContent: "center",
              opacity: canGoPrev ? 1 : 0.35,
            }}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={historyColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPressNextGroup}
            disabled={!canGoNext}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              borderWidth: 0,
              alignItems: "center",
              justifyContent: "center",
              opacity: canGoNext ? 1 : 0.35,
            }}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={historyColor} />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const drawerNavigation = navigation.getParent?.("MainDrawer") || navigation;
  const { entries, addEntry, totalGrams, goalGrams, setGoal, zeroConsumptionDays, confirmZeroConsumption, clearZeroConsumptionConfirmation } = usePlasticConsumption();
  const { categories, addCategory, deleteCategory } = usePlasticCategories();
  const { entries: recyclingEntries, addAction: addRecyclingAction, deleteAction: deleteRecyclingAction } = useRecycling();
  const { groups, activeGroup, activeGroupId, rankedMembers, setActiveGroup, awardXpToActiveGroup } = useRecyclingCompetition();
  const { types: recyclingTypes, addType: addRecyclingType, deleteType: deleteRecyclingType } = useRecyclingTypes();
  const { darkModeEnabled } = useThemePreference();
  const { notificationCount } = useAppNotifications();

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        panelSoft: "#0f3556",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#8aa6c0",
        consAccent: "#ff8b94",
        consSoft: "rgba(255, 139, 148, 0.14)",
        consLine: "rgba(255, 139, 148, 0.40)",
        consWarning: "#ffbd75",
        recycleAccent: "#0fd3b6",
        recycleSoft: "rgba(15, 211, 182, 0.14)",
        recycleLine: "rgba(15, 211, 182, 0.4)",
        actionBlue: "#8bc2e2",
        danger: "#ff8b94",
        dangerSoft: "rgba(255, 139, 148, 0.14)",
        cardBorder: "#1e3a57",
        modalSurface: "#0c2740",
        modalInput: "#123252",
        modalChip: "#0f3556",
        modalChipIdle: "#0b1f33",
        modalChipText: "#eaf4ff",
        modalChipMuted: "#8aa6c0",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        panelSoft: "#eaf2fb",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#6b7f95",
        consAccent: "#b3314d",
        consSoft: "rgba(179, 49, 77, 0.10)",
        consLine: "rgba(179, 49, 77, 0.22)",
        consWarning: "#c28a1f",
        recycleAccent: "#1b8f5a",
        recycleSoft: "rgba(27, 143, 90, 0.11)",
        recycleLine: "rgba(27, 143, 90, 0.24)",
        actionBlue: "#6fb8ff",
        danger: "#b3314d",
        dangerSoft: "rgba(179, 49, 77, 0.10)",
        cardBorder: "#d7e5f2",
        modalSurface: "#ffffff",
        modalInput: "#f3f8fd",
        modalChip: "#d9ebfb",
        modalChipIdle: "#eff5fb",
        modalChipText: "#1d3750",
        modalChipMuted: "#6b7f95",
      };

  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryWeight, setNewCategoryWeight] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState(
    "package-variant-closed",
  );
  const [showAllIcons, setShowAllIcons] = useState(false);
  const ecopontoEnsuredRef = useRef(false);
  const currentDayKey = useCurrentDayKey();

  const isEndOfDay = useMemo(() => {
    const now = new Date();
    return now.getHours() >= 20;
  }, [currentDayKey]);

  const todayTotal = useMemo(() => {
    return entries
      .filter((entry) => toLocalDayKey(entry.createdAt) === currentDayKey)
      .reduce((sum, entry) => sum + entry.amountGrams, 0);
  }, [entries, currentDayKey]);

  const lastEntries = useMemo(
    () =>
      [...entries]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [entries],
  );

  const hasEntryToday = useMemo(() => {
    return entries.some((entry) => toLocalDayKey(entry.createdAt) === currentDayKey);
  }, [entries, currentDayKey]);

  const todayZeroConfirmed = Boolean(zeroConsumptionDays[currentDayKey]);
  const showZeroConfirmationPrompt = isEndOfDay && !hasEntryToday && !todayZeroConfirmed;

  const handleAddCategory = async () => {
    const weight = Number(newCategoryWeight.replace(",", "."));
    if (!newCategoryName.trim() || !weight || weight <= 0) {
      return;
    }
    await addCategory({
      name: newCategoryName,
      weightGrams: weight,
      icon: newCategoryIcon,
      isCustom: true,
    });
    setNewCategoryName("");
    setNewCategoryWeight("");
    setNewCategoryIcon("package-variant-closed");
    setModalVisible(false);
  };

  const handleAddByCategory = async (weightGrams: number) => {
    const selectedCategory = categories.find(
      (category) => category.weightGrams === weightGrams,
    );
    await addEntry(
      weightGrams,
      selectedCategory
        ? { name: selectedCategory.name, icon: selectedCategory.icon }
        : undefined,
    );
  };

  const itemHeight = 48;
  const containerHeight = Math.max(60, lastEntries.length * itemHeight + 20);

const ICON_OPTIONS = [
  "bottle-soda-outline",
  "cup-outline",
  "cup-water",
  "food-fork-drink",
  "bag-personal-outline",
  "shopping-outline",
  "package-variant-closed",
  "bowl-outline",
  "silverware-fork-knife",
  "spray-bottle",
  "needle",
  "toothbrush-outline",
  "hanger",
  "washing-machine",
  "trash-can-outline",
  "recycle",
  "leaf-circle-outline",
  "recycle",
  "recycle-variant",
  "leaf",
  "leaf-circle-outline",
  "sprout",
  "sprout-outline",
  "tree",
  "tree-outline",
  "pine-tree",
  "earth",
  "earth-arrow-right",
  "earth-box",
  "earth-plus",
  "water",
  "water-outline",
  "water-check",
  "trash-can-outline",
  "trash-can",
  "delete-outline",
  "dump-truck",
  "package-variant",
  "package-variant-closed",
  "shopping-outline",
  "shopping",
  "shopping-search",
  "bag-personal-outline",
  "bag-suitcase-outline",
  "bottle-tonic-outline",
  "bottle-soda-outline",
  "cup-water",
  "cup-outline",
  "lightbulb-outline",
  "solar-power",
  "flash-outline",
  "battery-heart-outline",
  "bike",
  "walk",
  "bus",
  "train",
  "car-electric",
  "flower-outline",
  "flower",
  "forest"
];

  const { width } = useWindowDimensions();
  const isCompactWidth = width < 430;
  const cardPadding = 18;
  const heroGoal = goalGrams ?? 50;
  const progress = Math.min(1, todayTotal / (heroGoal || 1));
  const inGoal = heroGoal ? todayTotal <= heroGoal : true;
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goalGrams ?? ""));
  const [goalLabel, setGoalLabel] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const horizontalRef = useRef<ScrollView>(null);
  const routeTab = route?.params?.tab;
  const routeGroupId = route?.params?.groupId;

  const switchableGroups = useMemo(() => {
    return groups.filter((group) => group.isActive);
  }, [groups]);

  const currentGroup = useMemo(() => {
    if (activeGroup) return activeGroup;
    return switchableGroups[0] || null;
  }, [activeGroup, switchableGroups]);

  const currentGroupRanking = useMemo(() => {
    if (rankedMembers.length > 0) return rankedMembers;
    return currentGroup?.members || [];
  }, [rankedMembers, currentGroup]);

  const currentUserRanking = useMemo(() => {
    const currentUser = auth.currentUser;
    const currentUid = currentUser?.uid || null;
    const currentName = currentUser?.displayName?.trim() || currentUser?.email?.split("@")[0] || "";

    const memberIndex = currentGroupRanking.findIndex((member) => {
      if (currentUid && member.id === currentUid) return true;
      return Boolean(currentName) && member.name.trim().toLowerCase() === currentName.toLowerCase();
    });

    if (memberIndex < 0) return null;

    return {
      member: currentGroupRanking[memberIndex],
      position: memberIndex + 1,
    };
  }, [currentGroupRanking]);

  const notificationBadgeCount = Math.min(notificationCount, 99);

  // Helpers to compute smooth color transitions based on ranking
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  };

  const blendHex = (a: string, b: string, t: number) => {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    const r = A.r + (B.r - A.r) * t;
    const g = A.g + (B.g - A.g) * t;
    const bb = A.b + (B.b - A.b) * t;
    return rgbToHex(r, g, bb);
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const rankingCardStyle = useMemo(() => {
    if (!currentUserRanking) return null;
    const position = currentUserRanking.position;
    const groupSize = Math.max(1, currentGroupRanking.length || 1);
    const fraction = groupSize <= 1 ? 1 : (groupSize - position) / (groupSize - 1); // 1 = 1st, 0 = last

    // Blend from positive accent to danger as the user falls in ranking.
    const accentBlend = blendHex(palette.recycleAccent, palette.danger, 1 - fraction);

    // Background: subtle tinted surface using accent blend with small alpha influenced by fraction
    const bg = hexToRgba(accentBlend, 0.08 + 0.18 * fraction);
    const border = hexToRgba(accentBlend, 0.6);
    const xpColor = accentBlend;

    // Medal colors for top 3
    const gold = '#FFD700';
    const silver = '#C0C0C0';
    const bronze = '#CD7F32';
    let medalColor: string | undefined = undefined;
    if (position === 1) medalColor = gold;
    else if (position === 2) medalColor = silver;
    else if (position === 3) medalColor = bronze;

    // Special first-place styling
    if (position === 1) {
      return { backgroundColor: hexToRgba(gold, 0.12), borderColor: hexToRgba(gold, 0.9), xpColor: gold, trophyColor: gold, medalColor };
    }

    return { backgroundColor: bg, borderColor: border, xpColor, trophyColor: accentBlend, medalColor };
  }, [currentUserRanking, currentGroupRanking, palette.recycleAccent, palette.danger]);

  const currentGroupIndex = useMemo(
    () => switchableGroups.findIndex((group) => group.id === currentGroup?.id),
    [switchableGroups, currentGroup?.id],
  );

  const showGroupFlow = switchableGroups.length > 0;

  useEffect(() => {
    if (!showGroupFlow) {
      if (pageIndex !== 0) setPageIndex(0);
      return;
    }

    if (!activeGroup && switchableGroups.length > 0) {
      void setActiveGroup(switchableGroups[0].id);
    }
  }, [showGroupFlow, activeGroup, switchableGroups, setActiveGroup, pageIndex]);

  useEffect(() => {
    if (!showGroupFlow) return;
    if (routeTab === "recycling") {
      setPageIndex(1);
      if (routeGroupId && routeGroupId !== activeGroupId) {
        void setActiveGroup(routeGroupId);
      }
    }
  }, [routeTab, routeGroupId, showGroupFlow, activeGroupId, setActiveGroup]);

  // recyclingTypes now comes from RecyclingTypesContext

  const handleAddRecyclingType = async (item: { id: string; type: string; xp: number }) => {
    if (!activeGroupId) return;

    const isEcopontoType = String(item.type).trim().toLowerCase() === "descarte em ecoponto";
    const location = isEcopontoType ? await captureRecyclingEvidenceLocation("descarte em ecoponto na Home") : null;
    if (isEcopontoType && !location) return;

    const photoUrl = await captureRecyclingEvidencePhoto("registro da Home");
    if (!photoUrl) return;

    try {
      const currentUser = auth.currentUser;
      console.info("[Home][Evidence] saving", {
        typeId: item.id,
        type: item.type,
        groupId: activeGroupId,
        hasLocation: Boolean(location),
      });

      await addRecyclingAction({
        type: item.type,
        typeId: item.id,
        xpEarned: item.xp,
        groupId: activeGroupId,
        photoUrl,
        ...(location
          ? {
              locationLabel: location.locationLabel,
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : {}),
        authorName: currentUser?.displayName?.trim() || currentUser?.email?.split("@")[0] || "Você",
      });
      await awardXpToActiveGroup(item.xp);
      console.info("[Home][Evidence] saved", { typeId: item.id, groupId: activeGroupId });
      Alert.alert("Evidência registrada", "Seu registro foi salvo com sucesso.");
    } catch (error) {
      console.error("[Home][Evidence] failed to save", {
        typeId: item.id,
        groupId: activeGroupId,
        error,
      });
      Alert.alert("Falha ao registrar evidência", "Não foi possível salvar este registro agora. Verifique a conexão e tente novamente.");
    }
  };

  const [recyclingTypeModalVisible, setRecyclingTypeModalVisible] = useState(false);
  const [recyclingNewTypeName, setRecyclingNewTypeName] = useState("");
  const [recyclingNewTypeIcon, setRecyclingNewTypeIcon] = useState("bottle-soda-outline");
  const [recyclingNewTypeHint, setRecyclingNewTypeHint] = useState("");

  const handleCreateRecyclingType = async () => {
    if (!recyclingNewTypeName.trim()) return;
    await addRecyclingType({ type: recyclingNewTypeName.trim(), icon: recyclingNewTypeIcon, hint: recyclingNewTypeHint.trim(), isCustom: true });
    setRecyclingNewTypeName("");
    setRecyclingNewTypeIcon("bottle-soda-outline");
    setRecyclingNewTypeHint("");
    setRecyclingTypeModalVisible(false);
  };

  // Ensure a convenient "Descarte em ecoponto" category exists and points to maps.
  // If a lowercased/old variant exists (e.g. "descarte em ecoponto" with 20 XP),
  // replace it with a properly capitalized custom type with 50 XP.
  useEffect(() => {
    const ensureEcoponto = async () => {
      try {
        const lowerKey = "descarte em ecoponto";
        const existing = recyclingTypes.find((t) => String(t.type).trim().toLowerCase() === lowerKey);

        if (existing) {
          ecopontoEnsuredRef.current = true;
          const needsRename = String(existing.type).trim() !== "Descarte em ecoponto";
          const needsXp = Number(existing.xp || 0) < 50;

          if ((needsRename || needsXp) && existing.isCustom) {
            try {
              await deleteRecyclingType(existing.id);
            } catch {
              // ignore
            }
            try {
              await addRecyclingType({ type: "Descarte em ecoponto", icon: existing.icon || "map-marker", hint: existing.hint || "Ver locais próximos para descarte", isCustom: true, xp: 50 });
            } catch {
              // ignore
            }
          } else if ((needsRename || needsXp) && !existing.isCustom) {
            // Default (non-custom) entry found with wrong casing/xp — add a custom corrected one.
            try {
              await addRecyclingType({ type: "Descarte em ecoponto", icon: existing.icon || "map-marker", hint: existing.hint || "Ver locais próximos para descarte", isCustom: true, xp: 50 });
            } catch {
              // ignore
            }
          }

          return;
        }

        if (ecopontoEnsuredRef.current) return;
        ecopontoEnsuredRef.current = true;
        await addRecyclingType({ type: "Descarte em ecoponto", icon: "map-marker", hint: "Ver locais próximos para descarte", isCustom: true, xp: 50 });
      } catch (e) {
        /* ignore */
      }
    };

    void ensureEcoponto();
  }, [recyclingTypes, addRecyclingType, deleteRecyclingType]);

  const orderedRecyclingTypes = useMemo(() => {
    const key = "descarte em ecoponto";
    const lowerKey = key.toLowerCase();
    const seen = new Set<string>();
    const uniqueTypes = recyclingTypes.filter((type) => {
      const normalizedType = String(type.type).trim().toLowerCase();
      if (seen.has(normalizedType)) {
        return false;
      }
      seen.add(normalizedType);
      return true;
    });
    const found = uniqueTypes.find((t) => String(t.type).toLowerCase() === lowerKey);
    if (!found) return uniqueTypes;
    return [found, ...uniqueTypes.filter((t) => t.id !== found.id)];
  }, [recyclingTypes]);

  const isEcopontoType = (typeName: string) => String(typeName).trim().toLowerCase() === "descarte em ecoponto";

  const goToPreviousGroup = async () => {
    if (!switchableGroups.length || currentGroupIndex <= 0) return;
    await setActiveGroup(switchableGroups[currentGroupIndex - 1].id);
  };

  const goToNextGroup = async () => {
    if (!switchableGroups.length || currentGroupIndex < 0 || currentGroupIndex >= switchableGroups.length - 1) return;
    await setActiveGroup(switchableGroups[currentGroupIndex + 1].id);
  };

  const openAllGroups = () => {
    (navigation as any).navigate("MeusGrupos");
  };

  const openCurrentGroupRanking = () => {
    if (!currentGroup) return;
    (navigation as any).navigate("MeusGrupos", { groupId: currentGroup.id, tab: "stats" });
  };

  const openMapsScreen = () => {
    (navigation as any).navigate("Mapas");
  };

  // Animated progress
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 700,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, zIndex: 40 }} pointerEvents="box-none">
        <View style={{ height: insets.top + 10 }} />
        <View style={{ height: 64 - insets.top - 10, paddingHorizontal: 12, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={() => drawerNavigation.dispatch(drawerOpen ? DrawerActions.closeDrawer() : DrawerActions.openDrawer())}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.panel,
              borderWidth: 1,
              borderColor: palette.cardBorder,
            }}
          >
            <Ionicons name={drawerOpen ? "close" : "menu"} size={20} color={palette.textPrimary} />
          </TouchableOpacity>

          {showGroupFlow ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                onPress={() => horizontalRef.current?.scrollTo({ x: 0, animated: true })}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: pageIndex === 0 ? (inGoal ? palette.recycleAccent : palette.danger) : palette.panelAlt,
                }}
              />
              <TouchableOpacity
                onPress={() => horizontalRef.current?.scrollTo({ x: width, animated: true })}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: pageIndex === 1 ? palette.recycleAccent : palette.panelAlt,
                }}
              />
            </View>
          ) : null}

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
              borderColor: palette.cardBorder,
            }}
          >
            <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="notifications-outline" size={20} color={palette.textPrimary} />
              {notificationBadgeCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -10,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 999,
                    paddingHorizontal: 5,
                    backgroundColor: palette.recycleAccent,
                    borderWidth: 2,
                    borderColor: palette.panel,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.18,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 2,
                  }}
                >
                  <Text style={{ color: palette.panel, fontSize: 10, lineHeight: 12, fontWeight: "900" }}>
                    {notificationBadgeCount === 99 ? "99+" : notificationBadgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
        </View>
      </View>
      <ScrollView
        ref={horizontalRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setPageIndex(nextIndex);
        }}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <View style={{ width, flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 }}>
        <Animated.View style={{ padding: 20, opacity: mountAnim, transform: [{ translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>

        {/* Hero card */}
        <View
          style={{
            backgroundColor: palette.panel,
            borderRadius: 28,
            paddingVertical: 18,
            paddingHorizontal: 18,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: palette.textSecondary, letterSpacing: 1, fontSize: 11, fontWeight: "700" }}>
                CONSUMIDO HOJE
              </Text>
              <Text style={{ fontSize: 34, lineHeight: 38, fontWeight: "900", color: palette.textPrimary, marginTop: 4 }}>
                {todayTotal.toFixed(0)}g
              </Text>
              <Text style={{ color: palette.textSecondary, marginTop: 4, fontSize: 12 }}>
                {inGoal ? `${heroGoal - todayTotal}g restantes` : `${todayTotal - heroGoal}g acima da meta`}
              </Text>
            </View>

            <Image source={require("../assets/images/estrela-do-mar.png")} style={{ width: 168, height: 168, marginLeft: 8 }} contentFit="contain" />
            </View>

          <View style={{ backgroundColor: inGoal ? palette.recycleSoft : palette.dangerSoft, borderWidth: 1, borderColor: inGoal ? palette.recycleLine : palette.danger, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, alignSelf: "flex-start", marginBottom: 12 }}>
              <Text style={{ color: inGoal ? palette.recycleAccent : palette.danger, fontWeight: "700", fontSize: 12 }}>{inGoal ? "Dentro da meta" : "Meta excedida"}</Text>
            </View>
            {showZeroConfirmationPrompt ? (
              <View style={{ backgroundColor: palette.panelAlt, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 14 }}>Hoje foi um dia sem plástico?</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                  Confirme para registrar um dia realmente zerado. Dias sem resposta seguem como informação ausente.
                </Text>
                <Button
                  mode="contained"
                  onPress={async () => {
                    await confirmZeroConsumption(currentDayKey);
                  }}
                  buttonColor={palette.recycleAccent}
                  textColor={palette.bg}
                  style={{ marginTop: 12, alignSelf: "flex-start", borderRadius: 999 }}
                >
                  Confirmar dia sem consumo
                </Button>
              </View>
            ) : todayZeroConfirmed ? (
              <View style={{ backgroundColor: palette.recycleSoft, borderWidth: 1, borderColor: palette.recycleLine, borderRadius: 18, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 14 }}>Dia sem consumo confirmado</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                  Hoje está contado como zero porque você confirmou isso explicitamente.
                </Text>
                <Button
                  mode="outlined"
                  onPress={async () => {
                    await clearZeroConsumptionConfirmation(currentDayKey);
                  }}
                  textColor={palette.textPrimary}
                  style={{ marginTop: 12, alignSelf: "flex-start", borderRadius: 999 }}
                >
                  Desfazer confirmação
                </Button>
              </View>
            ) : null}
            <View>
          </View>
        </View>


        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <QuickActions
            onPressHistory={() => (navigation as any).navigate("Registros")}
            onPressPlus={() => setModalVisible(true)}
            onPressStats={() => (navigation as any).navigate("Estatísticas")}
            showGroupControls={false}
            historyColor={inGoal ? palette.recycleAccent : palette.danger}
            plusColor={inGoal ? palette.recycleAccent : palette.danger}
            statsColor={inGoal ? palette.recycleAccent : palette.danger}
            borderColor={inGoal ? "transparent" : "transparent"}
            backgroundColor={inGoal ? "transparent" : "transparent"}
          />
          
          <TouchableOpacity
          onPress={() => {
            if (hasEntryToday) {
              Alert.alert(
                "Meta bloqueada",
                "Você já registrou consumo hoje. A meta só pode ser editada no início de um novo dia.",
                [{ text: "Entendi", style: "cancel" }]
              );
              return;
            }
            setGoalInput(String(goalGrams ?? ""));
            setGoalLabel("");
            setGoalModalVisible(true);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-end",
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: hasEntryToday ? palette.cardBorder : (inGoal ? palette.recycleLine : palette.consLine),
            backgroundColor: hasEntryToday ? palette.panelAlt : (inGoal ? palette.recycleSoft : palette.consSoft),
            opacity: hasEntryToday ? 0.6 : 1,
          }}
        >
          <MaterialCommunityIcons name="target" size={14} color={inGoal ? palette.recycleAccent : palette.danger} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: inGoal ? palette.recycleAccent : palette.danger }}>
            Meta: {heroGoal}g
          </Text>
        </TouchableOpacity>
        </View>
        

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {categories.map((category) => (
            <View key={category.id} style={{ width: (width - 48) / 2, marginBottom: 12 }}>
              {(() => {
                const cardBg = palette.panel;
                const border = category.isCustom ? (inGoal ? palette.recycleAccent : palette.danger) : palette.cardBorder;
                const iconBg = palette.panelAlt;
                const iconColor = inGoal ? palette.recycleAccent : palette.danger;
                const weightColor = inGoal ? palette.recycleAccent : palette.danger;
                const addColor = inGoal ? palette.recycleAccent : palette.danger;
                return (
                  <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: border, overflow: "hidden", minHeight: 212, justifyContent: "space-between" }}>
                    <View style={{ marginBottom: 8, minHeight: 108, justifyContent: "flex-start" }}>
                      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                        <MaterialCommunityIcons name={category.icon as any} size={20} color={iconColor} />
                      </View>
                      <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 15, lineHeight: 18 }} numberOfLines={2}>{category.name}</Text>
                      <Text style={{ color: weightColor, fontWeight: "700", marginTop: 4, fontSize: 13 }}>{category.weightGrams}g</Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: border, opacity: 0.7, marginBottom: 8 }} />

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", minHeight: 36 }}>
                      <TouchableOpacity
                        onPress={() => handleAddByCategory(category.weightGrams)}
                        style={{ flex: 1, minWidth: 0, minHeight: 32, borderWidth: 1, borderColor: addColor, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, backgroundColor: addColor, alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ color: palette.panel, fontWeight: "700", fontSize: 11 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>+ adicionar</Text>
                      </TouchableOpacity>

                      {category.isCustom ? (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert("Remover categoria", "Deseja remover esta categoria personalizada?", [
                              { text: "Cancelar", style: "cancel" },
                              { text: "Remover", style: "destructive", onPress: async () => await deleteCategory(category.id) },
                            ]);
                          }}
                          style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center", backgroundColor: palette.panelAlt, flexShrink: 0, marginLeft: 2 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={15} color={palette.textPrimary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })()}
            </View>
          ))}
        </View>

      </Animated.View>
        </ScrollView>
      </View>
<Modal visible={modalVisible} transparent={true} animationType="slide">
  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
    <View style={{ backgroundColor: palette.modalSurface, borderColor: palette.cardBorder, borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
      
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: palette.textPrimary }}>Nova categoria</Text>
          <Text style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}>Defina nome, peso e ícone. </Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="close" size={16} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Inputs */}
      <TextInput
        label="Nome da categoria"
        value={newCategoryName}
        onChangeText={setNewCategoryName}
        mode="outlined"
        style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
        theme={{ colors: { primary: palette.recycleAccent, onSurfaceVariant: palette.textMuted, onSurface: palette.textPrimary, outline: palette.cardBorder } }}
      />
      <TextInput
        label="Peso em gramas"
        value={newCategoryWeight}
        onChangeText={setNewCategoryWeight}
        keyboardType="numeric"
        mode="outlined"
        style={{ marginBottom: 20, backgroundColor: palette.modalInput }}
        theme={{ colors: { primary: palette.recycleAccent, onSurfaceVariant: palette.textMuted, onSurface: palette.textPrimary, outline: palette.cardBorder } }}
      />

      {/* Ícones */}
<Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: palette.textSecondary, marginBottom: 8 }}>ÍCONE</Text>
<Text style={{ fontSize: 11, color: palette.textMuted, marginBottom: 12 }}>
  <MaterialCommunityIcons name="gesture-swipe-horizontal" size={12} color={palette.textMuted} /> Deslize para ver mais
</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }} style={{ marginBottom: 24 }}>
  {ICON_OPTIONS.map((icon) => {
    const selected = newCategoryIcon === icon;
    return (
      <TouchableOpacity
        key={icon}
        onPress={() => setNewCategoryIcon(icon)}
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? (inGoal ? palette.recycleSoft : palette.consSoft) : palette.panelAlt,
          borderWidth: 1.5,
          borderColor: selected ? (inGoal ? palette.recycleAccent : palette.danger) : "transparent",
        }}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={selected ? (inGoal ? palette.recycleAccent : palette.danger) : palette.textMuted}
        />
      </TouchableOpacity>
    );
  })}
</ScrollView>

      {/* Botões */}
      <Button
        mode="contained"
        buttonColor={
          !newCategoryName.trim() || !newCategoryWeight.trim()
            ? palette.panelAlt
            : inGoal ? palette.recycleAccent : palette.danger
        }
        textColor={
          !newCategoryName.trim() || !newCategoryWeight.trim()
            ? palette.textMuted
            : palette.panel
        }
        onPress={() => {
          if (!newCategoryName.trim() || !newCategoryWeight.trim()) return;
          handleAddCategory();
        }}
        style={{ borderRadius: 14, marginBottom: 8 }}
        contentStyle={{ paddingVertical: 4 }}
      >
        Criar categoria
      </Button>
    </View>
  </View>
</Modal>
      
      <Modal visible={goalModalVisible} transparent={true} animationType="slide">
  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
    <View style={{ backgroundColor: palette.modalSurface, borderColor: palette.panelAlt, borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
      
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: palette.textPrimary }}>Meta diária de plástico</Text>
          <Text style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}>Defina quanto plástico você quer limitar por dia.</Text>
        </View>
        <TouchableOpacity onPress={() => setGoalModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="close" size={16} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Presets */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Mínimo", value: 50, hint: "50g" },
          { label: "Moderado", value: 100, hint: "100g" },
          { label: "Flexível", value: 200, hint: "200g" },
          { label: "Alto", value: 500, hint: "500g" },
        ].map((preset) => {
          const selected = goalInput === String(preset.value);
          return (
            <TouchableOpacity
              key={preset.value}
              onPress={() => { setGoalInput(String(preset.value)); setGoalLabel(preset.label); }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: selected ? palette.recycleAccent : palette.cardBorder,
                backgroundColor: selected ? palette.recycleSoft : palette.panelAlt,
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 13, color: selected ? palette.recycleAccent : palette.textSecondary }}>{preset.hint}</Text>
              <Text style={{ fontSize: 10, color: selected ? palette.recycleAccent : palette.textMuted, marginTop: 1 }}>{preset.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Input personalizado */}
      <Text style={{ fontSize: 12, fontWeight: "700", color: palette.textSecondary, letterSpacing: 0.8, marginBottom: 10 }}>OU VALOR PERSONALIZADO</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <TextInput
          label="Gramas por dia"
          value={goalInput}
          onChangeText={(v) => { setGoalInput(v); setGoalLabel(""); }}
          keyboardType="numeric"
          mode="outlined"
          style={{ flex: 1, backgroundColor: palette.modalInput }}
          theme={{
            colors: {
              primary: palette.recycleAccent,        // cor da borda e label quando focado
              onSurfaceVariant: palette.textMuted,   // cor do label quando não focado
              onSurface: palette.textPrimary,        // cor do texto digitado
              outline: palette.cardBorder,           // cor da borda quando não focado
            },
          }}
        />
      </View>

      {/* Preview */}
      {goalInput && Number(goalInput) > 0 ? (
        <View style={{ backgroundColor: palette.recycleSoft, borderWidth: 1, borderColor: palette.recycleLine, borderRadius: 14, padding: 12, marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name="target" size={20} color={palette.recycleAccent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.recycleAccent, fontWeight: "800", fontSize: 13 }}>
              Meta: {Number(goalInput)}g/dia
              {goalLabel ? ` · ${goalLabel}` : ""}
            </Text>
            <Text style={{ color: palette.recycleAccent, fontSize: 11, marginTop: 1, opacity: 0.8 }}>
              Equivale a ~{(Number(goalInput) / 5).toFixed(0)} sacolas plásticas finas
            </Text>
          </View>
        </View>
      ) : null}

      {/* Ações */}
      <Button
        mode="contained"
        buttonColor={palette.recycleAccent}
        textColor={palette.panel}
        onPress={async () => {
          const v = Number(String(goalInput).replace(",", "."));
          if (!v || Number.isNaN(v) || v <= 0) {
            await setGoal(null);
          } else {
            await setGoal(Math.round(v));
          }
          setGoalModalVisible(false);
        }}
        style={{ marginBottom: 10, borderRadius: 14 }}
        contentStyle={{ paddingVertical: 4 }}
      >
        Salvar meta
      </Button>

      {goalGrams ? (
        <Button
          mode="text"
          textColor={palette.textSecondary}
          onPress={async () => {
            await setGoal(null);
            setGoalInput("");
            setGoalLabel("");
            setGoalModalVisible(false);
          }}
        >
          Meta padrão
        </Button>
      ) : (
        <Button textColor={palette.textSecondary} mode="text" onPress={() => setGoalModalVisible(false)}>Cancelar</Button>
      )}

    </View>
  </View>
</Modal>

        {/* Modal to create a new recycling type */}
        <Modal visible={recyclingTypeModalVisible} transparent={true} animationType="slide">
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: palette.modalSurface, borderColor: palette.panelAlt, borderWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 320 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12, color: palette.textPrimary }}>Criar categoria</Text>
              <TextInput label="Nome da categoria" value={recyclingNewTypeName} onChangeText={setRecyclingNewTypeName} mode="outlined" style={{ marginBottom: 12, backgroundColor: palette.modalInput, color: palette.textPrimary }} />
              <TextInput label="Descrição (opcional)" value={recyclingNewTypeHint} onChangeText={setRecyclingNewTypeHint} mode="outlined" style={{ marginBottom: 12, backgroundColor: palette.modalInput, color: palette.textPrimary }} />
              <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: palette.textPrimary }}>Ícone</Text>
              
      {/* Ícones */}
<Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: palette.textSecondary, marginBottom: 8 }}>ÍCONE</Text>
<Text style={{ fontSize: 11, color: palette.textMuted, marginBottom: 12 }}>
  <MaterialCommunityIcons name="gesture-swipe-horizontal" size={12} color={palette.textMuted} /> Deslize para ver mais
</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }} style={{ marginBottom: 24 }}>
  {ICON_OPTIONS.map((icon) => {
    const selected = newCategoryIcon === icon;
    return (
      <TouchableOpacity
        key={icon}
        onPress={() => setNewCategoryIcon(icon)}
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? (inGoal ? palette.recycleSoft : palette.consSoft) : palette.panelAlt,
          borderWidth: 1.5,
          borderColor: selected ? (inGoal ? palette.recycleAccent : palette.danger) : "transparent",
        }}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={selected ? (inGoal ? palette.recycleAccent : palette.danger) : palette.textMuted}
        />
      </TouchableOpacity>
    );
  })}
</ScrollView>

              <Button mode="contained" textColor={palette.textPrimary} onPress={handleCreateRecyclingType} style={{ marginBottom: 10, backgroundColor: palette.panelAlt }}>Criar categoria</Button>
              <Button mode="text" textColor={palette.textSecondary} onPress={() => setRecyclingTypeModalVisible(false)}>Cancelar</Button>
            </View>
          </View>
        </Modal>

      {showGroupFlow ? (
        <View style={{ width, flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 64, padding: 20, paddingBottom: insets.bottom + 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, position: "relative" }}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={{ color: palette.textSecondary, letterSpacing: 1, fontSize: 11, fontWeight: "700" }}>
                  GRUPO ATIVO
                </Text>
                <Text style={{ fontSize: isCompactWidth ? 24 : 28, lineHeight: isCompactWidth ? 28 : 32, fontWeight: "900", color: palette.textPrimary, marginTop: 4 }}>
                  {currentGroup?.name || "Selecione um grupo"}
                </Text>
                <Text style={{ color: palette.textSecondary, marginTop: 4, fontSize: 12 }}>
                  Use os atalhos para trocar de grupo, ver todos e abrir o ranking.
                </Text>
              </View>

              <Image
                source={require("../assets/images/planeta.png")}
                style={{ width: isCompactWidth ? 150 : 140, height: isCompactWidth ? 140 : 168, flexShrink: 0, marginTop: isCompactWidth ? 0 : 6 }}
                contentFit="contain"
              />
            </View>

            {currentGroup ? (
              <TouchableOpacity onPress={openCurrentGroupRanking} activeOpacity={0.86} style={{ backgroundColor: rankingCardStyle?.backgroundColor || palette.panel, borderWidth: 1, borderColor: rankingCardStyle?.borderColor || palette.panelAlt, borderRadius: 18, padding: 13, marginBottom: 14 }}>
                {currentUserRanking ? (
                      (() => {
                        const pos = currentUserRanking.position;
                        const nameText = `#${pos} ${currentUserRanking.member.name}`;
                        const xpText = `${currentUserRanking.member.totalXp} XP`;
                        const styleVars = rankingCardStyle || { backgroundColor: palette.panel, borderColor: palette.panelAlt, xpColor: palette.recycleAccent, trophyColor: palette.recycleAccent };
                        return (
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                                    {pos === 1 ? (
                                      <MaterialCommunityIcons name="trophy" size={18} color={styleVars.trophyColor as any} />
                                    ) : null}
                                    {pos <= 3 ? (
                                      <MaterialCommunityIcons name="medal" size={16} color={(styleVars as any).medalColor || (styleVars.trophyColor as any)} />
                                    ) : null}
                                    <Text style={{ color: palette.textPrimary, fontWeight: "800", flex: 1 }} numberOfLines={1}>{nameText}</Text>
                                  </View>
                            </View>
                            <Text style={{ color: (styleVars.xpColor as string) || palette.recycleAccent, fontWeight: "800", flexShrink: 0 }}>{xpText}</Text>
                          </View>
                        );
                      })()
                    ) : (
                      <Text style={{ color: palette.textMuted, fontSize: 12 }}>Sua posição ainda não apareceu neste grupo.</Text>
                    )}
              </TouchableOpacity>
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <QuickActions
                onPressHistory={() => (navigation as any).navigate("Registros", { tab: "recycling" })}
                onPressPlus={() => setRecyclingTypeModalVisible(true)}
                onPressPrevGroup={goToPreviousGroup}
                onPressNextGroup={goToNextGroup}
                onPressAllGroups={openAllGroups}
                showGroupControls={true}
                canGoPrev={currentGroupIndex > 0}
                canGoNext={currentGroupIndex >= 0 && currentGroupIndex < switchableGroups.length - 1}
                historyColor={palette.recycleAccent}
                plusColor={palette.recycleAccent}
                borderColor={palette.recycleLine}
                backgroundColor={palette.panel}
              />
              
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {orderedRecyclingTypes.map((item) => (
                <View key={item.id} style={{ width: (width - 48) / 2, marginBottom: 12 }}>
                  {(() => {
                    const cardBg = palette.panel;
                    const ecoponto = isEcopontoType(item.type);
                    const border = palette.cardBorder;
                    const iconBg = palette.panelAlt;
                    const iconColor = palette.recycleAccent;
                    const weightColor = palette.recycleAccent;
                    const addColor = palette.recycleAccent;
                    return (
                      <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: border, overflow: "hidden", minHeight: 212, justifyContent: "space-between" }}>
                        <View style={{ marginBottom: 8, minHeight: 108, justifyContent: "flex-start" }}>
                          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                            <MaterialCommunityIcons name={item.icon as any} size={20} color={iconColor} />
                          </View>
                          <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 15, lineHeight: 18 }} numberOfLines={2}>{item.type}</Text>
                          <Text style={{ color: weightColor, fontWeight: "700", marginTop: 4, fontSize: 13 }}>{item.xp} XP</Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: border, opacity: 0.7, marginBottom: 8 }} />

                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", minHeight: 36 }}>
                          <TouchableOpacity
                            onPress={() => handleAddRecyclingType(item)}
                            style={{ flex: 1, minWidth: 0, minHeight: 32, borderWidth: 1, borderColor: addColor, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, backgroundColor: addColor, alignItems: "center", justifyContent: "center" }}
                          >
                            <Text style={{ color: palette.panel, fontWeight: "700", fontSize: 11 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>+ adicionar</Text>
                          </TouchableOpacity>

                          {ecoponto ? (
                            <TouchableOpacity
                              onPress={openMapsScreen}
                              style={{ marginTop: 8, alignItems: "center", justifyContent: "center", minHeight: 32, paddingHorizontal: 10 }}
                            >
                              <MaterialCommunityIcons name="map-marker-outline" size={18} color={palette.recycleAccent} />
                            </TouchableOpacity>
                          ) : item.isCustom ? (
                            <TouchableOpacity
                              onPress={() => {
                                Alert.alert("Remover tipo", "Deseja remover este tipo de reciclagem personalizado?", [
                                  { text: "Cancelar", style: "cancel" },
                                  { text: "Remover", style: "destructive", onPress: async () => await deleteRecyclingType(item.id) },
                                ]);
                              }}
                              style={{ marginTop: 8, alignItems: "flex-end" }}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={16} color={palette.danger} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })()}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

    </ScrollView>
    </View>
  );
}
