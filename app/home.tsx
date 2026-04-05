import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { usePlasticCategories } from "../src/PlasticCategoriesContext";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useThemePreference } from "../src/ThemePreferenceContext";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { entries, addEntry, totalGrams } = usePlasticConsumption();
  const { categories, addCategory } = usePlasticCategories();
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

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return entries
      .filter((entry) => new Date(entry.createdAt).toDateString() === today)
      .reduce((sum, entry) => sum + entry.amountGrams, 0);
  }, [entries]);

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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ padding: 20 }}>
        <Text style={{ color: palette.textSecondary, marginBottom: 16 }}>
          Escolha uma categoria ou crie uma customizada.
        </Text>

        {/* Total Today Card */}
        <View
          style={{
            backgroundColor: palette.panel,
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: palette.panelAlt,
          }}
        >
          <Text style={{ fontSize: 15, color: palette.textSecondary }}>
            Total hoje
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: palette.textPrimary,
            }}
          >
            {todayTotal.toFixed(0)} g
          </Text>
        </View>

        {/* Total Accumulated Card */}
        <View
          style={{
            backgroundColor: palette.panel,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: palette.panelAlt,
          }}
        >
          <Text style={{ fontSize: 15, color: palette.textSecondary }}>
            Total acumulado
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: palette.textPrimary,
            }}
          >
            {totalGrams.toFixed(0)} g
          </Text>
        </View>

        {/* Categories Grid */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 10,
            color: palette.textPrimary,
          }}
        >
          Categorias
        </Text>
        <View
          style={{
            backgroundColor: palette.panel,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: palette.panelAlt,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => handleAddByCategory(category.weightGrams)}
                style={{
                  width: "48%",
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  marginBottom: 8,
                  backgroundColor: palette.panelAlt,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons
                  name={category.icon as any}
                  size={28}
                  color="#36a3ff"
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    textAlign: "center",
                    color: palette.textPrimary,
                  }}
                >
                  {category.name}
                </Text>
                <Text style={{ fontSize: 11, color: palette.textSecondary }}>
                  {category.weightGrams}g
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Create Category Card */}
        <Button
          mode="outlined"
          onPress={() => setModalVisible(true)}
          textColor={palette.textSecondary}
          style={{ marginBottom: 16 }}
        >
          + Criar categoria customizada
        </Button>

        {/* Last Entries */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: palette.textPrimary,
            }}
          >
            Últimos registros
          </Text>
          {entries.length > 5 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("Registros")}
            >
              <Text style={{ color: "#36a3ff", fontWeight: "600" }}>
                Ver mais
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          style={{
            backgroundColor: palette.panel,
            borderRadius: 12,
            padding: 12,
            height: containerHeight,
            maxHeight: 250,
            borderWidth: 1,
            borderColor: palette.panelAlt,
          }}
          nestedScrollEnabled={true}
        >
          {lastEntries.length === 0 ? (
            <Text style={{ color: palette.textSecondary }}>
              Nenhum registro ainda.
            </Text>
          ) : (
            lastEntries.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: palette.borderStrong,
                }}
              >
                <Text style={{ color: palette.textSoft }}>
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </Text>
                <Text style={{ fontWeight: "700", color: palette.textPrimary }}>
                  {item.amountGrams} g
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Modal for Creating Category */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: palette.modalSurface,
              borderColor: palette.panelAlt,
              borderWidth: 1,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              minHeight: 300,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 16,
                color: palette.textPrimary,
              }}
            >
              Criar categoria
            </Text>

            <TextInput
              label="Nome da categoria"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
            />

            <TextInput
              label="Peso em gramas"
              value={newCategoryWeight}
              onChangeText={setNewCategoryWeight}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 8,
                color: palette.textPrimary,
              }}
            >
              Escolha um ícone:
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setNewCategoryIcon(icon)}
                  style={{
                    width: "20%",
                    paddingVertical: 8,
                    alignItems: "center",
                    backgroundColor:
                      newCategoryIcon === icon
                        ? palette.modalChip
                        : palette.modalChipIdle,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={28}
                    color={
                      newCategoryIcon === icon
                        ? palette.modalChipText
                        : palette.modalChipMuted
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleAddCategory}
              disabled={!newCategoryName.trim() || !newCategoryWeight.trim()}
              style={{ marginBottom: 10 }}
            >
              Criar
            </Button>

            <Button mode="text" onPress={() => setModalVisible(false)}>
              Cancelar
            </Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
