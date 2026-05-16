import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemePreference } from "../../src/ThemePreferenceContext";

type Props = {
  message: string;
};

export default function ErrorMessage({ message }: Props) {
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        bg: "#2a3b4b",
        text: "#ffdede",
        border: "#ff8a8a",
      }
    : {
        bg: "#fff0f0",
        text: "#6f1d1d",
        border: "#c74848",
      };

  if (!message) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }]}
    >
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons name="alert-circle-outline" size={20} color={palette.border} style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: palette.text }]}>Erro</Text>
        </View>
        <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
    overflow: "hidden",
    width: "100%",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
  },
});
