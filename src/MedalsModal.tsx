import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../service/firebaseConfig";
import { useThemePreference } from "./ThemePreferenceContext";

type MedalRecord = {
  id: string;
  groupId: string;
  groupName: string;
  position: number;
  awardedAt: string;
  endedAt?: string | null;
};

type MedalsModalProps = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userLabel?: string;
};

const medalImages: Record<number, any> = {
  1: require("../assets/images/ouro.png"),
  2: require("../assets/images/prata.png"),
  3: require("../assets/images/bronze.png"),
};

export default function MedalsModal({ visible, onClose, userId, userLabel }: MedalsModalProps) {
  const { darkModeEnabled } = useThemePreference();
  const [medals, setMedals] = useState<MedalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !userId) {
      setMedals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const medalsQuery = query(collection(db, "users", userId, "medals"), orderBy("position", "asc"));
    const unsubscribe = onSnapshot(
      medalsQuery,
      (snapshot) => {
        const items: MedalRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<MedalRecord, "id">;
          return {
            id: doc.id,
            groupId: data.groupId,
            groupName: data.groupName,
            position: data.position,
            awardedAt: data.awardedAt || "",
            endedAt: data.endedAt || null,
          };
        });
        setMedals(items);
        setLoading(false);
      },
      (error) => {
        console.warn("[MedalsModal] failed to load medals:", error);
        setMedals([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [visible, userId]);

  const palette = darkModeEnabled
    ? {
        overlay: "rgba(0, 0, 0, 0.45)",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        cardBorder: "rgba(255,255,255,0.10)",
      }
    : {
        overlay: "rgba(0, 0, 0, 0.28)",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        cardBorder: "rgba(0,0,0,0.08)",
      };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: "center", padding: 18 }}>
        <View style={{ borderRadius: 24, backgroundColor: palette.panel, overflow: "hidden", maxHeight: "92%", borderWidth: 1, borderColor: palette.cardBorder }}>
          <View style={{ padding: 18, backgroundColor: palette.panelAlt, borderBottomWidth: 1, borderColor: palette.cardBorder }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: "900" }}>{userLabel ? `${userLabel} - Medalhas` : "Medalhas"}</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 6 }}>Conquistas do perfil exibidas com estilo e histórico claro.</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
            {loading ? (
              <View style={{ minHeight: 200, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator color={palette.textPrimary} size="large" />
              </View>
            ) : medals.length === 0 ? (
              <View style={{ minHeight: 180, justifyContent: "center", alignItems: "center", padding: 18 }}>
                <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 8 }}>Nenhuma medalha encontrada</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: "center" }}>As medalhas aparecem aqui quando você participa de competições e conquista posições no pódio.</Text>
              </View>
            ) : (
              medals.map((medal) => (
                <View
                  key={medal.id}
                  style={{
                    borderRadius: 22,
                    backgroundColor: palette.panelAlt,
                    borderWidth: 1,
                    borderColor: palette.cardBorder,
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View style={{ width: 60, height: 60, borderRadius: 18, overflow: "hidden", backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}>
                    <Image source={medalImages[medal.position] || medalImages[3]} style={{ width: 56, height: 56 }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.textPrimary, fontSize: 17, fontWeight: "900" }} numberOfLines={1} ellipsizeMode="tail">
                      {medal.groupName}
                    </Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 6 }}>Posição {medal.position}</Text>
                    {medal.endedAt ? <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 6 }}>Finalizado em {new Date(medal.endedAt).toLocaleDateString("pt-BR")}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
