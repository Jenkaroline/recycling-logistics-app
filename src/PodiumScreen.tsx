import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
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

export default function PodiumScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { darkModeEnabled } = useThemePreference();
  const { users: socialUsers } = useSocial();
  const groupId = route.params?.groupId as string | undefined;
  const [podium, setPodium] = useState<PodiumMember[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [loading, setLoading] = useState(true);
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
    if (!groupId) {
      setLoading(false);
      return;
    }

    const finalRef = doc(db, "groups", groupId, "podium", "final");
    const unsubscribe = onSnapshot(finalRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPodium([]);
        setGroupName("");
        setLoading(false);
        return;
      }

      const data = snapshot.data() as PodiumDoc;
      setGroupName(data.groupName || "Pódio");
      setPodium(Array.isArray(data.podium) ? data.podium : []);
      setLoading(false);
    }, (error) => {
      console.warn("[PodiumScreen] failed to load podium:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [groupId]);

  const medalImages = {
    1: require("../assets/images/ouro.png"),
    2: require("../assets/images/prata.png"),
    3: require("../assets/images/bronze.png"),
  };

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#9ab6d3",
        cardBorder: "rgba(255,255,255,0.12)",
        accent: "#f5d63b",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#7690a8",
        cardBorder: "rgba(0,0,0,0.08)",
        accent: "#b07f09",
      };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: palette.panel, borderBottomWidth: 1, borderColor: palette.cardBorder }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, borderRadius: 12, backgroundColor: palette.bg, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: palette.textPrimary, fontSize: 22, fontWeight: "900" }}>Pódio do Grupo</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={{ color: palette.textSecondary, marginTop: 8, fontSize: 14 }}>{groupName || "Confira as conquistas"}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {loading ? (
          <View style={{ flex: 1, minHeight: 260, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        ) : podium.length === 0 ? (
          <View style={{ padding: 24, borderRadius: 22, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder }}>
            <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 8 }}>Pódio indisponível</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>Não encontramos informações de pódio para este grupo.</Text>
          </View>
        ) : (
          podium.map((member) => {
            const avatarUrl = getMemberAvatar(member.memberId);
            const displayName = getMemberDisplayName(member.memberId, member.name);

            return (
            <View
              key={member.memberId}
              style={{
                borderRadius: 24,
                backgroundColor: palette.panel,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                padding: 18,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMedalUserId(member.memberId);
                    setSelectedMedalUserName(displayName);
                  }}
                  style={{ width: 56, height: 56, borderRadius: 16, overflow: "hidden", backgroundColor: palette.panelAlt, borderWidth: 1, borderColor: palette.cardBorder, alignItems: "center", justifyContent: "center" }}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56 }} contentFit="cover" />
                  ) : (
                    <Text style={{ color: palette.textPrimary, fontWeight: "900", fontSize: 16 }}>
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
                  <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 4 }}>Posição {member.position}</Text>
                </View>
                <View style={{ width: 68, height: 68, borderRadius: 18, overflow: "hidden", backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center" }}>
                  <Image source={medalImages[member.position as 1 | 2 | 3]} style={{ width: 60, height: 60 }} />
                </View>
              </View>
              <View style={{ marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: palette.panelAlt }}>
                <Text style={{ color: palette.textSecondary, fontSize: 13, marginBottom: 6 }}>XP total:</Text>
                <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "700" }}>{member.totalXp} pontos</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 8 }}>Ações: {member.actionsCount}</Text>
              </View>
            </View>
            );
          })
        )}
      </ScrollView>
      <MedalsModal
        visible={Boolean(selectedMedalUserId)}
        userId={selectedMedalUserId || ""}
        userLabel={selectedMedalUserName || "Usuário"}
        onClose={() => {
          setSelectedMedalUserId(null);
          setSelectedMedalUserName(null);
        }}
      />
    </View>
  );
}
