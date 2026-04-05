import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { ReactionType, useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";

const EMOJI_REACTIONS: { key: ReactionType; emoji: string }[] = [
  { key: "like", emoji: "👍" },
  { key: "clap", emoji: "👏" },
  { key: "eco", emoji: "♻️" },
];

export default function CommunityScreen() {
  const { followingFeedPosts, currentProfile, loading, reactToPost } =
    useSocial();
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#9ab6d3",
        textSoft: "#d7ebff",
        reactionActive: "#1f6fb2",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#7690a8",
        textSoft: "#2f4a64",
        reactionActive: "#2a7fc8",
      };

  const friendsPosts = useMemo(
    () =>
      followingFeedPosts
        .filter((post) => post.authorId !== currentProfile?.uid)
        .filter((post) => post.type === "achievement"),
    [followingFeedPosts, currentProfile?.uid],
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ padding: 20 }}>
        <Text style={{ color: palette.textSecondary, marginBottom: 14 }}>
          Conquistas compartilhadas pelos seus amigos.
        </Text>

        {loading ? (
          <ActivityIndicator
            color="#36a3ff"
            size="large"
            style={{ marginVertical: 20 }}
          />
        ) : friendsPosts.length === 0 ? (
          <Text style={{ color: palette.textSecondary }}>
            Ainda não há conquistas dos seus amigos por aqui.
          </Text>
        ) : (
          friendsPosts.map((post) => (
            <View
              key={post.id}
              style={{
                backgroundColor: palette.panel,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.panelAlt,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                {post.authorAvatar ? (
                  <Image
                    source={{ uri: post.authorAvatar }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      marginRight: 10,
                    }}
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
                    <Text
                      style={{ color: palette.textMuted, fontWeight: "700" }}
                    >
                      {post.authorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: palette.textPrimary, fontWeight: "700" }}
                  >
                    {post.authorName}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
              </View>

              <Text style={{ color: palette.textSoft, marginBottom: 12 }}>
                {post.content}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {EMOJI_REACTIONS.map((reaction) => (
                  <TouchableOpacity
                    key={reaction.key}
                    onPress={() => reactToPost(post.id, reaction.key)}
                    style={{
                      backgroundColor:
                        post.myReaction === reaction.key
                          ? palette.reactionActive
                          : palette.panelAlt,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: palette.textPrimary, fontSize: 16 }}>
                      {reaction.emoji} {post.reactionSummary[reaction.key] || 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
