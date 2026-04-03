import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Button } from "react-native-paper";

type CollectionPoint = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type PointWithDistance = CollectionPoint & {
  distanceKm: number;
};

type RegionPointWithDistance = CollectionPoint & {
  distanceToSelectedRegionKm: number;
  distanceFromUserKm: number | null;
};

type PointDetails = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceFromUserKm: number | null;
  distanceToSelectedRegionKm: number | null;
};

const COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: "1",
    name: "Ecoponto República",
    address: "Região central - São Paulo",
    latitude: -23.5456,
    longitude: -46.6378,
  },
  {
    id: "2",
    name: "Coleta Seletiva Consolação",
    address: "Consolação - São Paulo",
    latitude: -23.5545,
    longitude: -46.6586,
  },
  {
    id: "3",
    name: "Ecoponto Vila Mariana",
    address: "Vila Mariana - São Paulo",
    latitude: -23.5899,
    longitude: -46.6344,
  },
  {
    id: "4",
    name: "Ecoponto Pinheiros",
    address: "Pinheiros - São Paulo",
    latitude: -23.5676,
    longitude: -46.6969,
  },
  {
    id: "5",
    name: "Ecoponto Santana",
    address: "Santana - São Paulo",
    latitude: -23.5015,
    longitude: -46.6248,
  },
  {
    id: "6",
    name: "Ecoponto Itaquera",
    address: "Itaquera - São Paulo",
    latitude: -23.5429,
    longitude: -46.4718,
  },
  {
    id: "7",
    name: "Ecoponto Santo Amaro",
    address: "Santo Amaro - São Paulo",
    latitude: -23.6547,
    longitude: -46.7036,
  },
  {
    id: "8",
    name: "Ecoponto Osasco Centro",
    address: "Centro - Osasco",
    latitude: -23.5329,
    longitude: -46.7916,
  },
  {
    id: "9",
    name: "Ecoponto Guarulhos Centro",
    address: "Centro - Guarulhos",
    latitude: -23.4543,
    longitude: -46.5333,
  },
  {
    id: "10",
    name: "Ecoponto ABC",
    address: "Santo André - SP",
    latitude: -23.6639,
    longitude: -46.5383,
  },
  {
    id: "11",
    name: "Ecoponto Campinas Centro",
    address: "Centro - Campinas",
    latitude: -22.9056,
    longitude: -47.0608,
  },
  {
    id: "12",
    name: "Ecoponto Santos",
    address: "Boqueirão - Santos",
    latitude: -23.9677,
    longitude: -46.3289,
  },
];

const NEARBY_DISTANCE_KM = 80;
const REGION_RADIUS_OPTIONS_KM = [3, 5, 10, 20];

const DEFAULT_REGION: Region = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

const COLORS = {
  background: "#061526",
  panel: "#0c2740",
  panelAlt: "#123252",
  detailsPanel: "#1f4f78",
  detailsPanelBorder: "#68b8ff",
  card: "#103253",
  cardAlt: "#154066",
  textPrimary: "#eaf4ff",
  textSecondary: "#b7cde6",
  heading: "#ffffff",
  accent: "#36a3ff",
  accentDark: "#1f6fb2",
  accentTextStrong: "#8dd1ff",
  danger: "#ff8a8a",
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  userLat: number,
  userLon: number,
  pointLat: number,
  pointLon: number,
) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(pointLat - userLat);
  const dLon = toRadians(pointLon - userLon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(userLat)) *
      Math.cos(toRadians(pointLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export default function MapsScreen() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");
  const [userCoords, setUserCoords] =
    useState<Location.LocationObjectCoords | null>(null);
  const [nearbyPoints, setNearbyPoints] = useState<PointWithDistance[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedRegionRadiusKm, setSelectedRegionRadiusKm] = useState(8);
  const [selectedRegionPoints, setSelectedRegionPoints] = useState<
    RegionPointWithDistance[]
  >([]);
  const [pointDetails, setPointDetails] = useState<PointDetails | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);

  const loadPointsNearSelectedRegion = useCallback(
    (latitude: number, longitude: number) => {
      const pointsInRegion = COLLECTION_POINTS.map((point) => {
        const distanceToSelectedRegionKm = calculateDistanceKm(
          latitude,
          longitude,
          point.latitude,
          point.longitude,
        );

        const distanceFromUserKm = userCoords
          ? calculateDistanceKm(
              userCoords.latitude,
              userCoords.longitude,
              point.latitude,
              point.longitude,
            )
          : null;

        return {
          ...point,
          distanceToSelectedRegionKm,
          distanceFromUserKm,
        };
      })
        .filter(
          (point) => point.distanceToSelectedRegionKm <= selectedRegionRadiusKm,
        )
        .sort(
          (a, b) => a.distanceToSelectedRegionKm - b.distanceToSelectedRegionKm,
        );

      setSelectedRegionPoints(pointsInRegion);
    },
    [selectedRegionRadiusKm, userCoords],
  );

  const syncNearbyPoints = useCallback(async () => {
    setIsSyncing(true);
    setError("");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setPermissionGranted(false);
        setError("Permissão de localização negada.");
        setNearbyPoints([]);
        return;
      }

      setPermissionGranted(true);

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserCoords(currentLocation.coords);

      const nextRegion: Region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(nextRegion);

      const pointsWithDistance = COLLECTION_POINTS.map((point) => {
        const distanceKm = calculateDistanceKm(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          point.latitude,
          point.longitude,
        );

        return {
          ...point,
          distanceKm,
        };
      })
        .filter((point) => point.distanceKm <= NEARBY_DISTANCE_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      setNearbyPoints(pointsWithDistance);
    } catch {
      setError("Não foi possível obter sua localização agora.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncNearbyPoints();
  }, [syncNearbyPoints]);

  useEffect(() => {
    if (selectedCoords) {
      loadPointsNearSelectedRegion(
        selectedCoords.latitude,
        selectedCoords.longitude,
      );
    }
  }, [loadPointsNearSelectedRegion, selectedCoords]);

  const handleClearSelection = useCallback(() => {
    setSelectedCoords(null);
    setSelectedRegionPoints([]);
    setPointDetails(null);

    if (userCoords) {
      setRegion({
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } else {
      setRegion(DEFAULT_REGION);
    }
  }, [userCoords]);

  const permissionText = useMemo(() => {
    if (permissionGranted === null) {
      return "Solicitando permissão de localização...";
    }
    if (!permissionGranted) {
      return "Permita sua localização para mostrar ecopontos próximos.";
    }
    return "Mostrando ecopontos próximos da sua posição atual.";
  }, [permissionGranted]);

  const handleMapPress = useCallback(
    (latitude: number, longitude: number) => {
      setSelectedCoords({ latitude, longitude });
      loadPointsNearSelectedRegion(latitude, longitude);
      setPointDetails(null);
    },
    [loadPointsNearSelectedRegion],
  );

  const openRouteToPoint = useCallback(
    async (point: CollectionPoint) => {
      const destination = `${point.latitude},${point.longitude}`;
      const origin = userCoords
        ? `${userCoords.latitude},${userCoords.longitude}`
        : undefined;

      const url = origin
        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

      try {
        const canOpen = await Linking.canOpenURL(url);

        if (!canOpen) {
          Alert.alert(
            "Não foi possível abrir a rota",
            "Nenhum app de mapas disponível para abrir a navegação.",
          );
          return;
        }

        await Linking.openURL(url);
      } catch {
        Alert.alert(
          "Erro ao abrir a rota",
          "Tente novamente em alguns instantes.",
        );
      }
    },
    [userCoords],
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Pontos de coleta</Text>
      <Text style={styles.subtitle}>{permissionText}</Text>

      <MapView
        style={styles.map}
        region={region}
        onPress={(event) =>
          handleMapPress(
            event.nativeEvent.coordinate.latitude,
            event.nativeEvent.coordinate.longitude,
          )
        }
      >
        {userCoords ? (
          <Marker
            coordinate={{
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
            }}
            title="Sua localização"
            pinColor={COLORS.accent}
          />
        ) : null}

        {selectedCoords ? (
          <Marker
            coordinate={{
              latitude: selectedCoords.latitude,
              longitude: selectedCoords.longitude,
            }}
            title="Região selecionada"
            pinColor="#2dd4bf"
          />
        ) : null}

        {(selectedCoords ? selectedRegionPoints : COLLECTION_POINTS).map(
          (point) => (
            <Marker
              key={point.id}
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              title={point.name}
              description={point.address}
              pinColor={selectedCoords ? "#2dd4bf" : undefined}
            />
          ),
        )}
      </MapView>

      <Button
        mode="contained"
        buttonColor={COLORS.accent}
        textColor="#02233d"
        loading={isSyncing}
        onPress={syncNearbyPoints}
      >
        Sincronizar localização
      </Button>

      <Text style={styles.helpText}>
        Toque no mapa para buscar ecopontos de uma região específica.
      </Text>

      {selectedCoords ? (
        <Button
          mode="contained"
          buttonColor={COLORS.accentDark}
          textColor="#eaf4ff"
          style={styles.clearButton}
          onPress={handleClearSelection}
        >
          Limpar seleção
        </Button>
      ) : null}

      {selectedCoords ? (
        <>
          <Text style={styles.helpText}>
            Raio da região selecionada: {selectedRegionRadiusKm} km
          </Text>

          <View style={styles.radiusRow}>
            {REGION_RADIUS_OPTIONS_KM.map((radiusKm) => (
              <Button
                key={radiusKm}
                mode={
                  selectedRegionRadiusKm === radiusKm ? "contained" : "outlined"
                }
                buttonColor={
                  selectedRegionRadiusKm === radiusKm
                    ? COLORS.accentDark
                    : COLORS.panelAlt
                }
                textColor={COLORS.textPrimary}
                compact
                onPress={() => setSelectedRegionRadiusKm(radiusKm)}
              >
                {radiusKm} km
              </Button>
            ))}
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {pointDetails ? (
        <View style={styles.detailsPanel}>
          <Text style={styles.detailsTitle}>{pointDetails.name}</Text>
          <Text style={styles.detailsText}>
            Endereço: {pointDetails.address}
          </Text>
          <Text style={styles.detailsText}>
            Coordenadas: {pointDetails.latitude.toFixed(4)},{" "}
            {pointDetails.longitude.toFixed(4)}
          </Text>
          {pointDetails.distanceFromUserKm !== null ? (
            <Text style={styles.detailsText}>
              Distância de você: {pointDetails.distanceFromUserKm.toFixed(1)} km
            </Text>
          ) : (
            <Text style={styles.detailsText}>
              Distância de você indisponível (permissão de localização negada).
            </Text>
          )}
          {pointDetails.distanceToSelectedRegionKm !== null ? (
            <Text style={styles.detailsTextStrong}>
              Distância da região selecionada:{" "}
              {pointDetails.distanceToSelectedRegionKm.toFixed(1)} km
            </Text>
          ) : null}

          <Button
            mode="contained"
            buttonColor={COLORS.accent}
            textColor="#02233d"
            onPress={() => openRouteToPoint(pointDetails)}
          >
            Ver rota
          </Button>
        </View>
      ) : null}

      {permissionGranted && nearbyPoints.length === 0 && !isSyncing ? (
        <Text style={styles.helpText}>
          Nenhum ecoponto encontrado no raio de {NEARBY_DISTANCE_KM} km.
        </Text>
      ) : null}

      {!selectedCoords ? (
        <Text style={styles.sectionTitle}>Pontos próximos de você</Text>
      ) : null}

      {!selectedCoords &&
        nearbyPoints.map((point) => (
          <View key={point.id} style={styles.pointCard}>
            <Text style={styles.pointName}>{point.name}</Text>
            <Text style={styles.pointAddress}>{point.address}</Text>
            <Text style={styles.pointDistance}>
              Distância: {point.distanceKm.toFixed(1)} km
            </Text>
            <Button
              mode="text"
              textColor={COLORS.accentTextStrong}
              style={styles.detailsAction}
              onPress={() =>
                setPointDetails({
                  id: point.id,
                  name: point.name,
                  address: point.address,
                  latitude: point.latitude,
                  longitude: point.longitude,
                  distanceFromUserKm: point.distanceKm,
                  distanceToSelectedRegionKm: null,
                })
              }
            >
              Ver detalhes
            </Button>
          </View>
        ))}

      {selectedCoords ? (
        <Text style={styles.sectionTitle}>Pontos na região selecionada</Text>
      ) : null}

      {selectedCoords && selectedRegionPoints.length === 0 ? (
        <Text style={styles.helpText}>
          Nenhum ecoponto encontrado no raio de {selectedRegionRadiusKm} km
          desta região.
        </Text>
      ) : null}

      {selectedRegionPoints.map((point) => (
        <View key={`selected-${point.id}`} style={styles.pointCardAlt}>
          <Text style={styles.pointName}>{point.name}</Text>
          <Text style={styles.pointAddress}>{point.address}</Text>
          <Text style={styles.pointDistance}>
            Distância da região clicada:{" "}
            {point.distanceToSelectedRegionKm.toFixed(1)} km
          </Text>
          <Text style={styles.pointDistance}>
            {point.distanceFromUserKm !== null
              ? `Distância de você: ${point.distanceFromUserKm.toFixed(1)} km`
              : "Distância de você indisponível (permissão de localização negada)."}
          </Text>
          <Button
            mode="text"
            textColor={COLORS.accentTextStrong}
            style={styles.detailsAction}
            onPress={() =>
              setPointDetails({
                id: point.id,
                name: point.name,
                address: point.address,
                latitude: point.latitude,
                longitude: point.longitude,
                distanceFromUserKm: point.distanceFromUserKm,
                distanceToSelectedRegionKm: point.distanceToSelectedRegionKm,
              })
            }
          >
            Ver detalhes
          </Button>
        </View>
      ))}

      <View style={styles.footerHintBox}>
        <Text style={styles.footerHint}>
          Dica: edite COLLECTION_POINTS para adicionar pontos da sua cidade.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    color: COLORS.heading,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  map: {
    height: 260,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.panelAlt,
  },
  helpText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 10,
  },
  clearButton: {
    marginBottom: 12,
    borderColor: "transparent",
  },
  radiusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  errorText: {
    color: COLORS.danger,
    marginTop: 10,
    marginBottom: 8,
    fontWeight: "600",
  },
  detailsPanel: {
    backgroundColor: COLORS.detailsPanel,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.detailsPanelBorder,
  },
  detailsTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
    color: COLORS.heading,
  },
  detailsText: {
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  detailsTextStrong: {
    color: COLORS.textPrimary,
    marginBottom: 10,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 10,
    color: COLORS.textPrimary,
  },
  pointCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  pointCardAlt: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#8ac4ff",
  },
  detailsAction: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  pointName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
    color: "#eaf4ff",
  },
  pointAddress: {
    color: "#b7cde6",
    marginBottom: 8,
  },
  pointDistance: {
    color: "#d7ebff",
    marginBottom: 6,
    fontWeight: "600",
  },
  footerHintBox: {
    marginTop: 12,
    marginBottom: 24,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.panel,
  },
  footerHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
