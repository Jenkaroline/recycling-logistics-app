import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { usePlasticCategories } from "../src/PlasticCategoriesContext";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { entries, addEntry, totalGrams } = usePlasticConsumption();
  const { categories, addCategory } = usePlasticCategories();

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
    await addEntry(weightGrams);
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
    <ScrollView style={{ flex: 1, backgroundColor: "#061526" }}>
      <View style={{ padding: 20 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 6,
            color: "#ffffff",
          }}
        >
          Registro de consumo
        </Text>
        <Text style={{ color: "#b7cde6", marginBottom: 16 }}>
          Escolha uma categoria ou crie uma customizada.
        </Text>

        {/* Total Today Card */}
        <View
          style={{
            backgroundColor: "#0c2740",
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: "#123252",
          }}
        >
          <Text style={{ fontSize: 15, color: "#b7cde6" }}>Total hoje</Text>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#eaf4ff" }}>
            {todayTotal.toFixed(0)} g
          </Text>
        </View>

        {/* Total Accumulated Card */}
        <View
          style={{
            backgroundColor: "#0c2740",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#123252",
          }}
        >
          <Text style={{ fontSize: 15, color: "#b7cde6" }}>
            Total acumulado
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#eaf4ff" }}>
            {totalGrams.toFixed(0)} g
          </Text>
        </View>

        {/* Categories Grid */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 10,
            color: "#eaf4ff",
          }}
        >
          Categorias
        </Text>
        <View
          style={{
            backgroundColor: "#0c2740",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#123252",
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
                  backgroundColor: "#123252",
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
                    color: "#eaf4ff",
                  }}
                >
                  {category.name}
                </Text>
                <Text style={{ fontSize: 11, color: "#b7cde6" }}>
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
          textColor="#b7cde6"
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
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#eaf4ff" }}>
            Últimos registros
          </Text>
          {entries.length > 5 ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Perfil", { section: "records" })
              }
            >
              <Text style={{ color: "#36a3ff", fontWeight: "600" }}>
                Ver mais
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          style={{
            backgroundColor: "#0c2740",
            borderRadius: 12,
            padding: 12,
            height: containerHeight,
            maxHeight: 250,
            borderWidth: 1,
            borderColor: "#123252",
          }}
          nestedScrollEnabled={true}
        >
          {lastEntries.length === 0 ? (
            <Text style={{ color: "#b7cde6" }}>Nenhum registro ainda.</Text>
          ) : (
            lastEntries.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#1e3a57",
                }}
              >
                <Text style={{ color: "#d7ebff" }}>
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </Text>
                <Text style={{ fontWeight: "700", color: "#eaf4ff" }}>
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
              backgroundColor: "#fff",
              borderColor: "#123252",
              borderWidth: 1,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              minHeight: 300,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              Criar categoria
            </Text>

            <TextInput
              label="Nome da categoria"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: "#fff" }}
            />

            <TextInput
              label="Peso em gramas"
              value={newCategoryWeight}
              onChangeText={setNewCategoryWeight}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: "#fff" }}
            />

            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
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
                      newCategoryIcon === icon ? "#1f6fb2" : "#f3f4f6",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={28}
                    color={newCategoryIcon === icon ? "#fff" : "#6b7280"}
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
