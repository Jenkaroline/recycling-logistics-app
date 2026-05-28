import { Alert } from "react-native";
import * as Location from "expo-location";
import { openCameraForRecycling } from "./cameraCapture";

export async function captureRecyclingEvidencePhoto(): Promise<string | null> {
  const asset = await openCameraForRecycling();
  if (!asset?.base64) {
    Alert.alert("Erro", "Não foi possível salvar a foto da evidência.");
    return null;
  }

  try {
    const contentType = asset.mimeType || "image/jpeg";
    return `data:${contentType};base64,${asset.base64}`;
  } catch {
    Alert.alert("Erro", "Não foi possível salvar a foto da evidência.");
    return null;
  }
}

export type RecyclingEvidenceLocation = {
  latitude: number;
  longitude: number;
  locationLabel: string;
};

export async function captureRecyclingEvidenceLocation(): Promise<RecyclingEvidenceLocation | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!permission.granted) {
      Alert.alert(
        "Permissão de localização",
        "Precisamos da sua localização para registrar o descarte em ecoponto.",
      );
      return null;
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const latitude = currentLocation.coords.latitude;
    const longitude = currentLocation.coords.longitude;
    let locationLabel = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = addresses[0];
      const parts = [
        address?.street,
        address?.name,
        address?.district,
        address?.city,
        address?.region,
      ].filter((part): part is string => Boolean(part && part.trim()));

      if (parts.length > 0) {
        locationLabel = parts.join(", ");
      }
    } catch {
      // Use coordinates as fallback.
    }

    return { latitude, longitude, locationLabel };
  } catch {
    Alert.alert("Erro", "Não foi possível obter sua localização atual.");
    return null;
  }
}