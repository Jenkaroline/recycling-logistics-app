import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useDrawerStatus } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReactionType, useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";

const EMOJI_REACTIONS: { key: ReactionType; emoji: string }[] = [
  { key: "like", emoji: "👍" },
  { key: "clap", emoji: "👏" },
  { key: "eco", emoji: "♻️" },
];

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
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
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, zIndex: 40 }} pointerEvents="box-none">
        <View style={{ height: insets.top + 10 }} />
        <View style={{ height: 64 - insets.top - 10, paddingHorizontal: 12, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
              borderColor: palette.panelAlt,
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={palette.textPrimary} />
          </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ paddingTop: insets.top + 64 }}>
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
                  COMUNIDADE
                </Text>
              </View>

              <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 0.8, marginBottom: 6, fontWeight: "700" }}>
                CONQUISTAS COMPARTILHADAS
              </Text>
              <Text style={{ color: palette.textPrimary, fontSize: 28, lineHeight: 32, fontWeight: "900" }}>
                Amigos em movimento
              </Text>
              <Text style={{ color: palette.textSecondary, marginTop: 8, fontSize: 13 }}>
                {friendsPosts.length} atualização(ões) prontas para inspirar a sua próxima meta.
              </Text>
            </View>

            <View style={{ width: 132, height: 132, borderRadius: 34, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.panelAlt, overflow: "hidden" }}>
              <Image source={require("../assets/images/criancas-planeta.png")} style={{ width: 112, height: 112 }} />
            </View>
          </View>
        </View>

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
    </View>
  );
}
