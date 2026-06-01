import { Alert } from "react-native";
import * as Location from "expo-location";
import { openCameraForRecycling } from "./cameraCapture";

function logEvidenceError(scope: string, step: string, error?: unknown) {
  if (error instanceof Error) {
    console.error(`[Evidence][${scope}] ${step}`, { message: error.message, stack: error.stack });
    return;
  }

  if (error !== undefined) {
    console.error(`[Evidence][${scope}] ${step}`, error);
    return;
  }

  console.error(`[Evidence][${scope}] ${step}`);
}

export async function captureRecyclingEvidencePhoto(scope = "evidência"): Promise<string | null> {
  try {
    const asset = await openCameraForRecycling();
    if (!asset) {
      logEvidenceError(scope, "camera_cancelled");
      return null;
    }

    if (!asset.base64) {
      logEvidenceError(scope, "camera_missing_base64", { uri: asset.uri, mimeType: asset.mimeType });
      Alert.alert(
        "Falha na câmera",
        `A câmera abriu, mas não gerou uma imagem válida para registrar ${scope}. Tente novamente.`,
      );
      return null;
    }

    const contentType = asset.mimeType || "image/jpeg";
    return `data:${contentType};base64,${asset.base64}`;
  } catch (error) {
    logEvidenceError(scope, "camera_exception", error);
    Alert.alert(
      "Falha na câmera",
      `Não foi possível capturar a foto para ${scope}. Verifique a permissão da câmera e tente novamente.`,
    );
    return null;
  }
}

export type RecyclingEvidenceLocation = {
  latitude: number;
  longitude: number;
  locationLabel: string;
};

export async function captureRecyclingEvidenceLocation(scope = "evidência"): Promise<RecyclingEvidenceLocation | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!permission.granted) {
      logEvidenceError(scope, "location_permission_denied");
      Alert.alert(
        "Permissão de localização",
        `Precisamos da sua localização para registrar ${scope}. Ative a permissão e tente novamente.`,
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
  } catch (error) {
    logEvidenceError(scope, "location_exception", error);
    Alert.alert(
      "Falha de localização",
      `Não foi possível obter sua localização para ${scope}. Tente novamente em um local com sinal melhor.`,
    );
    return null;
  }
}