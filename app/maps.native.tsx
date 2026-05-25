import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Button } from "react-native-paper";
import { useThemePreference } from "../src/ThemePreferenceContext";

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

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
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
  {
    id: "13",
    name: "Ecoponto Rio Centro",
    address: "Centro - Rio de Janeiro",
    latitude: -22.9068,
    longitude: -43.1729,
  },
  {
    id: "14",
    name: "Ecoponto Belo Horizonte",
    address: "Savassi - Belo Horizonte",
    latitude: -19.9369,
    longitude: -43.9386,
  },
  {
    id: "15",
    name: "Ecoponto Curitiba",
    address: "Centro - Curitiba",
    latitude: -25.4284,
    longitude: -49.2733,
  },
  {
    id: "16",
    name: "Ecoponto Porto Alegre",
    address: "Centro Histórico - Porto Alegre",
    latitude: -30.0346,
    longitude: -51.2177,
  },
  {
    id: "17",
    name: "Ecoponto Salvador",
    address: "Barra - Salvador",
    latitude: -12.9714,
    longitude: -38.5014,
  },
  {
    id: "18",
    name: "Ecoponto Recife",
    address: "Boa Viagem - Recife",
    latitude: -8.0476,
    longitude: -34.877,
  },
  {
    id: "19",
    name: "Ecoponto Fortaleza",
    address: "Meireles - Fortaleza",
    latitude: -3.7319,
    longitude: -38.5267,
  },
  {
    id: "20",
    name: "Ecoponto Brasília",
    address: "Asa Sul - Brasília",
    latitude: -15.7939,
    longitude: -47.8828,
  },
  {
    id: "21",
    name: "Ecoponto Goiânia",
    address: "Setor Oeste - Goiânia",
    latitude: -16.6864,
    longitude: -49.2643,
  },
  {
    id: "22",
    name: "Ecoponto Manaus",
    address: "Centro - Manaus",
    latitude: -3.119,
    longitude: -60.0217,
  },
  {
    id: "23",
    name: "Ecoponto Belém",
    address: "Campina - Belém",
    latitude: -1.4558,
    longitude: -48.4902,
  },
  {
    id: "24",
    name: "Ecoponto Florianópolis",
    address: "Centro - Florianópolis",
    latitude: -27.5954,
    longitude: -48.548,
  },
];

const NEARBY_DISTANCE_KM = 80;
const REGION_RADIUS_OPTIONS_KM = [3, 5, 10, 20];
const LOCATION_PREF_KEY = "@settings/locationEnabled";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_ENDPOINTS = [
  "https://nominatim.openstreetmap.org/reverse",
  "https://nominatim.openstreetmap.fr/reverse",
];
const MAX_REVERSE_GEOCODE_LOOKUPS = 8;

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
  textSoft: "#d7ebff",
  heading: "#ffffff",
  accent: "#36a3ff",
  accentDark: "#1f6fb2",
  accentTextStrong: "#8dd1ff",
  danger: "#ff8a8a",
};

const LIGHT_COLORS = {
  background: "#f4f8fc",
  panel: "#ffffff",
  panelAlt: "#d7e5f2",
  detailsPanel: "#ffffff",
  detailsPanelBorder: "#9fc2e3",
  card: "#ffffff",
  cardAlt: "#f2f8fe",
  textPrimary: "#1d3750",
  textSecondary: "#5d748b",
  textSoft: "#33506b",
  heading: "#1d3750",
  accent: "#36a3ff",
  accentDark: "#1f6fb2",
  accentTextStrong: "#1f6fb2",
  danger: "#d24d4d",
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

function buildAddress(tags?: Record<string, string>) {
  if (!tags) return "Endereço não informado";

  const parts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:state"],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Endereço não informado";
}

async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  for (const endpoint of NOMINATIM_ENDPOINTS) {
    try {
      const url = `${endpoint}?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=pt-BR`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) continue;
      const data = await response.json();

      const displayName = data?.display_name as string | undefined;
      if (displayName && displayName.trim()) {
        return displayName;
      }

      const address = data?.address as Record<string, string> | undefined;
      if (address) {
        const formatted = [
          address.road,
          address.house_number,
          address.suburb,
          address.city || address.town || address.village,
          address.state,
        ]
          .filter(Boolean)
          .join(", ");

        if (formatted) return formatted;
      }
    } catch {
      // Try next endpoint.
    }
  }

  return null;
}

async function hydrateMissingAddresses(points: CollectionPoint[]) {
  const result = [...points];
  let lookups = 0;

  for (let index = 0; index < result.length; index += 1) {
    const point = result[index];
    if (point.address !== "Endereço não informado") continue;
    if (lookups >= MAX_REVERSE_GEOCODE_LOOKUPS) break;

    const resolved = await reverseGeocodeAddress(
      point.latitude,
      point.longitude,
    );
    if (resolved) {
      result[index] = {
        ...point,
        address: resolved,
      };
    }
    lookups += 1;
  }

  return result;
}

async function fetchRealCollectionPoints(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<CollectionPoint[]> {
  const radiusMeters = Math.max(
    1500,
    Math.min(Math.round(radiusKm * 1000), 120000),
  );
  const query = `[out:json][timeout:25];(node["amenity"="recycling"](around:${radiusMeters},${latitude},${longitude});way["amenity"="recycling"](around:${radiusMeters},${latitude},${longitude});relation["amenity"="recycling"](around:${radiusMeters},${latitude},${longitude}););out center tags;`;

  let parsedElements: OverpassElement[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(
        `${endpoint}?data=${encodeURIComponent(query)}`,
      );
      if (!response.ok) continue;
      const payload = await response.json();
      parsedElements = (payload?.elements || []) as OverpassElement[];
      if (parsedElements.length > 0) break;
    } catch {
      // Try the next endpoint.
    }
  }

  const byCoordinate = new Map<string, CollectionPoint>();

  parsedElements.forEach((item) => {
    const pointLat = item.lat ?? item.center?.lat;
    const pointLon = item.lon ?? item.center?.lon;
    if (pointLat === undefined || pointLon === undefined) return;

    const key = `${pointLat.toFixed(5)}|${pointLon.toFixed(5)}`;
    if (byCoordinate.has(key)) return;

    const tags = item.tags || {};
    const name = tags.name || tags.operator || "Ponto de reciclagem";
    byCoordinate.set(key, {
      id: `real-${item.type}-${item.id}`,
      name,
      address: buildAddress(tags),
      latitude: pointLat,
      longitude: pointLon,
    });
  });

  const rawPoints = Array.from(byCoordinate.values());
  if (rawPoints.length === 0) return rawPoints;

  const ranked = rawPoints
    .map((point) => ({
      ...point,
      _distanceRef: calculateDistanceKm(
        latitude,
        longitude,
        point.latitude,
        point.longitude,
      ),
    }))
    .sort((a, b) => a._distanceRef - b._distanceRef)
    .map(({ _distanceRef, ...point }) => point);

  return hydrateMissingAddresses(ranked);
}

export default function MapsScreen() {
  const { darkModeEnabled } = useThemePreference();
  const colors = darkModeEnabled ? COLORS : LIGHT_COLORS;
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
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
    async (latitude: number, longitude: number) => {
      let basePoints = await fetchRealCollectionPoints(
        latitude,
        longitude,
        selectedRegionRadiusKm,
      );

      if (basePoints.length === 0) {
        basePoints = await fetchRealCollectionPoints(
          latitude,
          longitude,
          Math.min(selectedRegionRadiusKm * 4, 120),
        );
      }

      if (basePoints.length === 0) {
        // Fallback de emergência caso a busca real falhe.
        basePoints = COLLECTION_POINTS;
      }

      const pointsByDistance = basePoints
        .map((point) => {
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
        .sort(
          (a, b) => a.distanceToSelectedRegionKm - b.distanceToSelectedRegionKm,
        );

      const pointsInRadius = pointsByDistance.filter(
        (point) => point.distanceToSelectedRegionKm <= selectedRegionRadiusKm,
      );

      if (pointsInRadius.length > 0) {
        setSelectedRegionPoints(pointsInRadius);
        setError("");
        return;
      }

      // Fallback for any selected area: always show nearest known points.
      setSelectedRegionPoints(pointsByDistance.slice(0, 6));
      setError(
        `Sem ecopontos encontrados em ${selectedRegionRadiusKm} km nesta área. Mostrando os mais próximos encontrados na busca.`,
      );
    },
    [selectedRegionRadiusKm, userCoords],
  );

  const syncNearbyPoints = useCallback(async () => {
    setIsSyncing(true);
    setError("");

    try {
      const savedPreference = await AsyncStorage.getItem(LOCATION_PREF_KEY);
      const isLocationEnabled = savedPreference !== "false";
      setLocationSharingEnabled(isLocationEnabled);

      if (!isLocationEnabled) {
        setPermissionGranted(false);
        setUserCoords(null);
        setRegion(DEFAULT_REGION);
        setSelectedCoords(null);
        setSelectedRegionPoints([]);
        setPointDetails(null);

        let genericBasePoints = await fetchRealCollectionPoints(
          DEFAULT_REGION.latitude,
          DEFAULT_REGION.longitude,
          120,
        );

        if (genericBasePoints.length === 0) {
          genericBasePoints = COLLECTION_POINTS;
        }

        const genericPoints = genericBasePoints
          .map((point) => ({
            ...point,
            distanceKm: calculateDistanceKm(
              DEFAULT_REGION.latitude,
              DEFAULT_REGION.longitude,
              point.latitude,
              point.longitude,
            ),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm);

        setNearbyPoints(genericPoints);
        return;
      }

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

      let basePoints = await fetchRealCollectionPoints(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        NEARBY_DISTANCE_KM,
      );

      if (basePoints.length === 0) {
        basePoints = await fetchRealCollectionPoints(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          160,
        );
      }

      if (basePoints.length === 0) {
        basePoints = COLLECTION_POINTS;
      }

      const pointsWithDistance = basePoints
        .map((point) => {
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
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const nearbyInRadius = pointsWithDistance.filter(
        (point) => point.distanceKm <= NEARBY_DISTANCE_KM,
      );

      if (nearbyInRadius.length > 0) {
        setNearbyPoints(nearbyInRadius);
      } else {
        // Fallback for cities without points inside the strict radius.
        setNearbyPoints(pointsWithDistance.slice(0, 6));
        setError(
          `Sem ecopontos em até ${NEARBY_DISTANCE_KM} km. Mostrando os mais próximos encontrados na busca.`,
        );
      }
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
      void loadPointsNearSelectedRegion(
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
    if (!locationSharingEnabled) {
      return "Localização desativada. Mostrando pontos de reciclagem genéricos.";
    }
    if (permissionGranted === null) {
      return "Solicitando permissão de localização...";
    }
    if (!permissionGranted) {
      return "Permita sua localização para mostrar ecopontos próximos.";
    }
    return "Mostrando ecopontos próximos da sua posição atual.";
  }, [locationSharingEnabled, permissionGranted]);

  const handleMapPress = useCallback(
    (latitude: number, longitude: number) => {
      setSelectedCoords({ latitude, longitude });
      loadPointsNearSelectedRegion(latitude, longitude);
      setPointDetails(null);
    },
    [loadPointsNearSelectedRegion],
  );

  const handlePointSelect = useCallback(
    (point: CollectionPoint) => {
      const distanceFromUserKm = userCoords
        ? calculateDistanceKm(
          userCoords.latitude,
          userCoords.longitude,
          point.latitude,
          point.longitude,
        )
        : null;

      const distanceToSelectedRegionKm = selectedCoords
        ? calculateDistanceKm(
          selectedCoords.latitude,
          selectedCoords.longitude,
          point.latitude,
          point.longitude,
        )
        : null;

      setPointDetails({
        id: point.id,
        name: point.name,
        address: point.address,
        latitude: point.latitude,
        longitude: point.longitude,
        distanceFromUserKm,
        distanceToSelectedRegionKm,
      });
    },
    [selectedCoords, userCoords],
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {permissionText}
      </Text>

      <MapView
        style={[styles.map, { borderColor: colors.panelAlt }]}
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
            pinColor={colors.accent}
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

        {(selectedCoords ? selectedRegionPoints : nearbyPoints).map((point) => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={point.name}
            description={point.address}
            onPress={() => handlePointSelect(point)}
            pinColor={selectedCoords ? "#2dd4bf" : undefined}
          />
        ))}
      </MapView>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={syncNearbyPoints}
          disabled={isSyncing}
          style={[styles.iconAction, isSyncing && { opacity: 0.7 }]}
        >
          {isSyncing ? (
            <ActivityIndicator
              color={darkModeEnabled ? "#02233d" : "#ffffff"}
              size="small"
            />
          ) : (
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={22}
              color={darkModeEnabled ? "#02233d" : "#ffffff"}
            />
          )}
        </TouchableOpacity>

        {selectedCoords ? (
          <TouchableOpacity
            onPress={handleClearSelection}
            style={[styles.iconAction, { backgroundColor: colors.accentDark }]}
          >
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={22}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={[styles.helpText, { color: colors.textSecondary }]}>
        Toque no mapa para buscar ecopontos reais de uma região específica.
      </Text>

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
                    ? colors.accentDark
                    : colors.panelAlt
                }
                textColor={colors.textPrimary}
                compact
                onPress={() => setSelectedRegionRadiusKm(radiusKm)}
              >
                {radiusKm} km
              </Button>
            ))}
          </View>
        </>
      ) : null}

      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}

      {pointDetails ? (
        <View
          style={[
            styles.detailsPanel,
            {
              backgroundColor: colors.detailsPanel,
              borderColor: colors.detailsPanelBorder,
            },
          ]}
        >
          <Text style={[styles.detailsTitle, { color: colors.heading }]}>
            {pointDetails.name}
          </Text>
          <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
            Endereço: {pointDetails.address}
          </Text>
          <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
            Coordenadas: {pointDetails.latitude.toFixed(4)},{" "}
            {pointDetails.longitude.toFixed(4)}
          </Text>
          {pointDetails.distanceFromUserKm !== null ? (
            <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
              Distância de você: {pointDetails.distanceFromUserKm.toFixed(1)} km
            </Text>
          ) : (
            <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
              Distância de você indisponível (permissão de localização negada).
            </Text>
          )}
          {pointDetails.distanceToSelectedRegionKm !== null ? (
            <Text
              style={[styles.detailsTextStrong, { color: colors.textPrimary }]}
            >
              Distância da região selecionada:{" "}
              {pointDetails.distanceToSelectedRegionKm.toFixed(1)} km
            </Text>
          ) : null}

          <Button
            mode="contained"
            buttonColor={colors.accent}
            textColor={darkModeEnabled ? "#02233d" : "#ffffff"}
            onPress={() => openRouteToPoint(pointDetails)}
          >
            Ver rota
          </Button>
        </View>
      ) : null}

      {permissionGranted && nearbyPoints.length === 0 && !isSyncing ? (
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          Nenhum ecoponto encontrado no raio de {NEARBY_DISTANCE_KM} km.
        </Text>
      ) : null}

      {!selectedCoords ? (
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Pontos próximos de você
        </Text>
      ) : null}

      {!selectedCoords &&
        nearbyPoints.map((point) => (
          <View
            key={point.id}
            style={[styles.pointCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.pointName, { color: colors.textPrimary }]}>
              {point.name}
            </Text>
            <Text
              style={[styles.pointAddress, { color: colors.textSecondary }]}
            >
              {point.address}
            </Text>
            <Text
              style={[
                styles.pointDistance,
                { color: colors.textSoft || colors.textPrimary },
              ]}
            >
              Distância: {point.distanceKm.toFixed(1)} km
            </Text>
            <Button
              mode="text"
              textColor={colors.accentTextStrong}
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Pontos na região selecionada
        </Text>
      ) : null}

      {selectedCoords && selectedRegionPoints.length === 0 ? (
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          Nenhum ecoponto encontrado no raio de {selectedRegionRadiusKm} km
          desta região.
        </Text>
      ) : null}

      {selectedRegionPoints.map((point) => (
        <View
          key={`selected-${point.id}`}
          style={[
            styles.pointCardAlt,
            {
              backgroundColor: colors.cardAlt,
              borderColor: colors.detailsPanelBorder,
            },
          ]}
        >
          <Text style={[styles.pointName, { color: colors.textPrimary }]}>
            {point.name}
          </Text>
          <Text style={[styles.pointAddress, { color: colors.textSecondary }]}>
            {point.address}
          </Text>
          <Text
            style={[
              styles.pointDistance,
              { color: colors.textSoft || colors.textPrimary },
            ]}
          >
            Distância da região clicada:{" "}
            {point.distanceToSelectedRegionKm.toFixed(1)} km
          </Text>
          <Text
            style={[
              styles.pointDistance,
              { color: colors.textSoft || colors.textPrimary },
            ]}
          >
            {point.distanceFromUserKm !== null
              ? `Distância de você: ${point.distanceFromUserKm.toFixed(1)} km`
              : "Distância de você indisponível (permissão de localização negada)."}
          </Text>
          <Button
            mode="text"
            textColor={colors.accentTextStrong}
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

      <View style={[styles.footerHintBox, { backgroundColor: colors.panel }]}>
        <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
          Dica: os pontos vêm de busca real online e podem variar por
          disponibilidade na região.
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
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  iconAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
