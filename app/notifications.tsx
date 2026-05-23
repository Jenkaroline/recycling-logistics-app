import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawerStatus } from "@react-navigation/drawer";
import { useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";


type NotificationItem = {
  id: string;
  kind: "comment" | "reaction";
  username: string;
  avatarUrl?: string;
  createdAt: string;
  text: string;
  reactionType?: keyof typeof REACTION_EMOJI;
};

const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  clap: "👏",
  eco: "♻️",
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const { users, myPosts, currentProfile, loading } = useSocial();
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
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#7690a8",
        accent: "#1f6fb2",
      };

    const interactionNotifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const currentUid = currentProfile?.uid;

    myPosts.forEach((post) => {
      post.comments
        .filter((comment) => comment.userId !== currentUid)
        .forEach((comment) => {
          items.push({
            id: `comment-${post.id}-${comment.id}`,
            kind: "comment",
            username: comment.username,
            avatarUrl: comment.avatarUrl,
            createdAt: comment.createdAt,
            text: comment.text,
          });
        });

      post.recentReactions
        ?.filter((reaction) => reaction.userId !== currentUid)
        .forEach((reaction) => {
          const user = users.find((item) => item.uid === reaction.userId);
          items.push({
            id: `reaction-${post.id}-${reaction.id}`,
            kind: "reaction",
            username: user?.username || "Usuário",
            avatarUrl: user?.avatarUrl,
            createdAt: reaction.createdAt,
            text: reaction.type,
            reactionType: reaction.type,
          });
        });
    });

    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [currentProfile?.uid, myPosts, users]);

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
    

  <View style={{ flex: 1, backgroundColor: palette.bg }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 64 }}>
        <View style={{ padding: 20 }}>
        <View
          style={{
            backgroundColor: palette.panel,
            borderRadius: 28,
            padding: 18,
            borderWidth: 1,
            borderColor: palette.panelAlt,
            marginBottom: 18,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
            <View style={{ flex: 1, paddingTop: 2 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: darkModeEnabled ? "rgba(54, 163, 255, 0.14)" : "rgba(31, 111, 178, 0.10)",
                  borderWidth: 1,
                  borderColor: darkModeEnabled ? "rgba(54, 163, 255, 0.32)" : "rgba(31, 111, 178, 0.18)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                  INTERAÇÕES
                </Text>
              </View>

              <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 0.8, marginBottom: 6, fontWeight: "700" }}>
                RECEBA RETORNO DA REDE
              </Text>
              <Text style={{ color: palette.textPrimary, fontSize: 28, lineHeight: 32, fontWeight: "900" }}>
                Notificações do dia
              </Text>
              <Text style={{ color: palette.textSecondary, marginTop: 8, fontSize: 13 }}>
                Comentários e reações organizados em um painel único.
              </Text>
            </View>

            <View style={{ width: 132, height: 132, borderRadius: 34, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.panelAlt, overflow: "hidden" }}>
              <Image source={require("../assets/images/ilustracao-telefone.png")} style={{ width: 112, height: 112 }} />
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
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              color: palette.textPrimary,
              fontWeight: "800",
              fontSize: 18,
              marginBottom: 10,
            }}
          >
            Interações
          </Text>

          {loading ? (
            <ActivityIndicator color={palette.accent} style={{ marginVertical: 18 }} />
          ) : interactionNotifications.length === 0 ? (
            <Text style={{ color: palette.textSecondary }}>
              Ainda não há interações nos seus posts.
            </Text>
          ) : (
            interactionNotifications.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginTop: 10,
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: palette.panelAlt,
                }}
              >
                {item.avatarUrl ? (
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      marginRight: 10,
                      backgroundColor: palette.panelAlt,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: palette.textMuted, fontWeight: "800" }}>
                      {item.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
                    {item.username}
                  </Text>
                  <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                    {item.kind === "reaction"
                      ? `${REACTION_EMOJI[item.reactionType || "like"] || "✨"} reagiu`
                      : `comentou: ${item.text}`}
                  </Text>
                </View>

                <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
      </ScrollView>
    </View>
    </View>
  );
}