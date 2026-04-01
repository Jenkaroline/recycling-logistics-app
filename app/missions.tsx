import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
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
        title: "Missao 1: constancia",
        description: "Registre consumo em 7 dias diferentes.",
        progress: clamp(uniqueDays / 7),
      },
      {
        id: "m2",
        title: "Missao 2: media consciente",
        description: "Mantenha media abaixo de 300 g por registro.",
        progress: avgConsumption === 0 ? 0 : clamp(300 / avgConsumption),
      },
      {
        id: "m3",
        title: "Missao 3: reduzir 20%",
        description: "Consuma 20% menos que na semana anterior.",
        progress: reductionProgress,
      },
    ];
  }, [entries]);

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f5f7fb" }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 6 }}>
        Missoes
      </Text>
      <Text style={{ color: "#4b5563", marginBottom: 16 }}>
        Complete as metas e acompanhe sua evolucao no consumo de plastico.
      </Text>

      {missions.map((mission) => {
        const percent = Math.round(mission.progress * 100);
        return (
          <View
            key={mission.id}
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", marginBottom: 6 }}>
              {mission.title}
            </Text>
            <Text style={{ color: "#6b7280", marginBottom: 10 }}>
              {mission.description}
            </Text>

            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor: "#e5e7eb",
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: `${percent}%`,
                  backgroundColor: percent === 100 ? "#16a34a" : "#2563eb",
                  height: "100%",
                }}
              />
            </View>

            <Text style={{ fontWeight: "600" }}>{percent}% concluido</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
