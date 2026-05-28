import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export async function openCameraForRecycling(): Promise<ImagePicker.ImagePickerAsset | null> {
  const currentPermission = await ImagePicker.getCameraPermissionsAsync();
  const permission = currentPermission.granted
    ? currentPermission
    : await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Permissão da câmera",
      "Permita o acesso à câmera para registrar a reciclagem em grupo.",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.25,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return result.assets[0];
}