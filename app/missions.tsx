import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";

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
  const { entries } = usePlasticConsumption();

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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Missões</Text>
      <Text style={styles.subtitle}>
        Complete as metas e acompanhe sua evolução no consumo de plástico.
      </Text>

      {missions.map((mission) => {
        const percent = Math.round(mission.progress * 100);
        return (
          <View key={mission.id} style={styles.card}>
            <Text style={styles.cardTitle}>{mission.title}</Text>
            <Text style={styles.cardDescription}>{mission.description}</Text>

            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor: "#1e3a57",
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

            <Text style={styles.progressText}>{percent}% concluído</Text>
          </View>
        );
      })}
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
