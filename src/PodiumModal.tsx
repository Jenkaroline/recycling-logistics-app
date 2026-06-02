import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../service/firebaseConfig";
import { useSocial } from "./SocialContext";
import { useThemePreference } from "./ThemePreferenceContext";
import MedalsModal from "./MedalsModal";

type PodiumMember = {
  position: number;
  memberId: string;
  name: string;
  totalXp: number;
  actionsCount: number;
};

type PodiumDoc = {
  groupId: string;
  groupName: string;
  podium: PodiumMember[];
  finalizedAt?: string | null;
  endedAt?: string | null;
};

type PodiumModalProps = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
};

const medalImages: Record<number, any> = {
  1: require("../assets/images/ouro.png"),
  2: require("../assets/images/prata.png"),
  3: require("../assets/images/bronze.png"),
};

export default function PodiumModal({ visible, onClose, groupId }: PodiumModalProps) {
  const { darkModeEnabled } = useThemePreference();
  const { users: socialUsers } = useSocial();
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("Pódio do Grupo");
  const [podium, setPodium] = useState<PodiumMember[]>([]);
  const [selectedMedalUserId, setSelectedMedalUserId] = useState<string | null>(null);
  const [selectedMedalUserName, setSelectedMedalUserName] = useState<string | null>(null);

  const usersById = useMemo(() => {
    const map = new Map<string, any>();
    socialUsers.forEach((user) => map.set(user.uid, user));
    return map;
  }, [socialUsers]);

  const getMemberAvatar = (memberId: string) => usersById.get(memberId)?.avatarUrl;
  const getMemberDisplayName = (memberId: string, fallback: string) => usersById.get(memberId)?.username || fallback;

  useEffect(() => {
    if (!visible || !groupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const finalRef = doc(db, "groups", groupId, "podium", "final");
    const unsubscribe = onSnapshot(
      finalRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setGroupName("Pódio do Grupo");
          setPodium([]);
          setLoading(false);
          return;
        }

        const data = snapshot.data() as PodiumDoc;
        setGroupName(data.groupName || "Pódio do Grupo");
        setPodium(Array.isArray(data.podium) ? data.podium : []);
        setLoading(false);
      },
      (error) => {
        console.warn("[PodiumModal] failed to load podium:", error);
        setGroupName("Pódio do Grupo");
        setPodium([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [visible, groupId]);

  const palette = darkModeEnabled
    ? {
        overlay: "rgba(0, 0, 0, 0.55)",
        panel: "#0b2137",
        panelAlt: "#112e4c",
        textPrimary: "#e7f2ff",
        textSecondary: "#b7cde6",
        accent: "#f5d63b",
        cardBorder: "rgba(255,255,255,0.10)",
        subtle: "rgba(255,255,255,0.06)",
      }
    : {
        overlay: "rgba(0, 0, 0, 0.32)",
        panel: "#ffffff",
        panelAlt: "#f3f7fb",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        accent: "#b07f09",
        cardBorder: "rgba(0,0,0,0.08)",
        subtle: "rgba(0,0,0,0.04)",
      };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: "center", padding: 20 }}>
        <View style={{ borderRadius: 28, backgroundColor: palette.panel, overflow: "hidden", maxHeight: "90%", borderWidth: 1, borderColor: palette.cardBorder }}>
          <View style={{ padding: 20, borderBottomWidth: 1, borderColor: palette.subtle, backgroundColor: palette.panelAlt }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: "900", lineHeight: 28 }}>{groupName}</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 6 }}>Confira o ranking final do grupo e veja as conquistas.</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {loading ? (
              <View style={{ minHeight: 220, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={palette.accent} />
              </View>
            ) : podium.length === 0 ? (
              <View style={{ minHeight: 220, justifyContent: "center", alignItems: "center", padding: 24, borderRadius: 22, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panelAlt }}>
                <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 8 }}>Sem pódio disponível</Text>
                <Text style={{ color: palette.textSecondary, textAlign: "center", fontSize: 14 }}>O grupo foi finalizado, mas não há registros de pontuação para exibir.</Text>
              </View>
            ) : (
              podium.map((member) => {
                const avatarUrl = getMemberAvatar(member.memberId);
                const displayName = getMemberDisplayName(member.memberId, member.name);

                return (
                  <View key={member.memberId} style={{ borderRadius: 22, backgroundColor: palette.panelAlt, borderWidth: 1, borderColor: palette.cardBorder, padding: 18, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedMedalUserId(member.memberId);
                          setSelectedMedalUserName(displayName);
                        }}
                        style={{ width: 54, height: 54, borderRadius: 18, overflow: "hidden", backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, alignItems: "center", justifyContent: "center" }}
                      >
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} style={{ width: 54, height: 54 }} contentFit="cover" />
                        ) : (
                          <Text style={{ color: palette.textPrimary, fontWeight: "900", fontSize: 18 }}>
                            {displayName
                              .split(" ")
                              .map((part) => part.charAt(0))
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: "900" }}>{displayName}</Text>
                        <Text style={{ color: palette.accent, fontSize: 13, fontWeight: "800", marginTop: 4 }}>Posição {member.position}</Text>
                      </View>
                      <View style={{ width: 64, height: 64, borderRadius: 20, overflow: "hidden", backgroundColor: palette.subtle, alignItems: "center", justifyContent: "center" }}>
                        <Image source={medalImages[member.position] || medalImages[3]} style={{ width: 56, height: 56 }} />
                      </View>
                    </View>
                    <View style={{ marginTop: 16, borderRadius: 18, backgroundColor: palette.panel, padding: 14, borderWidth: 1, borderColor: palette.subtle }}>
                      <Text style={{ color: palette.textSecondary, fontSize: 13 }}>XP total</Text>
                      <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "800", marginTop: 4 }}>{member.totalXp} pontos</Text>
                      <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 8 }}>Ações: {member.actionsCount}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
      <MedalsModal
        visible={Boolean(selectedMedalUserId)}
        userId={selectedMedalUserId || ""}
        userLabel={selectedMedalUserName || "Usuário"}
        onClose={() => {
          setSelectedMedalUserId(null);
          setSelectedMedalUserName(null);
        }}
      />
    </Modal>
  );
}
