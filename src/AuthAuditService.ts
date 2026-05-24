import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { db } from "../service/firebaseConfig";

export interface AuthAuditEvent {
  category: "authentication";
  type: "login";
  status: "success" | "failure";
  method: string;
  email?: string | null;
  timestamp: any;
  device: {
    platform: string;
    version: string | number;
    model: string;
    appName: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null;
}

const getDeviceInfo = () => {
  const platform = Platform.OS;
  const version = Platform.Version;
  const model =
    Constants.deviceName ||
    Constants.platform?.ios?.model ||
    Constants.platform?.android?.model ||
    Constants.platform?.web?.userAgent ||
    "Unknown";
  const appName =
    (Constants.manifest as any)?.name ||
    (Constants.expoConfig as any)?.name ||
    "App";

  return {
    platform,
    version,
    model,
    appName,
  };
};

const getLocationData = async () => {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    };
  } catch (error) {
    console.warn("AuthAuditService: erro ao capturar localização", error);
    return null;
  }
};

export const logSuccessfulLogin = async (
  userId: string,
  email: string | null,
  method: string,
) => {
  try {
    const location = await getLocationData();
    const device = getDeviceInfo();

    const event: AuthAuditEvent = {
      category: "authentication",
      type: "login",
      status: "success",
      method,
      email,
      timestamp: serverTimestamp(),
      device,
      location,
    };

    await addDoc(collection(db, "users", userId, "authEvents"), event);
  } catch (error) {
    console.warn("AuthAuditService: erro ao gravar evento de auditoria", error);
  }
};
