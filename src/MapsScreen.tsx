import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../service/firebaseConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawerStatus } from "@react-navigation/drawer";
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
type PointDetails = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceFromUserKm: number | null;
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
const POINTS_CACHE_KEY = "@maps/nearbyPointsCache-v1";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_ENDPOINTS = [
  "https://nominatim.openstreetmap.org/reverse",
  "https://nominatim.openstreetmap.fr/reverse",
];
const MAX_REVERSE_GEOCODE_LOOKUPS = 24;

const DEFAULT_REGION: Region = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

// Use the same palette structure as `Records` screen to match aesthetics
// Softer accents and subtle backgrounds for a modern, friendly look
const COLORS = {
  background: "#061526",
  panel: "#0c2740",
  panelAlt: "#123252",
  detailsPanel: "#0f3556",
  detailsPanelBorder: "#0fd3b6",
  card: "#0c2740",
  cardAlt: "#0f3556",
  textPrimary: "#eaf4ff",
  textSecondary: "#b7cde6",
  textSoft: "#8aa6c0",
  heading: "#eaf4ff",
  recycleAccent: "#6fd6bf",
  accent: "#0fd3b6",
  accentSoft: "rgba(15, 211, 182, 0.12)",
  accentDark: "#0c9f80",
  accentTextStrong: "#8dd1ff",
  danger: "#ff8b94",
};

const LIGHT_COLORS = {
  background: "#f4f8fc",
  panel: "#ffffff",
  panelAlt: "#edf3f9",
  detailsPanel: "#ffffff",
  detailsPanelBorder: "#1f6fb2",
  card: "#ffffff",
  cardAlt: "#f2f8fe",
  textPrimary: "#1d3750",
  textSecondary: "#5d748b",
  textSoft: "#6b7f95",
  heading: "#1d3750",
  recycleAccent: "#7fd6bf",
  accent: "#1f6fb2",
  accentSoft: "rgba(31, 111, 178, 0.08)",
  accentDark: "#1a4f7a",
  accentTextStrong: "#1f6fb2",
  danger: "#b3314d",
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
    tags["addr:full"],
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:state"],
    tags["contact:street"],
    tags["contact:housenumber"],
    tags["contact:city"],
    tags["contact:state"],
    tags["description"],
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  const locality = [
    tags.neighbourhood,
    tags.suburb,
    tags.city,
    tags.town,
    tags.village,
    tags.state,
  ].filter(Boolean);

  if (locality.length > 0) {
    return `Próximo de ${locality.join(", ")}`;
  }

  return "Endereço não informado";
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
  hydrate: boolean = true,
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

  if (hydrate) {
    return hydrateMissingAddresses(ranked);
  }

  // return ranked immediately (without reverse geocoding) so callers can render faster
  return ranked;
}

export default function MapsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const { darkModeEnabled } = useThemePreference();
  const colors = darkModeEnabled ? COLORS : LIGHT_COLORS;
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSlowWait, setIsSlowWait] = useState(false);
  const [error, setError] = useState("");
  const [userCoords, setUserCoords] =
    useState<Location.LocationObjectCoords | null>(null);
  const [nearbyPoints, setNearbyPoints] = useState<PointWithDistance[]>([]);
  const [pointDetails, setPointDetails] = useState<PointDetails | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const scrollRef = useRef<ScrollView | null>(null);
  const [mapLayout, setMapLayout] = useState<{ y: number; height: number }>({ y: 0, height: 260 });
  const syncRequestIdRef = useRef(0);
  const lastStablePointsRef = useRef<PointWithDistance[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadCachedPoints = async () => {
      try {
        const raw = await AsyncStorage.getItem(POINTS_CACHE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as PointWithDistance[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cachedPoints = parsed.slice(0, 24);
          lastStablePointsRef.current = cachedPoints;
          setNearbyPoints(cachedPoints);
        }
      } catch {
        /* ignore cache errors */
      }
    };

    void loadCachedPoints();
  }, []);

  const syncNearbyPoints = useCallback(async () => {
    const requestId = ++syncRequestIdRef.current;
    const isLatestRequest = () => syncRequestIdRef.current === requestId;

    setIsSyncing(true);
    setIsSearching(true);
    setError("");

    try {
      const permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setPermissionGranted(false);

        setUserCoords(null);
        setRegion(DEFAULT_REGION);
        setPointDetails(null);

        let genericBasePoints = await fetchRealCollectionPoints(
          DEFAULT_REGION.latitude,
          DEFAULT_REGION.longitude,
          120,
          false,
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

        if (isLatestRequest()) {
          lastStablePointsRef.current = genericPoints;
          setNearbyPoints(genericPoints);
          setIsSearching(false);
        }
        if (isLatestRequest()) {
          setIsSyncing(false);
        }
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
        false,
      );

      if (basePoints.length === 0) {
        basePoints = await fetchRealCollectionPoints(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          160,
          false,
        );
      }

      if (basePoints.length === 0) {
        if (isLatestRequest()) {
          setError(`Sem ecopontos encontrados dentro de ${NEARBY_DISTANCE_KM} km da sua posição.`);
          setIsSearching(false);
          setIsSyncing(false);
        }
        return;
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

      // Prioritize points that already have a name and a proper address to show faster
      const prioritized = [
        ...pointsWithDistance.filter(
          (p) => p.name && p.name !== "Ponto de reciclagem" && p.address && p.address !== "Endereço não informado",
        ),
        ...pointsWithDistance.filter(
          (p) => !(p.name && p.name !== "Ponto de reciclagem" && p.address && p.address !== "Endereço não informado"),
        ),
      ];

      const nearbyInRadius = prioritized.filter((point) => point.distanceKm <= NEARBY_DISTANCE_KM);
      const nextPoints = nearbyInRadius.length > 0 ? nearbyInRadius : prioritized.slice(0, 6);

      if (isLatestRequest()) {
        lastStablePointsRef.current = nextPoints;
        setNearbyPoints(nextPoints);
        setIsSearching(false);
        setIsSyncing(false);
      }

      void AsyncStorage.setItem(
        POINTS_CACHE_KEY,
        JSON.stringify((nearbyInRadius.length > 0 ? nearbyInRadius : prioritized.slice(0, 24))),
      );

      // Hydrate missing addresses in background and update list when ready
      void (async () => {
        try {
          const hydrated = await hydrateMissingAddresses(basePoints);
          const hydratedWithDistance = hydrated
            .map((point) => ({
              ...point,
              distanceKm: calculateDistanceKm(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude,
                point.latitude,
                point.longitude,
              ),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);

          const updatedPrioritized = [
            ...hydratedWithDistance.filter(
              (p) => p.name && p.name !== "Ponto de reciclagem" && p.address && p.address !== "Endereço não informado",
            ),
            ...hydratedWithDistance.filter(
              (p) => !(p.name && p.name !== "Ponto de reciclagem" && p.address && p.address !== "Endereço não informado"),
            ),
          ];

          // If there are significant changes, update the state
          if (isLatestRequest()) {
            lastStablePointsRef.current = updatedPrioritized;
            setNearbyPoints(updatedPrioritized);
            setIsSearching(false);
            void AsyncStorage.setItem(
              POINTS_CACHE_KEY,
              JSON.stringify(updatedPrioritized.slice(0, 24)),
            );
          }
        } catch {
          /* ignore */
        }
      })();
    } catch {
      if (isLatestRequest()) {
        setError("Não foi possível obter sua localização agora.");
        setIsSearching(false);
      }
    } finally {
      // Always clear the syncing indicator when this invocation finishes.
      // We still guard state updates to avoid stale results, but the loader
      // should not remain spinning forever if a request completes.
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncNearbyPoints();
  }, [syncNearbyPoints]);

  // When the user logs in or registers, re-run the nearby search so loading
  // behavior happens immediately after authentication completes.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // slight delay to allow navigation/stack to settle
        setTimeout(() => void syncNearbyPoints(), 250);
      }
    });

    return () => unsub();
  }, [syncNearbyPoints]);

  useEffect(() => {
    let t: NodeJS.Timeout | number | null = null;
    if (isSearching) {
      // If the search takes longer than 1.5s, show a friendly patience hint
      t = setTimeout(() => setIsSlowWait(true), 1500);
    } else {
      setIsSlowWait(false);
    }

    return () => {
      if (t) clearTimeout(Number(t));
    };
  }, [isSearching]);

  const handleRefresh = useCallback(async () => {
    try {
      // Clear existing points immediately so the header shows the loading state
      // (spinner replaces the "Encontramos N pontos" phrase). We hide the
      // native RefreshControl spinner right away to avoid a stuck indicator at
      // the top of the ScrollView; the header spinner (`isSearching`) will
      // communicate progress in-place.
      setNearbyPoints([]);
      setIsSearching(true);
      // Ensure the RefreshControl spinner is not shown long-term
      setRefreshing(false);

      await syncNearbyPoints();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [syncNearbyPoints]);

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

      setPointDetails({
        id: point.id,
        name: point.name,
        address: point.address,
        latitude: point.latitude,
        longitude: point.longitude,
        distanceFromUserKm,
      });

      // Scroll the ScrollView to show the details panel below the map
      setTimeout(() => {
        try {
          const y = Math.max(0, mapLayout.y + mapLayout.height + 12);
          scrollRef.current?.scrollTo({ y, animated: true });
        } catch {
          // ignore
        }
      }, 250);
    },
    [userCoords, mapLayout],
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, zIndex: 40 }} pointerEvents="box-none">
        <View style={{ height: insets.top + 10 }} />
        <View style={{ height: 64 - insets.top - 10, paddingHorizontal: 12, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(drawerOpen ? DrawerActions.closeDrawer() : DrawerActions.openDrawer())}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.panel,
              borderWidth: 1,
              borderColor: colors.panelAlt,
            }}
          >
            <Ionicons name={drawerOpen ? "close" : "menu"} size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("Notificações")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.panel,
              borderWidth: 1,
              borderColor: colors.panelAlt,
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + 50 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
      <View
        style={{
          marginBottom: 20,
          backgroundColor: colors.panel,
          borderRadius: 28,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.panelAlt,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <View style={{ flex: 1, paddingTop: 2 }}>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: darkModeEnabled ? "rgba(54, 163, 255, 0.14)" : "rgba(31, 111, 178, 0.10)",
                borderWidth: 1,
                borderColor: darkModeEnabled ? "rgba(54, 163, 255, 0.32)" : "rgba(31, 111, 178, 0.18)",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: colors.recycleAccent, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                MAPA
              </Text>
            </View>


          <View style={styles.mapHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.recycleAccent }]}>Ecopontos <Text style={[{ color: colors.heading }]}>próximos de você</Text></Text>
              {nearbyPoints.length > 0 ? (
                <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 13 }]}>Encontramos {nearbyPoints.length} pontos de reciclagem próximos de você.</Text>
              ) : isSearching ? (
                <View>
                  <View style={styles.loadingInlineRow}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 13, marginBottom: 0, marginLeft: 8 }]}>Encontrando pontos de reciclagem...</Text>
                  </View>
                  {isSlowWait ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12, marginTop: 6 }]}>Isso pode demorar um pouco — obrigado pela paciência.</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 13 }]}>Nenhum ponto encontrado ainda.</Text>
              )}
            </View>
          </View>

        <MapView onLayout={(e) => setMapLayout({ y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height })} style={[styles.map, { borderColor: colors.panelAlt, marginBottom: 18 }]} region={region}>
        {userCoords ? (
          <Marker
            coordinate={{ latitude: userCoords.latitude, longitude: userCoords.longitude }}
            title="Sua localização"
            pinColor="#ff3b30"
          />
        ) : null}

        {nearbyPoints.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={point.name}
            description={point.address}
            onPress={() => handlePointSelect(point)}
            pinColor={pointDetails?.id === point.id ? colors.accent : "#27ae85"}
          />
        ))}
      </MapView>

            {pointDetails ? (
        <View
          style={[
            styles.detailsPanel,
            {
              backgroundColor: "transparent",
              borderColor: colors.detailsPanelBorder,
            },
          ]}
        >
          <Text style={[styles.detailsTitle, { color: colors.heading }]}>
            {pointDetails.name}
          </Text>
          <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
            Coordenadas: {pointDetails.latitude.toFixed(4)}, {pointDetails.longitude.toFixed(4)}
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

          <Button
            mode="contained"
            buttonColor={colors.accent}
            textColor={darkModeEnabled ? "#02233d" : "#ffffff"}
            onPress={() => openRouteToPoint(pointDetails)}
            style={{ marginBottom: 12 }}
          >
            Ver rota
          </Button>
        </View>
      ) : null}


          </View>
        </View>
      </View>

      </ScrollView>
    </View>
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
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  headerCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },

  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  loadingInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  countBadge: {
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 6,
    transform: [{ translateY: -6 }],
    elevation: 4,
  },

  markerCircle: {
    width: 30,
    height: 30,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  markerImage: {
    width: 28,
    height: 28,
    tintColor: undefined,
  },

  markerSelected: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 8,
    transform: [{ translateY: -8 }],
    borderWidth: 2,
    borderColor: COLORS.accent,
  },

  userMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  userMarkerInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
