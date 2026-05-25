import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useThemePreference } from "../src/ThemePreferenceContext";

export default function MapsScreen() {
    const { darkModeEnabled } = useThemePreference();

    const colors = darkModeEnabled
        ? {
            bg: "#061526",
            textPrimary: "#eaf4ff",
            textSecondary: "#b7cde6",
            panel: "#0c2740",
        }
        : {
            bg: "#f4f8fc",
            textPrimary: "#1d3750",
            textSecondary: "#5d748b",
            panel: "#ffffff",
        };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ padding: 20, alignItems: "center" }}>
                <View
                    style={{
                        backgroundColor: colors.panel,
                        borderRadius: 12,
                        padding: 20,
                        marginVertical: 20,
                    }}
                >
                    <Text
                        style={{
                            color: colors.textPrimary,
                            fontSize: 18,
                            fontWeight: "600",
                            marginBottom: 12,
                        }}
                    >
                        Mapas não disponível na web
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
                        A funcionalidade de mapas está disponível apenas no aplicativo mobile (Android/iOS) através do Expo Go.
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
                        Use o seu celular com o app Expo Go instalado para acessar a visualização dos ecopontos no mapa.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}
