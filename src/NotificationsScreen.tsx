import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, DrawerActions } from "@react-navigation/native";
import { useDrawerStatus } from "@react-navigation/drawer";
import React, { useMemo } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../service/firebaseConfig";
import { useRecyclingCompetition } from "./RecyclingCompetitionContext";
import { useThemePreference } from "./ThemePreferenceContext";
import { AppNotificationItem, useAppNotifications } from "./useAppNotifications";

type NotificationSection = {
  title: string;
  key: string;
  items: AppNotificationItem[];
};

const MIN_VALID_TIMESTAMP = Date.UTC(2000, 0, 1);

function getSafeNotificationTimestamp(item: AppNotificationItem) {
  const fromTimestamp = Number.isFinite(item.timestamp) && item.timestamp >= MIN_VALID_TIMESTAMP ? item.timestamp : 0;
  if (fromTimestamp) return fromTimestamp;

  const parsed = new Date(item.rawCreatedAt).getTime();
  return Number.isFinite(parsed) && parsed >= MIN_VALID_TIMESTAMP ? parsed : Date.now();
}

function getLocalDayStart(value: number) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatSectionTitle(timestamp: number, now = new Date()) {
  const date = new Date(timestamp);
  const currentDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((currentDayStart - targetDayStart) / 86400000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays > 7) return date.toLocaleDateString("pt-BR");

  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function kindLabel(kind: AppNotificationItem["kind"]) {
  switch (kind) {
    case "invitation":
      return "Convite";
    case "invitation-response":
      return "Resposta";
    case "chat":
      return "Chat";
    case "evidence":
      return "Evidência";
    default:
      return "Notificação";
  }
}

function getNotificationTone(item: AppNotificationItem, darkModeEnabled: boolean) {
  const tones = {
    chat: {
      accent: darkModeEnabled ? "#58b8ff" : "#1f6fb2",
      tint: darkModeEnabled ? "rgba(88, 184, 255, 0.12)" : "rgba(31, 111, 178, 0.08)",
      border: darkModeEnabled ? "rgba(88, 184, 255, 0.28)" : "rgba(31, 111, 178, 0.18)",
    },
    invitation: {
      accent: darkModeEnabled ? "#fbbf24" : "#d97706",
      tint: darkModeEnabled ? "rgba(251, 191, 36, 0.12)" : "rgba(217, 119, 6, 0.08)",
      border: darkModeEnabled ? "rgba(251, 191, 36, 0.28)" : "rgba(217, 119, 6, 0.18)",
    },
    response: {
      accent: darkModeEnabled ? "#0fd3b6" : "#1b8f5a",
      tint: darkModeEnabled ? "rgba(15, 211, 182, 0.12)" : "rgba(27, 143, 90, 0.10)",
      border: darkModeEnabled ? "rgba(15, 211, 182, 0.28)" : "rgba(27, 143, 90, 0.22)",
    },
    evidence: {
      accent: darkModeEnabled ? "#ff8b94" : "#b3314d",
      tint: darkModeEnabled ? "rgba(255, 139, 148, 0.12)" : "rgba(179, 49, 77, 0.08)",
      border: darkModeEnabled ? "rgba(255, 139, 148, 0.28)" : "rgba(179, 49, 77, 0.18)",
    },
    default: {
      accent: darkModeEnabled ? "#c7d8ea" : "#5d748b",
      tint: darkModeEnabled ? "rgba(199, 216, 234, 0.10)" : "rgba(93, 116, 139, 0.08)",
      border: darkModeEnabled ? "rgba(199, 216, 234, 0.18)" : "rgba(93, 116, 139, 0.14)",
    },
  };

  if (item.kind === "chat") return tones.chat;
  if (item.kind === "invitation") return tones.invitation;
  if (item.kind === "invitation-response") return tones.response;
  if (item.kind === "evidence") return tones.evidence;
  return tones.default;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const currentUid = auth.currentUser?.uid || null;
  const { acceptGroupInvitation, declineGroupInvitation } = useRecyclingCompetition();
  const { notifications, markNotificationsAsSeen } = useAppNotifications();
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#9ab6d3",
        accent: "#36a3ff",
        success: "#0fd3b6",
        successSoft: "rgba(15, 211, 182, 0.12)",
        successBorder: "rgba(15, 211, 182, 0.32)",
        danger: "#ff8b94",
        dangerSoft: "rgba(255, 139, 148, 0.12)",
        dangerBorder: "rgba(255, 139, 148, 0.28)",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#7690a8",
        accent: "#1f6fb2",
        success: "#1b8f5a",
        successSoft: "rgba(27, 143, 90, 0.10)",
        successBorder: "rgba(27, 143, 90, 0.22)",
        danger: "#b3314d",
        dangerSoft: "rgba(179, 49, 77, 0.10)",
        dangerBorder: "rgba(179, 49, 77, 0.22)",
      };

  const sections = useMemo<NotificationSection[]>(() => {
    if (notifications.length === 0) return [];

    const sectionsMap = new Map<string, NotificationSection>();
    const orderedKeys: string[] = [];

    notifications.forEach((notification) => {
      const safeTimestamp = getSafeNotificationTimestamp(notification);
      const title = formatSectionTitle(safeTimestamp);
      const key = `${title}-${getLocalDayStart(safeTimestamp)}`;
      const existing = sectionsMap.get(key);

      if (existing) {
        existing.items.push(notification);
        return;
      }

      const section: NotificationSection = {
        title,
        key,
        items: [notification],
      };

      sectionsMap.set(key, section);
      orderedKeys.push(key);
    });

    return orderedKeys.map((key) => sectionsMap.get(key)!).filter(Boolean);
  }, [notifications]);

  useFocusEffect(
    React.useCallback(() => {
      void markNotificationsAsSeen();
    }, [markNotificationsAsSeen]),
  );

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      await acceptGroupInvitation(invitationId);
      Alert.alert("Convite aceito", "O grupo foi adicionado aos seus grupos.");
    } catch {
      Alert.alert("Falha ao aceitar", "Não foi possível aceitar o convite agora.");
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    const invite = notifications.find((item) => item.sourceId === invitationId && item.kind !== "chat" && item.kind !== "evidence");
    const groupName = invite?.groupName || "este grupo";

    Alert.alert("Recusar convite", `Deseja recusar o convite para ${groupName}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Recusar",
        style: "destructive",
        onPress: async () => {
          try {
            await declineGroupInvitation(invitationId);
            Alert.alert("Convite recusado", "O convite foi removido da sua lista.");
          } catch {
            Alert.alert("Falha ao recusar", "Não foi possível recusar o convite agora.");
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, zIndex: 40 }} pointerEvents="box-none">
        <View style={{ height: insets.top + 10 }} />
        <View style={{ height: 64 - insets.top - 10, paddingHorizontal: 12, justifyContent: "center" }}>
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
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }}>
        <View style={{ padding: 20 }}>
          <View style={{ backgroundColor: palette.panel, borderRadius: 28, padding: 18, borderWidth: 1, borderColor: palette.panelAlt, marginBottom: 18, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
              <View style={{ flex: 1, paddingTop: 2 }}>
                <Text style={{ color: palette.textPrimary, fontSize: 20, lineHeight: 32, fontWeight: "900" }}>Notificações</Text>
                <Text style={{ color: palette.textSecondary, marginTop: 8, fontSize: 13 }}>Convites, respostas, chats e evidências em uma lista simples.</Text>
              </View>

              <View style={{ width: 132, height: 132, borderRadius: 34, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.panelAlt, overflow: "hidden" }}>
                <Image source={require("../assets/images/ilustracao-telefone.png")} style={{ width: 112, height: 112 }} />
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: palette.panel, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: palette.panelAlt, marginBottom: 14 }}>
            {sections.length === 0 ? (
              <Text style={{ color: palette.textSecondary }}>Nenhuma notificação no momento.</Text>
            ) : (
              sections.map((section) => (
                <View key={section.key} style={{ marginBottom: 14 }}>
                  <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: "800", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>{section.title}</Text>

                  {section.items.map((item) => {
                    const isInvitation = item.kind === "invitation";
                    const isReceivedInvitation = isInvitation && item.recipientUid === currentUid;
                    const tone = getNotificationTone(item, darkModeEnabled);
                    const cardBackground = darkModeEnabled ? "rgba(255, 255, 255, 0.02)" : "#ffffff";

                    return (
                      <View
                        key={item.id}
                        style={{
                          borderWidth: 1,
                          borderColor: tone.border,
                          borderRadius: 18,
                          overflow: "hidden",
                          marginBottom: 10,
                          backgroundColor: cardBackground,
                        }}
                      >
                        <View style={{ padding: 14 }}>
                          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                                <Text
                                  style={{
                                    color: palette.textPrimary,
                                    fontWeight: "800",
                                    fontSize: item.kind === "chat" ? 15 : 16,
                                    lineHeight: item.kind === "chat" ? 20 : 22,
                                    flexShrink: 1,
                                    paddingRight: 4,
                                  }}
                                  numberOfLines={2}
                                  ellipsizeMode="tail"
                                >
                                  {item.title}
                                </Text>
                                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: tone.tint, marginTop: 1 }}>
                                  <Text style={{ color: tone.accent, fontSize: 10, fontWeight: "800" }}>{kindLabel(item.kind)}</Text>
                                </View>
                              </View>
                              <Text
                                style={{ color: palette.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 19 }}
                                numberOfLines={item.kind === "chat" ? 3 : 2}
                                ellipsizeMode="tail"
                              >
                                {item.description}
                              </Text>
                            </View>

                            {isInvitation ? (
                              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: item.status === "accepted" ? palette.successBorder : item.status === "declined" ? palette.dangerBorder : tone.border, backgroundColor: item.status === "accepted" ? palette.successSoft : item.status === "declined" ? palette.dangerSoft : tone.tint }}>
                                <Text style={{ color: item.status === "accepted" ? palette.success : item.status === "declined" ? palette.danger : palette.textMuted, fontSize: 11, fontWeight: "800" }}>
                                  {item.status === "accepted" ? "Aceito" : item.status === "declined" ? "Recusado" : "Pendente"}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {isReceivedInvitation && item.status === "pending" ? (
                            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                              <TouchableOpacity
                                onPress={() => void handleAcceptInvite(item.sourceId)}
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.successSoft, borderWidth: 1, borderColor: palette.successBorder }}
                              >
                                <Text style={{ color: palette.success, fontWeight: "800" }}>Aceitar</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => void handleDeclineInvite(item.sourceId)}
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.dangerSoft, borderWidth: 1, borderColor: palette.dangerBorder }}
                              >
                                <Text style={{ color: palette.danger, fontWeight: "800" }}>Recusar</Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
