import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemePreference } from "../../src/ThemePreferenceContext";

type Props = {
  message: string;
};

export default function SuccessMessage({ message }: Props) {
  const { darkModeEnabled } = useThemePreference();

  const palette = darkModeEnabled
    ? {
        bg: "#103826",
        text: "#d7ffea",
        border: "#2dd47a",
      }
    : {
        bg: "#edfdf3",
        text: "#1b5e33",
        border: "#2dd47a",
      };

  if (!message) return null;

  return (
    <View style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Ionicons name="checkmark-circle-outline" size={18} color={palette.border} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
  },
});
