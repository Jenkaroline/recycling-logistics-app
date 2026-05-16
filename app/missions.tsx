import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Button } from "react-native-paper";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useSocial } from "../src/SocialContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { translateFirebaseError } from "../src/firebaseErrorMapper";

type Mission = {
  id: string;
  title: string;
  description: string;
  progress: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

export default function MissionsScreen() {
  const { entries, totalGrams } = usePlasticConsumption();
  const { shareAchievement } = useSocial();
  const { darkModeEnabled } = useThemePreference();
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [selectedCommentIndexes, setSelectedCommentIndexes] = useState<
    number[]
  >([0, 1]);
  const [publishing, setPublishing] = useState(false);
  const notifiedMissionIds = useRef<Set<string>>(new Set());
  const initializedCompletionState = useRef(false);

  const missions = useMemo<Mission[]>(() => {
    const uniqueDays = new Set(
      entries.map((entry) => new Date(entry.createdAt).toDateString()),
    ).size;
    const avgConsumption =
      entries.length > 0
        ? entries.reduce((sum, entry) => sum + entry.amountGrams, 0) /
          entries.length
        : 0;

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);

    const currentWeekTotal = entries
      .filter((entry) => new Date(entry.createdAt) >= oneWeekAgo)
      .reduce((sum, entry) => sum + entry.amountGrams, 0);

    const previousWeekTotal = entries
      .filter((entry) => {
        const date = new Date(entry.createdAt);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      })
      .reduce((sum, entry) => sum + entry.amountGrams, 0);

    const reductionProgress =
      previousWeekTotal === 0
        ? 0
        : clamp(
            (previousWeekTotal - currentWeekTotal) / (previousWeekTotal * 0.2),
          );

    return [
      {
        id: "m1",
        title: "Missão 1: constância",
        description: "Registre consumo em 7 dias diferentes.",
        progress: clamp(uniqueDays / 7),
      },
      {
        id: "m2",
        title: "Missão 2: média consciente",
        description: "Mantenha média abaixo de 300 g por registro.",
        progress: avgConsumption === 0 ? 0 : clamp(300 / avgConsumption),
      },
      {
        id: "m3",
        title: "Missão 3: reduzir 20%",
        description: "Consuma 20% menos que na semana anterior.",
        progress: reductionProgress,
      },
    ];
  }, [entries]);

  const completedMissions = missions.filter(
    (mission) => mission.progress >= 1,
  ).length;

  const shareSuggestions = useMemo(() => {
    const avgConsumption =
      entries.length > 0
        ? entries.reduce((sum, entry) => sum + entry.amountGrams, 0) /
          entries.length
        : 0;

    const pool = [
      `Conquista das missões: completei ${completedMissions}/${missions.length} metas e já somei ${totalGrams.toFixed(0)}g registrados.`,
      `Missão em andamento: meu ritmo médio está em ${avgConsumption.toFixed(0)}g por registro e sigo evoluindo.`,
      `Atualização de progresso: ${completedMissions} missão(ões) finalizadas e foco total nas próximas etapas.`,
      `Resumo da semana: ${totalGrams.toFixed(0)}g registrados, metas avançando e constância no topo.`,
      `Novo marco desbloqueado: ${completedMissions}/${missions.length} objetivos concluídos até aqui.`,
      `Sigo firme: dados atualizados e progresso real nas missões ambientais.`,
    ];

    const today = new Date();
    const seed =
      today.getDate() + today.getMonth() * 13 + Math.round(totalGrams);
    const ordered = pool
      .map((text, index) => ({
        text,
        score: (seed * (index + 2) + index * 29) % 101,
      }))
      .sort((a, b) => a.score - b.score)
      .map((item) => item.text);

    return ordered.slice(0, 4);
  }, [completedMissions, entries, missions.length, totalGrams]);

  const emojiCommentSuggestions = useMemo(() => {
    const pool = [
      "💪 Mantendo o foco nas metas!",
      "♻️ Cada registro conta!",
      "🚀 Evolução contínua por aqui.",
      "👏 Um passo de cada vez!",
      "🌱 Pequenos hábitos, grande impacto.",
    ];
    const today = new Date();
    const seed = today.getDate() * 5 + completedMissions;
    const ordered = pool
      .map((text, index) => ({
        text,
        score: (seed * (index + 7) + index * 19) % 97,
      }))
      .sort((a, b) => a.score - b.score)
      .map((item) => item.text);
    return ordered.slice(0, 3);
  }, [completedMissions]);

  useEffect(() => {
    const completedIds = missions
      .filter((mission) => mission.progress >= 1)
      .map((mission) => mission.id);

    if (!initializedCompletionState.current) {
      notifiedMissionIds.current = new Set(completedIds);
      initializedCompletionState.current = true;
      return;
    }

    const newlyCompleted = missions.find(
      (mission) =>
        mission.progress >= 1 && !notifiedMissionIds.current.has(mission.id),
    );

    if (!newlyCompleted) return;

    notifiedMissionIds.current.add(newlyCompleted.id);
    setSelectedSuggestion(0);
    setSelectedCommentIndexes(emojiCommentSuggestions.map((_, index) => index));
    setShareOpen(true);
  }, [emojiCommentSuggestions, missions]);

  const toggleComment = (index: number) => {
    setSelectedCommentIndexes((prev) => {
      if (prev.includes(index)) {
        return prev.filter((item) => item !== index);
      }
      return [...prev, index].sort((a, b) => a - b);
    });
  };

  const publishMissionAchievement = async () => {
    try {
      setPublishing(true);
      await shareAchievement({
        content: shareSuggestions[selectedSuggestion] || shareSuggestions[0],
        totalGrams,
        entriesCount: entries.length,
        initialComments: emojiCommentSuggestions.filter((_, index) =>
          selectedCommentIndexes.includes(index),
        ),
      });
      setShareOpen(false);
      Alert.alert(
        "Publicada",
        "Sua conquista foi compartilhada com seus amigos.",
      );
    } catch (error: any) {
      Alert.alert("Erro", translateFirebaseError(error));
    } finally {
      setPublishing(false);
    }
  };

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        border: "#123252",
        textPrimary: "#ffffff",
        textSecondary: "#b7cde6",
        track: "#1e3a57",
        modalSurface: "#0c2740",
        modalOption: "#0f3556",
        modalOptionIdle: "#0b1f33",
        modalOptionBorder: "#3f8cc8",
        modalOptionIdleBorder: "#244966",
        modalOptionText: "#d7ebff",
        modalOptionMuted: "#8aa6c0",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        border: "#d3e0ed",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        track: "#e1ebf5",
        modalSurface: "#ffffff",
        modalOption: "#d9ebfb",
        modalOptionIdle: "#eff5fb",
        modalOptionBorder: "#7fb2de",
        modalOptionIdleBorder: "#c6daed",
        modalOptionText: "#1d3750",
        modalOptionMuted: "#6b7f95",
      };

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Complete as metas e acompanhe sua evolução no consumo de plástico.
      </Text>

      {missions.map((mission) => {
        const percent = Math.round(mission.progress * 100);
        return (
          <View
            key={mission.id}
            style={[
              styles.card,
              { backgroundColor: palette.panel, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              {mission.title}
            </Text>
            <Text
              style={[styles.cardDescription, { color: palette.textSecondary }]}
            >
              {mission.description}
            </Text>

            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor: palette.track,
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: `${percent}%`,
                  backgroundColor: percent === 100 ? "#2dd4bf" : "#36a3ff",
                  height: "100%",
                }}
              />
            </View>

            <Text style={[styles.progressText, { color: palette.textPrimary }]}>
              {percent}% concluído
            </Text>
          </View>
        );
      })}

      <Modal
        visible={shareOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setShareOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          <View
            style={{
              backgroundColor: palette.modalSurface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderColor: palette.border,
              maxHeight: "88%",
            }}
          >
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            >
              <Button
                mode="text"
                textColor={palette.textSecondary}
                onPress={() => setShareOpen(false)}
                style={{ alignSelf: "flex-start" }}
              >
                Fechar
              </Button>

              <Text
                style={{
                  color: palette.textPrimary,
                  fontWeight: "800",
                  fontSize: 18,
                  marginBottom: 10,
                }}
              >
                Escolha sua conquista
              </Text>
              {shareSuggestions.map((suggestion, index) => {
                const selected = selectedSuggestion === index;
                return (
                  <TouchableOpacity
                    key={`${index}-${suggestion}`}
                    onPress={() => setSelectedSuggestion(index)}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      backgroundColor: selected
                        ? palette.modalOption
                        : palette.modalOptionIdle,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected
                        ? palette.modalOptionBorder
                        : palette.modalOptionIdleBorder,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#36a3ff" : palette.modalOptionMuted,
                        marginRight: 8,
                      }}
                    >
                      ●
                    </Text>
                    <Text style={{ color: palette.modalOptionText, flex: 1 }}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text
                style={{
                  color: palette.textPrimary,
                  fontWeight: "800",
                  fontSize: 16,
                  marginTop: 8,
                  marginBottom: 10,
                }}
              >
                Reações automáticas (emoji)
              </Text>
              {emojiCommentSuggestions.map((comment, index) => {
                const selected = selectedCommentIndexes.includes(index);
                return (
                  <TouchableOpacity
                    key={`${index}-${comment}`}
                    onPress={() => toggleComment(index)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: selected
                        ? palette.modalOption
                        : palette.modalOptionIdle,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selected
                        ? palette.modalOptionBorder
                        : palette.modalOptionIdleBorder,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#36a3ff" : palette.modalOptionMuted,
                        marginRight: 8,
                      }}
                    >
                      {selected ? "✅" : "⭕"}
                    </Text>
                    <Text style={{ color: palette.modalOptionText, flex: 1 }}>
                      {comment}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Button
                mode="contained"
                buttonColor="#36a3ff"
                textColor="#032746"
                loading={publishing}
                onPress={publishMissionAchievement}
              >
                Publicar conquista
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#061526",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    color: "#ffffff",
  },
  subtitle: {
    color: "#b7cde6",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#0c2740",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#123252",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    color: "#eaf4ff",
  },
  cardDescription: {
    color: "#b7cde6",
    marginBottom: 10,
  },
  progressText: {
    fontWeight: "600",
    color: "#d7ebff",
  },
});
