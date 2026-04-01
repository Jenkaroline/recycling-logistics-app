import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
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
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f5f7fb" }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
        Estatistica
      </Text>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#6b7280", marginBottom: 4 }}>
          Total registrado
        </Text>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          {totalGrams.toFixed(0)} g
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <Text style={{ color: "#6b7280", marginBottom: 4 }}>
          Media por registro
        </Text>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          {averagePerEntry.toFixed(1)} g
        </Text>
      </View>

      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
        Consumo por mes (ultimos 6)
      </Text>

      {monthlyData.length === 0 ? (
        <Text style={{ color: "#6b7280" }}>
          Sem dados suficientes para o grafico.
        </Text>
      ) : (
        <View
          style={{ backgroundColor: "#fff", borderRadius: 12, padding: 14 }}
        >
          {monthlyData.map((item) => {
            const width =
              maxMonthValue === 0 ? 0 : (item.grams / maxMonthValue) * 100;
            return (
              <View key={item.month} style={{ marginBottom: 12 }}>
                <Text style={{ marginBottom: 4, color: "#374151" }}>
                  {monthLabel(item.month)} - {item.grams.toFixed(0)} g
                </Text>
                <View
                  style={{
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: "#e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.max(width, 3)}%`,
                      backgroundColor: "#0ea5e9",
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
