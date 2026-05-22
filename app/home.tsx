import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useDrawerStatus } from "@react-navigation/drawer";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View, useWindowDimensions, Animated, Easing, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import { useSocial } from "../src/SocialContext";
import { Button, TextInput } from "react-native-paper";
import { usePlasticCategories } from "../src/PlasticCategoriesContext";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { toLocalDayKey, useCurrentDayKey } from "../src/useCurrentDayKey";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const { entries, addEntry, totalGrams } = usePlasticConsumption();
  const { categories, addCategory, deleteCategory } = usePlasticCategories();
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textSoft: "#d7ebff",
        borderStrong: "#1e3a57",
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
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textSoft: "#2f4a64",
        borderStrong: "#d7e5f2",
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
    "package-variant-outline",
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
    setNewCategoryIcon("package-variant-outline");
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
    "bottle-water-outline",
    "bowl-outline",
    "package-variant-outline",
    "straw",
    "silverware-fork-knife",
    "disc-outline",
    "headphones-outline",
    "flask-outline",
    "gift-outline",
  ];

  const { width } = useWindowDimensions();
  const cardPadding = 18;
  const heroGoal = 50;
  const progress = Math.min(1, todayTotal / heroGoal);
  const inGoal = todayTotal <= heroGoal;
  const { currentProfile, followingFeedPosts } = useSocial();

  const rankingParticipants = useMemo(() => {
    const latestByUser = new Map<string, { uid: string; username: string; avatarUrl?: string; totalGrams: number }>();

    followingFeedPosts
      .filter((post) => post.type === "achievement" && post.achievement)
      .forEach((post) => {
        const current = latestByUser.get(post.authorId);
        const totalGrams = Number(post.achievement?.totalGrams || 0);
        const createdAt = new Date(post.createdAt).getTime();
        const currentCreatedAt = current ? Number((current as any).createdAt || 0) : 0;

        if (!current || createdAt >= currentCreatedAt) {
          latestByUser.set(post.authorId, {
            uid: post.authorId,
            username: post.authorName || "Usuário",
            avatarUrl: post.authorAvatar,
            totalGrams,
            // keep timestamp for ordering the latest post per user
            createdAt: createdAt as any,
          } as any);
        }
      });

    if (currentProfile) {
      latestByUser.set(currentProfile.uid, {
        uid: currentProfile.uid,
        username: currentProfile.username || "Você",
        avatarUrl: currentProfile.avatarUrl,
        totalGrams,
        createdAt: Date.now() as any,
      } as any);
    }

    return [...latestByUser.values()].sort((a, b) => a.totalGrams - b.totalGrams);
  }, [followingFeedPosts, currentProfile, totalGrams]);

  const myRank = useMemo(() => {
    if (!currentProfile) return null;
    const index = rankingParticipants.findIndex((participant) => participant.uid === currentProfile.uid);
    return index >= 0 ? index + 1 : null;
  }, [rankingParticipants, currentProfile]);

  // Animated progress
  const animatedProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 700,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
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
              borderColor: palette.panelAlt,
            }}
          >
            <Ionicons name={drawerOpen ? "close" : "menu"} size={20} color={palette.textPrimary} />
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
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 64 }}>
        <View style={{ padding: 20 }}>
        {/* Hero card */}
        <View
          style={{
            backgroundColor: palette.panel,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: palette.panelAlt,
            overflow: "hidden",
          }}
        >
          {/* menu antigo removido — usamos header fixo no topo */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
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

            <View style={{ backgroundColor: inGoal ? "#0fd3b620" : "#ff8b9430", borderWidth: 1, borderColor: inGoal ? "#0fd3b665" : "#ff8b9470", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 }}>
              <Text style={{ color: inGoal ? "#0fd3b6" : "#ff8b94", fontWeight: "700", fontSize: 12 }}>{inGoal ? "Dentro da meta" : "Fora da meta"}</Text>
            </View>
          </View>

          <View>
            <View style={{ height: 10, backgroundColor: palette.panelAlt, borderRadius: 999, overflow: "hidden" }}>
              <Animated.View
                style={{
                  width: animatedProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  height: "100%",
                  backgroundColor: inGoal ? "#0fd3b6" : "#ff8b94",
                }}
              />
            </View>
            <Text style={{ color: palette.textSecondary, marginTop: 8, fontSize: 12 }}>meta: {heroGoal}g</Text>
          </View>
        </View>

        {/* Ranking strip */}
        <View style={{ marginBottom: 12, marginTop: 6 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 12, marginBottom: 8 }}>Sua posição</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.panelAlt, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                {currentProfile?.avatarUrl ? (
                  <Image source={currentProfile.avatarUrl} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
                ) : (
                  <Image source={require("../assets/images/icon.png")} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
                )}
              </View>
              <View>
                <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>{currentProfile?.username || "Você"}</Text>
                <Text style={{ color: palette.textSecondary }}>{myRank ? `#${myRank} de ${rankingParticipants.length || 1}` : "Sem ranking"}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 6 }}>
              {rankingParticipants.slice(0, 8).map((participant) => (
                <View key={participant.uid} style={{ marginLeft: 8, alignItems: "center" }}>
                  {participant.avatarUrl ? (
                    <Image source={participant.avatarUrl} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: palette.panelAlt }} contentFit="cover" />
                  ) : (
                    <Image source={require("../assets/images/icon.png")} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: palette.panelAlt }} contentFit="cover" />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "800" }}>REGISTRAR ITEM</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{ borderWidth: 1, borderColor: palette.panelAlt, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18 }}>
            <Text style={{ color: palette.textPrimary }}>+ novo item</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {categories.map((category) => (
            <View key={category.id} style={{ width: (width - 60) / 2, marginBottom: 14 }}>
              <View style={{ backgroundColor: palette.panel, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: palette.panelAlt }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <MaterialCommunityIcons name={category.icon as any} size={20} color="#36a3ff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>{category.name}</Text>
                    <Text style={{ color: "#05dbdb", fontWeight: "700", marginTop: 6 }}>{category.weightGrams}g</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: palette.panelAlt, marginVertical: 8 }} />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <TouchableOpacity onPress={() => handleAddByCategory(category.weightGrams)} style={{ backgroundColor: "transparent", borderWidth: 1, borderColor: palette.panelAlt, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 }}>
                    <Text style={{ color: palette.textPrimary }}>+ adicionar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (!category.isCustom) {
                        Alert.alert("Remover categoria", "Esta categoria faz parte das categorias padrão e não pode ser removida.");
                        return;
                      }
                      Alert.alert(
                        "Remover categoria",
                        `Tem certeza que deseja remover '${category.name}' permanentemente?`,
                        [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Remover",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await deleteCategory(category.id);
                              } catch (e) {
                                Alert.alert("Erro", "Não foi possível remover a categoria.");
                              }
                            },
                          },
                        ],
                      );
                    }}
                    style={{ backgroundColor: "transparent", borderWidth: 1, borderColor: palette.panelAlt, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 }}
                  >
                    <Text style={{ color: palette.textPrimary }}>-</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Link para a tela de registros */}
        <View style={{ marginTop: 8, alignItems: "flex-start" }}>
          <Button
            mode="contained"
            icon="history"
            buttonColor={palette.panelAlt}
            textColor={palette.textPrimary}
            onPress={() => (navigation as any).navigate("Registros")}
            contentStyle={{ paddingVertical: 8 }}
            style={{ borderRadius: 12, borderWidth: 1, borderColor: palette.panelAlt }}
          >
            Ver e editar registros
          </Button>
          <Text style={{ color: palette.textSecondary, marginTop: 8, fontSize: 12 }}>
            Toque para ver todos os seus registros e editá-los.
          </Text>
        </View>
      </View>

      {/* Modal for Creating Category */}
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

            <Button mode="contained" onPress={handleAddCategory} disabled={!newCategoryName.trim() || !newCategoryWeight.trim()} style={{ marginBottom: 10 }}>Criar</Button>

            <Button mode="text" onPress={() => setModalVisible(false)}>Cancelar</Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
}
