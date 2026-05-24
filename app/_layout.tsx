import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Slot, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import * as Linking from "expo-linking";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url || "");
        const oobCode = (parsed.queryParams as any)?.oobCode;
        // If we have an oobCode, navigate to the confirm screen with it
        if (oobCode) {
          router.push(`/auth/resetPasswordConfirm?oobCode=${encodeURIComponent(oobCode)}`);
        } else if (parsed.path && parsed.path.startsWith("reset")) {
          router.push("/auth/resetPasswordConfirm");
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    // handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const subscription = Linking.addEventListener("url", handleUrl);
    return () => subscription.remove();
  }, [router]);

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
