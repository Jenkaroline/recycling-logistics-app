import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
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
import { toLocalDayKey, useCurrentDayKey } from "../src/useCurrentDayKey";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../service/firebaseConfig";

type QuickActionsProps = {
  onPressHistory: () => void;
  onPressPlus: () => void;
  historyColor: string;
  plusColor: string;
  borderColor: string;
  backgroundColor: string;
};

function QuickActions({
  onPressHistory,
  onPressPlus,
  historyColor,
  plusColor,
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
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const { entries, addEntry, totalGrams, goalGrams, setGoal } = usePlasticConsumption();
  const { categories, addCategory, deleteCategory } = usePlasticCategories();
  const { entries: recyclingEntries, addAction: addRecyclingAction, deleteAction: deleteRecyclingAction } = useRecycling();
  const { activeGroupId, awardXpToActiveGroup } = useRecyclingCompetition();
  const { types: recyclingTypes, addType: addRecyclingType, deleteType: deleteRecyclingType } = useRecyclingTypes();
  const { darkModeEnabled } = useThemePreference();

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
  const currentDayKey = useCurrentDayKey();

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
    "shopping-outline",
    "bottle-soda-outline",
    "bowl-outline",
    "package-variant-closed",
    "cup-straw-outline",
    "silverware-fork-knife",
    "compact-disc",
    "headphones",
    "flask-outline",
    "gift-outline",
  ];

  const { width } = useWindowDimensions();
  const cardPadding = 18;
  const heroGoal = goalGrams ?? 50;
  const progress = Math.min(1, todayTotal / (heroGoal || 1));
  const inGoal = heroGoal ? todayTotal <= heroGoal : true;
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goalGrams ?? ""));
  const [pageIndex, setPageIndex] = useState(0);
  const horizontalRef = useRef<ScrollView>(null);

  // recyclingTypes now comes from RecyclingTypesContext

  const handleAddRecyclingType = async (item: { id: string; type: string; xp: number }) => {
    const currentUser = auth.currentUser;
    await addRecyclingAction({
      type: item.type,
      typeId: item.id,
      xpEarned: item.xp,
      groupId: activeGroupId,
      authorName: currentUser?.displayName?.trim() || currentUser?.email?.split("@")[0] || "Você",
    });
    await awardXpToActiveGroup(item.xp);
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

  // Ensure a convenient "descarte em ecoponto" category exists and points to maps
  useEffect(() => {
    const ensureEcoponto = async () => {
      try {
        const found = recyclingTypes.some((t) => String(t.type).toLowerCase() === "descarte em ecoponto");
        if (!found) {
          await addRecyclingType({ type: "descarte em ecoponto", icon: "map-marker", hint: "Ver locais próximos para descarte", isCustom: true });
        }
      } catch (e) {
        /* ignore */
      }
    };
    void ensureEcoponto();
  }, [recyclingTypes, addRecyclingType]);

  const orderedRecyclingTypes = useMemo(() => {
    const key = "descarte em ecoponto";
    const lowerKey = key.toLowerCase();
    const found = recyclingTypes.find((t) => String(t.type).toLowerCase() === lowerKey);
    if (!found) return recyclingTypes;
    return [found, ...recyclingTypes.filter((t) => t.id !== found.id)];
  }, [recyclingTypes]);

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
            onPress={() => navigation.dispatch(drawerOpen ? DrawerActions.closeDrawer() : DrawerActions.openDrawer())}
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
            <Ionicons name="notifications-outline" size={20} color={palette.textPrimary} />
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
            <View>
            <View style={{ height: 10, backgroundColor: palette.panelAlt, borderRadius: 999, overflow: "hidden" }}>
              <Animated.View
                style={{
                  width: animatedProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  height: "100%",
                  backgroundColor: inGoal ? palette.recycleAccent : palette.danger,
                }}
              />
            </View>
            <Text onPress={() => { setGoalInput(String(goalGrams ?? "")); setGoalModalVisible(true); }} style={{ color: inGoal ? palette.recycleAccent : palette.danger, marginTop: 8, fontSize: 12, fontWeight: "700" }}>meta: {heroGoal}g</Text>
          </View>
        </View>


        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <QuickActions
            onPressHistory={() => (navigation as any).navigate("Registros")}
            onPressPlus={() => setModalVisible(true)}
            historyColor={inGoal ? palette.recycleAccent : palette.danger}
            plusColor={inGoal ? palette.recycleAccent : palette.danger}
            borderColor={inGoal ? "transparent" : "transparent"}
            backgroundColor={inGoal ? "transparent" : "transparent"}
          />
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
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: palette.modalSurface, borderColor: palette.panelAlt, borderWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 300 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 16, color: palette.textPrimary }}>Criar categoria</Text>

            <TextInput label="Nome da categoria" value={newCategoryName} onChangeText={setNewCategoryName} mode="outlined" style={{ marginBottom: 12, backgroundColor: palette.modalInput }} />

            <TextInput label="Peso em gramas" value={newCategoryWeight} onChangeText={setNewCategoryWeight} keyboardType="numeric" mode="outlined" style={{ marginBottom: 12, backgroundColor: palette.modalInput }} />

            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: palette.textPrimary }}>Escolha um ícone:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity key={icon} onPress={() => setNewCategoryIcon(icon)} style={{ width: "20%", paddingVertical: 8, alignItems: "center", backgroundColor: newCategoryIcon === icon ? palette.modalChip : palette.modalChipIdle, borderRadius: 8, marginBottom: 8 }}>
                  <MaterialCommunityIcons name={icon as any} size={28} color={newCategoryIcon === icon ? palette.modalChipText : palette.modalChipMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <Button mode="contained" buttonColor={inGoal ? palette.recycleAccent : palette.danger} textColor={palette.panel} onPress={handleAddCategory} disabled={!newCategoryName.trim() || !newCategoryWeight.trim()} style={{ marginBottom: 10 }}>Criar</Button>

            <Button mode="text" onPress={() => setModalVisible(false)}>Cancelar</Button>
          </View>
        </View>
      </Modal>
      
      <Modal visible={goalModalVisible} transparent={true} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: palette.modalSurface, borderColor: palette.panelAlt, borderWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 220 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 16, color: palette.textPrimary }}>Editar meta diária (g)</Text>

            <TextInput label="Meta em gramas" value={goalInput} onChangeText={setGoalInput} keyboardType="numeric" mode="outlined" style={{ marginBottom: 12, backgroundColor: palette.modalInput }} />

            <Button mode="contained" onPress={async () => {
              const v = Number(String(goalInput).replace(",", "."));
              if (!v || Number.isNaN(v) || v <= 0) {
                await setGoal(null);
                setGoalModalVisible(false);
                return;
              }
              await setGoal(Math.round(v));
              setGoalModalVisible(false);
            }} style={{ marginBottom: 10 }}>Salvar</Button>

            <Button mode="text" onPress={() => setGoalModalVisible(false)}>Cancelar</Button>
          </View>
        </View>
      </Modal>

        {/* Modal to create a new recycling type */}
        <Modal visible={recyclingTypeModalVisible} transparent={true} animationType="slide">
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: palette.modalSurface, borderColor: palette.panelAlt, borderWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 320 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12, color: palette.textPrimary }}>Criar categoria</Text>
              <TextInput label="Nome da categoria" value={recyclingNewTypeName} onChangeText={setRecyclingNewTypeName} mode="outlined" style={{ marginBottom: 12, backgroundColor: palette.modalInput }} />
              <TextInput label="Descrição (opcional)" value={recyclingNewTypeHint} onChangeText={setRecyclingNewTypeHint} mode="outlined" style={{ marginBottom: 12, backgroundColor: palette.modalInput }} />
              <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: palette.textPrimary }}>Ícone</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity key={icon} onPress={() => setRecyclingNewTypeIcon(icon)} style={{ width: "20%", paddingVertical: 8, alignItems: "center", backgroundColor: recyclingNewTypeIcon === icon ? palette.modalChip : palette.modalChipIdle, borderRadius: 8, marginBottom: 8 }}>
                    <MaterialCommunityIcons name={icon as any} size={28} color={recyclingNewTypeIcon === icon ? palette.modalChipText : palette.modalChipMuted} />
                  </TouchableOpacity>
                ))}
              </View>
              <Button mode="contained" onPress={handleCreateRecyclingType} disabled={!recyclingNewTypeName.trim()} style={{ marginBottom: 10 }}>Criar categoria</Button>
              <Button mode="text" onPress={() => setRecyclingTypeModalVisible(false)}>Cancelar</Button>
            </View>
          </View>
        </Modal>

        

      <View style={{ width, flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 64, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12, position: "relative" }}>
            <View style={{ flex: 1, paddingRight: 160 }}>
              <Text style={{ color: palette.textSecondary, letterSpacing: 1, fontSize: 11, fontWeight: "700" }}>
                RECICLAGEM
              </Text>
              <Text style={{ fontSize: 28, lineHeight: 32, fontWeight: "900", color: palette.textPrimary, marginTop: 4 }}>
                Registrar ações
              </Text>
              <Text style={{ color: palette.textSecondary, marginTop: 4, fontSize: 12 }}>
                Deslize para a esquerda para voltar.
              </Text>
            </View>

            <Image
              source={require("../assets/images/planeta.png")}
              style={{ position: "absolute", right: 12, top: 6, width: 140, height: 168 }}
              contentFit="contain"
            />
          </View>

          <View style={{ backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.panelAlt, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, alignSelf: "flex-start", marginBottom: 8 }}>
            <Text style={{ color: palette.textPrimary, fontWeight: "700", fontSize: 12 }}>{recyclingEntries.length} registros</Text>
          </View>

          <View style={{ flexDirection: "column", marginBottom: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <QuickActions
                onPressHistory={() => (navigation as any).navigate("Registros", { tab: "recycling" })}
                onPressPlus={() => setRecyclingTypeModalVisible(true)}
                historyColor={palette.recycleAccent}
                plusColor={palette.recycleAccent}
                borderColor={palette.recycleLine}
                backgroundColor={palette.panel}
              />
            </View>

            {orderedRecyclingTypes.map((item) => (
              <View key={item.id} style={{ width: "100%", marginBottom: 16 }}>
                <View style={{ backgroundColor: palette.panel, borderRadius: 16, padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: palette.recycleSoft, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={palette.recycleAccent} />                      
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>{item.type}</Text>
                      <Text style={{ color: palette.textSecondary, marginTop: 4, fontSize: 12 }}>{item.hint}</Text>
                    </View>
                    {(() => {
                      const isEcoponto = String(item.type).toLowerCase().includes("ecopont");
                      if (item.isCustom && !isEcoponto) {
                        return (
                          <TouchableOpacity onPress={() => {
                            Alert.alert("Remover tipo", "Deseja remover este tipo de reciclagem personalizado?", [
                              { text: "Cancelar", style: "cancel" },
                              { text: "Remover", style: "destructive", onPress: async () => await deleteRecyclingType(item.id) },
                            ]);
                          }} style={{ marginTop: 8, alignItems: "flex-end" }}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={palette.danger} />
                          </TouchableOpacity>
                        );
                      }
                      return null;
                    })()}
                  </View>

                  {(() => {
                    const isEcoponto = String(item.type).toLowerCase().includes("ecopont");
                    return (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => handleAddRecyclingType(item)}
                          style={{ backgroundColor: palette.panelAlt, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignItems: "center" }}
                        >
                          <Text style={{ color: palette.textSecondary, fontWeight: "500" }}>+ registrar</Text>
                        </TouchableOpacity>

                        {isEcoponto ? (
                          <TouchableOpacity
                            onPress={() => (navigation as any).navigate("Mapas")}
                            style={{ backgroundColor: "transparent", borderWidth: 0.4, borderColor: palette.recycleLine, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignItems: "center" }}
                          >
                            <Text style={{ color: palette.textSecondary, fontWeight: "500" }}>Ver locais</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })()}
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      </View>

    </ScrollView>
    </View>
  );
}
