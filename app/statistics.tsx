import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${month}/${year.slice(2)}`;
}

export default function StatisticsScreen() {
  const { entries, totalGrams } = usePlasticConsumption();

  const { averagePerEntry, monthlyData, maxMonthValue } = useMemo(() => {
    const average = entries.length > 0 ? totalGrams / entries.length : 0;

    const byMonth = new Map<string, number>();
    for (const entry of entries) {
      const key = getMonthKey(new Date(entry.createdAt));
      byMonth.set(key, (byMonth.get(key) ?? 0) + entry.amountGrams);
    }

    const monthly = Array.from(byMonth.entries())
      .map(([month, grams]) => ({ month, grams }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    const max = monthly.reduce(
      (currentMax, item) => Math.max(currentMax, item.grams),
      0,
    );

    return {
      averagePerEntry: average,
      monthlyData: monthly,
      maxMonthValue: max,
    };
  }, [entries, totalGrams]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Estatística</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Total registrado</Text>
        <Text style={styles.value}>{totalGrams.toFixed(0)} g</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Média por registro</Text>
        <Text style={styles.value}>{averagePerEntry.toFixed(1)} g</Text>
      </View>

      <Text style={styles.sectionTitle}>Consumo por mês (últimos 6)</Text>

      {monthlyData.length === 0 ? (
        <Text style={styles.emptyText}>
          Sem dados suficientes para o gráfico.
        </Text>
      ) : (
        <View style={styles.chartCard}>
          {monthlyData.map((item) => {
            const width =
              maxMonthValue === 0 ? 0 : (item.grams / maxMonthValue) * 100;
            return (
              <View key={item.month} style={{ marginBottom: 12 }}>
                <Text style={styles.monthLabel}>
                  {monthLabel(item.month)} - {item.grams.toFixed(0)} g
                </Text>
                <View
                  style={{
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: "#1e3a57",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.max(width, 3)}%`,
                      backgroundColor: "#36a3ff",
                      height: "100%",
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
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
    marginBottom: 12,
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#0c2740",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#123252",
  },
  label: {
    color: "#b7cde6",
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: "#eaf4ff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#eaf4ff",
  },
  emptyText: {
    color: "#b7cde6",
  },
  chartCard: {
    backgroundColor: "#0c2740",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#123252",
  },
  monthLabel: {
    marginBottom: 4,
    color: "#d9ebff",
  },
});
