import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";
import { useThemePreference } from "../src/ThemePreferenceContext";

type DashboardRange = "week" | "month" | "year";
type InsightFocus = "week" | "month" | "next";

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthPart] = month.split("-");
  return `${monthPart}/${year.slice(2)}`;
}

function shortMonthLabel(date: Date) {
  return [
    "Jan",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ][date.getMonth()];
}

function shortWeekday(date: Date) {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][date.getDay()];
}

function bucketLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function trendTone(delta: number) {
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

function trendMessage(tone: ReturnType<typeof trendTone>) {
  if (tone === "positive")
    return "Semana no modo turbo. Você subiu o nível sem pedir licença.";
  if (tone === "negative")
    return "A semana deu uma leve derrapada. Nada que um ajuste de rota não resolva.";
  return "Ritmo estável. Sem drama, sem susto, sem novela.";
}

export default function StatisticsScreen() {
  const { entries } = usePlasticConsumption();
  const { darkModeEnabled } = useThemePreference();
  const { width } = useWindowDimensions();
  const [statsRange, setStatsRange] = useState<DashboardRange>("month");
  const [insightFocus, setInsightFocus] = useState<InsightFocus>("week");
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);
  const chartWidth = Math.max(250, Math.min(width - 72, 286));
  const barPositiveColor = darkModeEnabled ? "#2cb67d" : "#17603f";
  const barNegativeColor = darkModeEnabled ? "#ef4444" : "#a61d24";
  const chartLinePrimary = darkModeEnabled ? "#5d7da1" : "#20384f";
  const chartLineSecondary = darkModeEnabled ? "#304d68" : "#3a5169";
  const chartLabelColor = darkModeEnabled ? "#dfeaf4" : "#244057";
  const chartValueColor = darkModeEnabled ? "#ffffff" : "#173047";
  const chartBaseRing = darkModeEnabled ? "#1f1f1f" : "#d8e2eb";

  useEffect(() => {
    setSelectedBarKey(null);
  }, [statsRange]);

  const palette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#ffffff",
        textSecondary: "#b7cde6",
        textMuted: "#9ab6d3",
        textSoft: "#d7ebff",
        statsPanel: "#0a2034",
        statsPanelAlt: "#102a43",
        statsBorder: "#1d3b5c",
        statsBorderAlt: "#244463",
        statsTextMuted: "#b7b7b7",
        statsTextSubtle: "#d7d7d7",
        segmentBg: "#0c2237",
        segmentBgActive: "#f5f5f5",
        segmentBorder: "#244463",
        segmentBorderActive: "#ffffff",
        segmentText: "#f4f4f4",
        segmentTextActive: "#000000",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#173047",
        textSecondary: "#485c70",
        textMuted: "#576d82",
        textSoft: "#1f3b55",
        statsPanel: "#ffffff",
        statsPanelAlt: "#f8fbff",
        statsBorder: "#d7e5f2",
        statsBorderAlt: "#dbe8f5",
        statsTextMuted: "#4d6378",
        statsTextSubtle: "#3f556a",
        segmentBg: "#eef4fa",
        segmentBgActive: "#dbe9f6",
        segmentBorder: "#c7d8e8",
        segmentBorderActive: "#89aac7",
        segmentText: "#3f566b",
        segmentTextActive: "#10293f",
      };

  const dashboard = useMemo(() => {
    const goalPerDay = 50;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const currentStart = new Date(today);
    currentStart.setHours(0, 0, 0, 0);
    if (statsRange === "week") {
      currentStart.setDate(currentStart.getDate() - 6);
    } else if (statsRange === "month") {
      currentStart.setDate(1);
    } else {
      currentStart.setMonth(0, 1);
    }

    const rangeDays = Math.max(
      1,
      Math.floor((today.getTime() - currentStart.getTime()) / 86400000) + 1,
    );

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - rangeDays);

    const normalized = [...entries]
      .map((entry) => ({
        grams: entry.amountGrams,
        date: new Date(entry.createdAt),
        categoryName: entry.categoryName,
        categoryIcon: entry.categoryIcon,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const dailyMap = new Map<string, number>();
    let currentTotal = 0;
    let previousTotal = 0;

    normalized.forEach((item) => {
      if (item.date < previousStart || item.date > today) return;
      const key = dayKey(item.date);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + item.grams);
      if (item.date >= currentStart) currentTotal += item.grams;
      else previousTotal += item.grams;
    });

    const currentAverage = currentTotal / rangeDays;
    const previousAverage = previousTotal / rangeDays;
    const growthPercent =
      previousAverage > 0
        ? ((currentAverage - previousAverage) / previousAverage) * 100
        : 0;

    let aboveGoalDays = 0;
    for (let i = 0; i < rangeDays; i += 1) {
      const date = new Date(currentStart);
      date.setDate(currentStart.getDate() + i);
      const grams = dailyMap.get(dayKey(date)) ?? 0;
      if (grams >= goalPerDay) aboveGoalDays += 1;
    }
    const belowGoalDays = rangeDays - aboveGoalDays;
    const topPercent = Math.max(
      5,
      Math.min(
        99,
        Math.round(
          100 -
            (currentAverage / goalPerDay) * 42 -
            (aboveGoalDays / Math.max(rangeDays, 1)) * 28,
        ),
      ),
    );

    const buildCategories = (start: Date, end: Date) => {
      const grouped = new Map<
        string,
        { label: string; value: number; icon?: string }
      >();
      normalized.forEach((item) => {
        if (item.date < start || item.date > end) return;
        const label = item.categoryName?.trim() || "Sem categoria";
        const current = grouped.get(label) ?? {
          label,
          value: 0,
          icon: item.categoryIcon,
        };
        current.value += item.grams;
        if (!current.icon && item.categoryIcon)
          current.icon = item.categoryIcon;
        grouped.set(label, current);
      });
      return [...grouped.values()].sort((a, b) => b.value - a.value);
    };

    const barSegments =
      statsRange === "week"
        ? Array.from({ length: 7 }, (_, index) => {
            const start = new Date(currentStart);
            start.setDate(currentStart.getDate() + index);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            return {
              key: dayKey(start),
              label: shortWeekday(start),
              detail: bucketLabel(start),
              grams: dailyMap.get(dayKey(start)) ?? 0,
              start,
              end,
              categories: buildCategories(start, end),
            };
          })
        : statsRange === "month"
          ? Array.from(
              {
                length: Math.max(
                  4,
                  Math.ceil(
                    new Date(
                      today.getFullYear(),
                      today.getMonth() + 1,
                      0,
                    ).getDate() / 7,
                  ),
                ),
              },
              (_, index) => {
                const bucketStart = new Date(currentStart);
                bucketStart.setDate(1 + index * 7);
                bucketStart.setHours(0, 0, 0, 0);
                const bucketEnd = new Date(bucketStart);
                bucketEnd.setDate(
                  Math.min(
                    bucketStart.getDate() + 6,
                    new Date(
                      today.getFullYear(),
                      today.getMonth() + 1,
                      0,
                    ).getDate(),
                  ),
                );
                bucketEnd.setHours(23, 59, 59, 999);
                let grams = 0;
                for (let i = 0; i < 7; i += 1) {
                  const date = new Date(bucketStart);
                  date.setDate(bucketStart.getDate() + i);
                  if (date.getMonth() === currentStart.getMonth())
                    grams += dailyMap.get(dayKey(date)) ?? 0;
                }
                return {
                  key: dayKey(bucketStart),
                  label: `Semana ${index + 1}`,
                  detail: `${bucketLabel(bucketStart)} - ${bucketLabel(bucketEnd)}`,
                  grams,
                  start: bucketStart,
                  end: bucketEnd,
                  categories: buildCategories(bucketStart, bucketEnd),
                };
              },
            )
          : Array.from({ length: 12 }, (_, index) => {
              const monthStart = new Date(today.getFullYear(), index, 1);
              monthStart.setHours(0, 0, 0, 0);
              const monthEnd = new Date(today.getFullYear(), index + 1, 1);
              monthEnd.setDate(0);
              monthEnd.setHours(23, 59, 59, 999);
              let grams = 0;
              normalized.forEach((item) => {
                if (item.date >= monthStart && item.date <= monthEnd)
                  grams += item.grams;
              });
              return {
                key: monthKey(monthStart),
                label: shortMonthLabel(monthStart),
                detail: shortMonthLabel(monthStart),
                grams,
                start: monthStart,
                end: monthEnd,
                categories: buildCategories(monthStart, monthEnd),
              };
            });

    const barMax = Math.max(...barSegments.map((item) => item.grams), 1);
    const pieSlices = [
      { label: "Abaixo da meta", value: belowGoalDays, color: "#22c55e" },
      { label: "Acima da meta", value: aboveGoalDays, color: "#ef4444" },
    ];
    const pieTotal = pieSlices.reduce((sum, item) => sum + item.value, 0) || 1;
    const pieSize = 174;
    const pieStrokeWidth = 26;
    const pieRadius = (pieSize - pieStrokeWidth) / 2;
    const pieCircumference = 2 * Math.PI * pieRadius;
    let accumulated = 0;
    const doughnut = pieSlices.map((item) => {
      const sliceSize = (item.value / pieTotal) * pieCircumference;
      const next = {
        ...item,
        dashArray: `${sliceSize} ${pieCircumference - sliceSize}`,
        dashOffset: -accumulated,
      };
      accumulated += sliceSize;
      return next;
    });

    return {
      rangeDays,
      goalPerDay,
      currentTotal,
      currentAverage,
      previousAverage,
      growthPercent,
      aboveGoalDays,
      belowGoalDays,
      topPercent,
      barSegments,
      barMax,
      pieSize,
      pieStrokeWidth,
      pieRadius,
      pieCircumference,
      pieSlices: doughnut,
    };
  }, [entries, statsRange]);

  const selectedSegment = selectedBarKey
    ? (dashboard.barSegments.find(
        (segment) => segment.key === selectedBarKey,
      ) ?? null)
    : null;
  const categoryColors = [
    "#4fd1ff",
    "#2cb67d",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#84cc16",
    "#fb7185",
  ];

  const pieTotal =
    selectedSegment?.categories.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const pieCircumference = 2 * Math.PI * 58;
  let accumulated = 0;
  const categorySlices = (selectedSegment?.categories ?? []).map(
    (item, index) => {
      const sliceSize =
        pieTotal > 0 ? (item.value / pieTotal) * pieCircumference : 0;
      const next = {
        ...item,
        color: categoryColors[index % categoryColors.length],
        dashArray: `${sliceSize} ${pieCircumference - sliceSize}`,
        dashOffset: -accumulated,
      };
      accumulated += sliceSize;
      return next;
    },
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Consumo de plástico — visão completa
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: palette.panel, borderColor: palette.panelAlt },
        ]}
      >
        <Text style={[styles.label, { color: palette.textSecondary }]}>
          Média diária
        </Text>
        <Text style={[styles.value, { color: palette.textPrimary }]}>
          {dashboard.currentAverage.toFixed(0)}g
        </Text>
        <Text style={{ color: "#8bd14f", marginTop: 6, fontSize: 11 }}>
          {dashboard.growthPercent >= 0
            ? `↑ ${dashboard.growthPercent.toFixed(0)}%`
            : `↓ ${Math.abs(dashboard.growthPercent).toFixed(0)}%`}{" "}
          vs período anterior
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
        Período
      </Text>
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        {(["week", "month", "year"] as DashboardRange[]).map((range) => {
          const active = statsRange === range;
          return (
            <TouchableOpacity
              key={range}
              onPress={() => setStatsRange(range)}
              style={{
                flex: 1,
                marginRight: range === "year" ? 0 : 8,
                paddingVertical: 9,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: active
                  ? palette.segmentBgActive
                  : palette.segmentBg,
                borderWidth: 1,
                borderColor: active
                  ? palette.segmentBorderActive
                  : palette.segmentBorder,
              }}
            >
              <Text
                style={{
                  color: active
                    ? palette.segmentTextActive
                    : palette.segmentText,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {range === "week"
                  ? "Semana"
                  : range === "month"
                    ? "Mês"
                    : "Ano"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        {[
          {
            label: "Média diária",
            value: `${dashboard.currentAverage.toFixed(0)}g`,
            note:
              dashboard.growthPercent >= 0
                ? `↑ ${dashboard.growthPercent.toFixed(0)}%`
                : `↓ ${Math.abs(dashboard.growthPercent).toFixed(0)}%`,
          },
          {
            label: "Total evitado",
            value: `${dashboard.currentTotal.toFixed(0)}g`,
            note: "período selecionado",
          },
          {
            label: "Meta atingida",
            value: `${dashboard.aboveGoalDays}/${dashboard.rangeDays}`,
            note: "dias no alvo",
          },
          {
            label: "Ranking",
            value: `Top ${dashboard.topPercent}%`,
            note: "neste recorte",
          },
        ].map((card) => (
          <View
            key={card.label}
            style={{
              width: "48%",
              backgroundColor: palette.statsPanelAlt,
              borderRadius: 18,
              padding: 12,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: palette.statsBorderAlt,
              minHeight: 92,
            }}
          >
            <Text
              style={{
                color: palette.statsTextMuted,
                marginBottom: 8,
                fontSize: 13,
              }}
            >
              {card.label}
            </Text>
            <Text
              style={{
                color: palette.textPrimary,
                fontSize: 24,
                fontWeight: "700",
              }}
            >
              {card.value}
            </Text>
            <Text style={{ color: "#8bd14f", marginTop: 6, fontSize: 11 }}>
              {card.note}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: palette.statsPanel,
          borderRadius: 22,
          padding: 14,
          paddingRight: 20,
          borderWidth: 1,
          borderColor: palette.statsBorder,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <Text
          style={{
            color: palette.textPrimary,
            fontWeight: "800",
            fontSize: 16,
            marginBottom: 6,
          }}
        >
          Seu ritmo
        </Text>
        <Text
          style={{
            color: palette.statsTextMuted,
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          As barras respondem ao período escolhido. Toque nos períodos acima
          para mudar o recorte.
        </Text>
        <View style={{ position: "relative", width: chartWidth, height: 176 }}>
          <Svg width={chartWidth} height={176}>
            <Defs>
              <LinearGradient id="dashBar" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#4fd1ff" />
                <Stop offset="100%" stopColor="#1d6fa8" />
              </LinearGradient>
            </Defs>
            <Line
              x1="16"
              y1={138}
              x2={chartWidth - 20}
              y2={138}
              stroke={chartLinePrimary}
              strokeWidth="1"
            />
            <Line
              x1="16"
              y1={94}
              x2={chartWidth - 20}
              y2={94}
              stroke={chartLineSecondary}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <Line
              x1="16"
              y1={50}
              x2={chartWidth - 20}
              y2={50}
              stroke={chartLineSecondary}
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {dashboard.barSegments.map((segment, index) => {
              const barAreaHeight = 88;
              const barWidth = Math.max(
                7,
                Math.floor(
                  (chartWidth - 60) /
                    Math.max(dashboard.barSegments.length * 2.9, 1),
                ),
              );
              const barGap = Math.max(
                5,
                (chartWidth - 44 - dashboard.barSegments.length * barWidth) /
                  Math.max(dashboard.barSegments.length - 1, 1),
              );
              const barHeight =
                (segment.grams / dashboard.barMax) * barAreaHeight;
              const x = 18 + index * (barWidth + barGap);
              const y = 138 - barHeight;
              return (
                <G key={segment.key}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 4)}
                    fill={
                      segment.grams >= dashboard.goalPerDay
                        ? barNegativeColor
                        : barPositiveColor
                    }
                    opacity={
                      selectedBarKey && selectedBarKey !== segment.key
                        ? 0.65
                        : 1
                    }
                    stroke={
                      selectedBarKey === segment.key
                        ? darkModeEnabled
                          ? "#ffffff"
                          : "#1d3750"
                        : "transparent"
                    }
                    strokeWidth={selectedBarKey === segment.key ? 1.5 : 0}
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={152}
                    fontSize="8"
                    textAnchor="middle"
                    fill={chartLabelColor}
                  >
                    {segment.label}
                  </SvgText>
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 4}
                    fontSize="8"
                    textAnchor="middle"
                    fill={chartValueColor}
                  >
                    {segment.grams.toFixed(0)}g
                  </SvgText>
                </G>
              );
            })}
          </Svg>
          {dashboard.barSegments.map((segment, index) => {
            const barAreaHeight = 88;
            const barWidth = Math.max(
              7,
              Math.floor(
                (chartWidth - 60) /
                  Math.max(dashboard.barSegments.length * 2.9, 1),
              ),
            );
            const barGap = Math.max(
              5,
              (chartWidth - 44 - dashboard.barSegments.length * barWidth) /
                Math.max(dashboard.barSegments.length - 1, 1),
            );
            const barHeight =
              (segment.grams / dashboard.barMax) * barAreaHeight;
            const x = 18 + index * (barWidth + barGap);
            const y = 138 - barHeight;
            return (
              <TouchableOpacity
                key={`${segment.key}-touch`}
                onPress={() => setSelectedBarKey(segment.key)}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: barWidth,
                  height: Math.max(barHeight, 18),
                }}
              />
            );
          })}
        </View>
      </View>

      <View
        style={{
          backgroundColor: palette.statsPanel,
          borderRadius: 22,
          padding: 14,
          borderWidth: 1,
          borderColor: palette.statsBorder,
          marginTop: 18,
          marginBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: palette.textPrimary,
              fontWeight: "800",
              fontSize: 16,
            }}
          >
            Categorias consumidas
          </Text>
        </View>

        <View
          style={{
            backgroundColor: palette.segmentBg,
            borderRadius: 18,
            padding: 14,
            alignItems: "center",
            paddingTop: 20,
          }}
        >
          {selectedSegment ? (
            <>
              <Text
                style={{
                  color: palette.textPrimary,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                {selectedSegment.label}
              </Text>
              <Text
                style={{
                  color: palette.statsTextMuted,
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                {selectedSegment.detail} • {selectedSegment.grams.toFixed(0)}g
              </Text>
              <View style={{ alignItems: "center", marginTop: 4 }}>
                <Svg width={170} height={170}>
                  <G rotation="-90" origin="85, 85">
                    <Circle
                      cx={85}
                      cy={85}
                      r={58}
                      stroke={chartBaseRing}
                      strokeWidth={24}
                      fill="none"
                    />
                    {categorySlices.map((slice) => (
                      <Circle
                        key={slice.label}
                        cx={85}
                        cy={85}
                        r={58}
                        stroke={slice.color}
                        strokeWidth={24}
                        fill="none"
                        strokeDasharray={slice.dashArray}
                        strokeDashoffset={slice.dashOffset}
                      />
                    ))}
                  </G>
                </Svg>
                <View style={{ marginTop: -112, alignItems: "center" }}>
                  <Text
                    style={{
                      color: palette.textPrimary,
                      fontSize: 22,
                      fontWeight: "800",
                    }}
                  >
                    {selectedSegment.grams.toFixed(0)}g
                  </Text>
                  <Text style={{ color: palette.statsTextMuted, fontSize: 12 }}>
                    consumo
                  </Text>
                </View>
              </View>
              <View style={{ width: "100%", marginTop: 50 }}>
                {categorySlices.length > 0 ? (
                  categorySlices.map((slice) => (
                    <View
                      key={slice.label}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: slice.color,
                          marginRight: 8,
                        }}
                      />
                      <Text
                        style={{
                          color: palette.statsTextSubtle,
                          fontSize: 12,
                          flex: 1,
                        }}
                      >
                        {slice.label}
                      </Text>
                      <Text
                        style={{ color: palette.textPrimary, fontSize: 12 }}
                      >
                        {slice.value.toFixed(0)}g
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text
                    style={{
                      color: palette.statsTextMuted,
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    Sem categorias registradas nesse trecho.
                  </Text>
                )}
              </View>
            </>
          ) : (
            <Text
              style={{
                color: palette.statsTextMuted,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Toque em uma barra acima para ver a pizza das categorias
              consumidas.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
    fontSize: 13,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  label: {
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
});
