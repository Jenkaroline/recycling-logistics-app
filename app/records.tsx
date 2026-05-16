import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { translateFirebaseError } from "../src/firebaseErrorMapper";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function RecordsScreen() {
  const { entries, updateEntry, deleteEntry } = usePlasticConsumption();
  const { currentProfile } = useSocial();
  const { darkModeEnabled } = useThemePreference();
  const insets = useSafeAreaInsets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelHighlight: "#123252",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#9ab6d3",
        accent: "#36a3ff",
        inputText: "#eaf4ff",
        inputLabel: "#cfe3f8",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelHighlight: "#eaf2fb",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#7690a8",
        accent: "#1f6fb2",
        inputText: "#1f3346",
        inputLabel: "#5d748b",
      };

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [entries],
  );

  const totalGrams = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.amountGrams, 0),
    [entries],
  );

  const fullName = currentProfile?.username || "Seus";

  const beginEdit = (id: string, amountGrams: number, categoryName?: string) => {
    setEditingId(id);
    setEditingAmount(String(amountGrams));
    setEditingCategory(categoryName || "");
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditingAmount("");
    setEditingCategory("");
  };

  const submitEdit = async () => {
    if (!editingId) return;

    const parsedAmount = Number(editingAmount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Valor inválido", "Informe uma quantidade em gramas maior que zero.");
      return;
    }

    try {
      setSavingEdit(true);
      await updateEntry(editingId, {
        amountGrams: parsedAmount,
        categoryName: editingCategory.trim() || "Sem categoria",
      });
      closeEdit();
    } catch (error: any) {
      Alert.alert("Erro", translateFirebaseError(error));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Excluir registro", "Deseja remover este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(id);
          } catch (error: any) {
            Alert.alert("Erro", translateFirebaseError(error));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <View
        style={{
          backgroundColor: palette.panelHighlight,
          borderRadius: 22,
          padding: 18,
          borderWidth: 1,
          borderColor: palette.panelAlt,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: palette.textSecondary, marginBottom: 14 }}>
          Histórico completo dos consumos registrados por {fullName}.
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View
            style={{
              flex: 1,
              backgroundColor: palette.panelAlt,
              borderRadius: 14,
              padding: 12,
              marginRight: 8,
            }}
          >
            <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 4 }}>
              Registros
            </Text>
            <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: "800" }}>
              {sortedEntries.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: palette.panelAlt,
              borderRadius: 14,
              padding: 12,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 4 }}>
              Total acumulado
            </Text>
            <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: "800" }}>
              {totalGrams.toFixed(0)} g
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: palette.panel,
          borderRadius: 18,
          padding: 14,
          borderWidth: 1,
          borderColor: palette.panelAlt,
        }}
      >
        {sortedEntries.length === 0 ? (
          <Text style={{ color: palette.textSecondary }}>
            Nenhum registro encontrado.
          </Text>
        ) : (
          sortedEntries.map((item) => (
            <View
              key={item.id}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: palette.panelAlt,
                paddingVertical: 10,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
                    {item.categoryName || "Sem categoria"}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: palette.textPrimary,
                    fontWeight: "800",
                    fontSize: 16,
                  }}
                >
                  {item.amountGrams} g
                </Text>
              </View>

              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => beginEdit(item.id, item.amountGrams, item.categoryName)}
                  style={{
                    backgroundColor: palette.panelAlt,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
                    Editar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDelete(item.id)}
                  style={{
                    backgroundColor: darkModeEnabled ? "#3b1f2b" : "#fbe9ed",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: darkModeEnabled ? "#fca5a5" : "#b3314d", fontWeight: "700" }}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal
        visible={editingId !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
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
              backgroundColor: palette.panel,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderColor: palette.panelAlt,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: palette.textPrimary,
                fontWeight: "800",
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Editar registro
            </Text>

            <TextInput
              label="Categoria"
              mode="outlined"
              value={editingCategory}
              onChangeText={setEditingCategory}
              textColor={palette.inputText}
              activeOutlineColor={palette.accent}
              outlineColor={palette.panelAlt}
              theme={{
                colors: {
                  primary: palette.accent,
                  onSurfaceVariant: palette.inputLabel,
                },
              }}
              style={{ marginBottom: 10, backgroundColor: palette.panelAlt }}
            />
            <TextInput
              label="Quantidade (g)"
              mode="outlined"
              value={editingAmount}
              onChangeText={setEditingAmount}
              keyboardType="decimal-pad"
              textColor={palette.inputText}
              activeOutlineColor={palette.accent}
              outlineColor={palette.panelAlt}
              theme={{
                colors: {
                  primary: palette.accent,
                  onSurfaceVariant: palette.inputLabel,
                },
              }}
              style={{ marginBottom: 12, backgroundColor: palette.panelAlt }}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Button
                mode="text"
                textColor={darkModeEnabled ? "#d7ebff" : palette.textSecondary}
                onPress={closeEdit}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                buttonColor={palette.accent}
                textColor={darkModeEnabled ? "#032746" : "#ffffff"}
                loading={savingEdit}
                onPress={submitEdit}
              >
                Salvar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}