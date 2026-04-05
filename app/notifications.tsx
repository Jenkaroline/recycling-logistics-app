import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
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
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ padding: 20 }}>
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
  );
}