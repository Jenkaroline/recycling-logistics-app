import { Alert } from "react-native";
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