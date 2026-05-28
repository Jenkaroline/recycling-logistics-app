import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation, DrawerActions, useRoute } from "@react-navigation/native";
import { useDrawerStatus } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useRecycling } from "../src/RecyclingContext";
import { useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { toLocalDayKey, useCurrentDayKey } from "../src/useCurrentDayKey";
import { translateFirebaseError } from "../src/firebaseErrorMapper";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

const MAX_EDIT_COUNT = 3;

export default function RecordsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const horizontalRef = useRef<ScrollView>(null);

  const { entries, updateEntry, deleteEntry } = usePlasticConsumption();
  const {
    entries: recyclingEntries,
    updateAction: updateRecyclingAction,
    deleteAction: deleteRecyclingAction,
  } = useRecycling();
  const { currentProfile } = useSocial();
  const { darkModeEnabled } = useThemePreference();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const drawerNavigation = navigation.getParent?.("MainDrawer") || navigation;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [editingRecyclingId, setEditingRecyclingId] = useState<string | null>(null);
  const [editingRecyclingType, setEditingRecyclingType] = useState("");
  const [editingRecyclingNotes, setEditingRecyclingNotes] = useState("");
  const [savingRecyclingEdit, setSavingRecyclingEdit] = useState(false);

  const [recordsPage, setRecordsPage] = useState(route?.params?.tab === "recycling" ? 1 : 0);
  const currentDayKey = useCurrentDayKey();

  useEffect(() => {
    const initialPage = route?.params?.tab === "recycling" ? 1 : 0;
    setRecordsPage(initialPage);
    requestAnimationFrame(() => {
      horizontalRef.current?.scrollTo({ x: initialPage * width, animated: false });
    });
  }, [route?.params?.tab, width]);

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        panelSoft: "#0f3556",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#8aa6c0",
        accent: "#0fd3b6",
        accentSoft: "rgba(15, 211, 182, 0.14)",
        accentLine: "rgba(15, 211, 182, 0.4)",
        danger: "#ff8b94",
        dangerSoft: "rgba(255, 139, 148, 0.14)",
        cardBorder: "#1e3a57",
        inputText: "#eaf4ff",
        inputLabel: "#cfe3f8",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        panelSoft: "#eaf2fb",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#6b7f95",
        accent: "#1f6fb2",
        accentSoft: "rgba(31, 111, 178, 0.10)",
        accentLine: "rgba(31, 111, 178, 0.18)",
        danger: "#b3314d",
        dangerSoft: "rgba(179, 49, 77, 0.10)",
        cardBorder: "#d7e5f2",
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

  const sortedRecyclingEntries = useMemo(
    () =>
      [...recyclingEntries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [recyclingEntries],
  );

  const totalGrams = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.amountGrams, 0),
    [entries],
  );

  const todayTotal = useMemo(() => {
    return entries
      .filter((entry) => toLocalDayKey(entry.createdAt) === currentDayKey)
      .reduce((sum, entry) => sum + entry.amountGrams, 0);
  }, [entries, currentDayKey]);

  const todayCount = useMemo(() => {
    return entries.filter((entry) => toLocalDayKey(entry.createdAt) === currentDayKey).length;
  }, [entries, currentDayKey]);

  const recyclingTodayCount = useMemo(() => {
    return recyclingEntries.filter((entry) => toLocalDayKey(entry.createdAt) === currentDayKey).length;
  }, [recyclingEntries, currentDayKey]);

  const fullName = currentProfile?.username || "Seus registros";

  const canEditRecord = (editCount?: number) => Number(editCount || 0) < MAX_EDIT_COUNT;

  const beginEdit = (id: string, amountGrams: number, categoryName?: string, editCount?: number) => {
    if (!canEditRecord(editCount)) {
      Alert.alert("Limite atingido", "Este registro já foi editado 3 vezes e não pode ser alterado novamente.");
      return;
    }
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

  const beginRecyclingEdit = (id: string, type: string, notes?: string) => {
    setEditingRecyclingId(id);
    setEditingRecyclingType(type || "");
    setEditingRecyclingNotes(notes || "");
  };

  const closeRecyclingEdit = () => {
    setEditingRecyclingId(null);
    setEditingRecyclingType("");
    setEditingRecyclingNotes("");
  };

  const submitRecyclingEdit = async () => {
    if (!editingRecyclingId) return;
    if (!editingRecyclingType.trim()) {
      Alert.alert("Tipo inválido", "Informe um tipo de reciclagem.");
      return;
    }

    try {
      setSavingRecyclingEdit(true);
      await updateRecyclingAction(editingRecyclingId, {
        type: editingRecyclingType.trim(),
        notes: editingRecyclingNotes.trim() || undefined,
      });
      closeRecyclingEdit();
    } catch (error: any) {
      Alert.alert("Erro", translateFirebaseError(error));
    } finally {
      setSavingRecyclingEdit(false);
    }
  };

  const confirmRecyclingDelete = (id: string) => {
    Alert.alert("Excluir registro", "Deseja remover este registro de reciclagem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRecyclingAction(id);
          } catch (error: any) {
            Alert.alert("Erro", translateFirebaseError(error));
          }
        },
      },
    ]);
  };

  const StatCard = ({
    label,
    value,
    accentColor,
  }: {
    label: string;
    value: string;
    accentColor: string;
  }) => (
    <View
      style={{
        flex: 1,
        flexBasis: 0,
        backgroundColor: palette.panelSoft,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        alignItems: "flex-start",
      }}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          color: palette.textMuted,
          fontSize: 10,
          marginBottom: 4,
          letterSpacing: 0.5,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
      <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: accentColor, fontSize: 18, fontWeight: "900" }}>
        {value}
      </Text>
    </View>
  );

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

            {/* <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                onPress={() => horizontalRef.current?.scrollTo({ x: 0, animated: true })}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: recordsPage === 0 ? palette.accent : palette.panelAlt,
                }}
              />
              <TouchableOpacity
                onPress={() => horizontalRef.current?.scrollTo({ x: width, animated: true })}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: recordsPage === 1 ? palette.accent : palette.panelAlt,
                }}
              />
            </View> */}

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
          const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
          setRecordsPage(nextPage);
        }}
      >
        <View style={{ width }}>
          <ScrollView
            style={{ flex: 1, backgroundColor: palette.bg }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: insets.top + 64,
              paddingBottom: insets.bottom + 28,
            }}
          >
            <View
              style={{
                backgroundColor: palette.panel,
                borderRadius: 28,
                padding: 18,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                marginBottom: 18,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: darkModeEnabled ? 0.2 : 0.06,
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
                      backgroundColor: palette.accentSoft,
                      borderWidth: 1,
                      borderColor: palette.accentLine,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ color: palette.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                      HISTÓRICO
                    </Text>
                  </View>

                  <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 0.8, marginBottom: 6, fontWeight: "700" }}>
                    REGISTROS DE CONSUMO
                  </Text>
                  <Text style={{ color: palette.textPrimary, fontSize: 28, lineHeight: 32, fontWeight: "900" }}>
                    {fullName}
                  </Text>
                </View>

                <View
                  style={{
                    width: 136,
                    height: 136,
                    borderRadius: 34,
                    backgroundColor: palette.panelSoft,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: palette.cardBorder,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      width: 124,
                      height: 124,
                      borderRadius: 62,
                      backgroundColor: darkModeEnabled ? "rgba(15, 211, 182, 0.10)" : "rgba(31, 111, 178, 0.08)",
                      top: 6,
                      right: 6,
                    }}
                  />
                  <Image source={require("../assets/images/turtle2.png")} style={{ width: 104, height: 104 }} contentFit="contain" />
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
                <StatCard label="HOJE" value={`${todayTotal.toFixed(0)} g`} accentColor={palette.accent} />
                <View style={{ width: 10 }} />
                <StatCard label="REGISTROS" value={`${todayCount}`} accentColor={palette.textPrimary} />
                <View style={{ width: 10 }} />
                <StatCard label="TOTAL" value={`${totalGrams.toFixed(0)} g`} accentColor={palette.textPrimary} />
              </View>
            </View>

            <View
              style={{
                backgroundColor: palette.panel,
                borderRadius: 28,
                padding: 14,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                shadowColor: "#000",
                shadowOpacity: darkModeEnabled ? 0.14 : 0.04,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 18,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: "900" }}>Últimos registros</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{sortedEntries.length} itens</Text>
              </View>

              {sortedEntries.length === 0 ? (
                <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 22, paddingHorizontal: 18, backgroundColor: palette.panelSoft, borderRadius: 22, borderWidth: 1, borderColor: palette.cardBorder }}>
                  <Image source={require("../assets/images/homem-ilustracao.png")} style={{ width: 110, height: 110, marginBottom: 8 }} contentFit="contain" />
                  <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 6 }}>Nenhum registro ainda</Text>
                  <Text style={{ color: palette.textSecondary, textAlign: "center", lineHeight: 18 }}>
                    Quando você adicionar ou editar itens, eles aparecem aqui com visual limpo.
                  </Text>
                </View>
              ) : (
                sortedEntries.map((item) => (
                  <View key={item.id} style={{ backgroundColor: palette.panelSoft, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: palette.cardBorder }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accent, marginRight: 8 }} />
                          <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 15 }}>{item.categoryName || "Sem categoria"}</Text>
                        </View>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
                        <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>
                          Edições: {Number(item.editCount || 0)}/{MAX_EDIT_COUNT}
                        </Text>
                      </View>
                      <Text style={{ color: palette.accent, fontWeight: "900", fontSize: 20 }}>{item.amountGrams} g</Text>
                    </View>

                    <View style={{ flexDirection: "row", marginTop: 14 }}>
                      <TouchableOpacity
                        onPress={() => beginEdit(item.id, item.amountGrams, item.categoryName, item.editCount)}
                        disabled={!canEditRecord(item.editCount)}
                        style={{
                          backgroundColor: palette.accentSoft,
                          borderRadius: 14,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderWidth: 1,
                          borderColor: palette.accentLine,
                          marginRight: 8,
                          opacity: canEditRecord(item.editCount) ? 1 : 0.45,
                        }}
                      >
                        <Text style={{ color: palette.accent, fontWeight: "800" }}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelete(item.id)} style={{ backgroundColor: palette.dangerSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: darkModeEnabled ? "rgba(255,139,148,0.35)" : "rgba(179,49,77,0.18)" }}>
                        <Text style={{ color: palette.danger, fontWeight: "800" }}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
{/* 
        <View style={{ width }}>
          <ScrollView
            style={{ flex: 1, backgroundColor: palette.bg }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: insets.top + 64,
              paddingBottom: insets.bottom + 28,
            }}
          >
            <View
              style={{
                backgroundColor: palette.panel,
                borderRadius: 28,
                padding: 18,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                marginBottom: 18,
                overflow: "hidden",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <View style={{ alignSelf: "flex-start", backgroundColor: palette.accentSoft, borderWidth: 1, borderColor: palette.accentLine, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 }}>
                    <Text style={{ color: palette.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>HISTÓRICO</Text>
                  </View>

                  <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 0.8, marginBottom: 6, fontWeight: "700" }}>
                    REGISTROS DE RECICLAGEM
                  </Text>
                  <Text style={{ color: palette.textPrimary, fontSize: 28, lineHeight: 32, fontWeight: "900" }}>{fullName}</Text>
                </View>

                <View style={{ width: 136, height: 136, borderRadius: 34, backgroundColor: palette.panelSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.cardBorder }}>
                  <Ionicons name="leaf-outline" size={56} color={palette.accent} />
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
                <StatCard label="HOJE" value={`${recyclingTodayCount}`} accentColor={palette.accent} />
                <View style={{ width: 10 }} />
                <StatCard label="REGISTROS" value={`${sortedRecyclingEntries.length}`} accentColor={palette.textPrimary} />
                <View style={{ width: 10 }} />
                <StatCard label="SEÇÃO" value="Reciclagem" accentColor={palette.textPrimary} />
              </View>
            </View>

            <View style={{ backgroundColor: palette.panel, borderRadius: 28, padding: 14, borderWidth: 1, borderColor: palette.cardBorder }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: "900" }}>Últimos registros</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{sortedRecyclingEntries.length} itens</Text>
              </View>

              {sortedRecyclingEntries.length === 0 ? (
                <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 22, paddingHorizontal: 18, backgroundColor: palette.panelSoft, borderRadius: 22, borderWidth: 1, borderColor: palette.cardBorder }}>
                  <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 6 }}>Nenhum registro de reciclagem</Text>
                  <Text style={{ color: palette.textSecondary, textAlign: "center", lineHeight: 18 }}>
                    Registre ações na Home e edite tudo por aqui.
                  </Text>
                </View>
              ) : (
                sortedRecyclingEntries.map((item) => (
                  <View key={item.id} style={{ backgroundColor: palette.panelSoft, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: palette.cardBorder }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accent, marginRight: 8 }} />
                          <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 15 }}>{item.type}</Text>
                        </View>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
                        {item.notes ? <Text style={{ color: palette.textSecondary, marginTop: 6 }}>{item.notes}</Text> : null}
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", marginTop: 14 }}>
                      <TouchableOpacity onPress={() => beginRecyclingEdit(item.id, item.type, item.notes)} style={{ backgroundColor: palette.accentSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: palette.accentLine, marginRight: 8 }}>
                        <Text style={{ color: palette.accent, fontWeight: "800" }}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmRecyclingDelete(item.id)} style={{ backgroundColor: palette.dangerSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: darkModeEnabled ? "rgba(255,139,148,0.35)" : "rgba(179,49,77,0.18)" }}>
                        <Text style={{ color: palette.danger, fontWeight: "800" }}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View> */}
      </ScrollView>

      <Modal visible={editingId !== null} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={{ backgroundColor: palette.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: palette.cardBorder, padding: 18, paddingBottom: 22 }}>
            <Text style={{ color: palette.textPrimary, fontWeight: "900", fontSize: 20, marginBottom: 6 }}>Editar registro</Text>
            <Text style={{ color: palette.textSecondary, marginBottom: 14 }}>Ajuste a categoria e a quantidade.</Text>

            <TextInput
              label="Categoria"
              mode="outlined"
              value={editingCategory}
              onChangeText={setEditingCategory}
              textColor={palette.inputText}
              activeOutlineColor={palette.accent}
              outlineColor={palette.panelAlt}
              theme={{ colors: { primary: palette.accent, onSurfaceVariant: palette.inputLabel } }}
              style={{ marginBottom: 12, backgroundColor: palette.panelSoft, borderRadius: 16 }}
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
              theme={{ colors: { primary: palette.accent, onSurfaceVariant: palette.inputLabel } }}
              style={{ marginBottom: 14, backgroundColor: palette.panelSoft, borderRadius: 16 }}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Button mode="text" textColor={palette.textSecondary} onPress={closeEdit}>Cancelar</Button>
              <Button mode="contained" buttonColor={palette.accent} textColor={darkModeEnabled ? "#032746" : "#ffffff"} loading={savingEdit} onPress={submitEdit}>Salvar</Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editingRecyclingId !== null} transparent animationType="slide" onRequestClose={closeRecyclingEdit}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={{ backgroundColor: palette.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: palette.cardBorder, padding: 18, paddingBottom: 22 }}>
            <Text style={{ color: palette.textPrimary, fontWeight: "900", fontSize: 20, marginBottom: 6 }}>Editar registro</Text>
            <Text style={{ color: palette.textSecondary, marginBottom: 14 }}>Ajuste o tipo e as observações da reciclagem.</Text>

            <TextInput
              label="Tipo"
              mode="outlined"
              value={editingRecyclingType}
              onChangeText={setEditingRecyclingType}
              textColor={palette.inputText}
              activeOutlineColor={palette.accent}
              outlineColor={palette.panelAlt}
              theme={{ colors: { primary: palette.accent, onSurfaceVariant: palette.inputLabel } }}
              style={{ marginBottom: 12, backgroundColor: palette.panelSoft, borderRadius: 16 }}
            />
            <TextInput
              label="Observações"
              mode="outlined"
              value={editingRecyclingNotes}
              onChangeText={setEditingRecyclingNotes}
              textColor={palette.inputText}
              activeOutlineColor={palette.accent}
              outlineColor={palette.panelAlt}
              theme={{ colors: { primary: palette.accent, onSurfaceVariant: palette.inputLabel } }}
              style={{ marginBottom: 14, backgroundColor: palette.panelSoft, borderRadius: 16 }}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Button mode="text" textColor={palette.textSecondary} onPress={closeRecyclingEdit}>Cancelar</Button>
              <Button mode="contained" buttonColor={palette.accent} textColor={darkModeEnabled ? "#032746" : "#ffffff"} loading={savingRecyclingEdit} onPress={submitRecyclingEdit}>Salvar</Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
