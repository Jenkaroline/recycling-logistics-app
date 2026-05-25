import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
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

  useEffect(() => {
    const handler = (ev: any) => {
      const reason = ev?.reason || ev;
      const code = reason?.code || (typeof reason?.message === "string" && reason.message.includes("permission-denied") ? "permission-denied" : undefined);
      if (code === "permission-denied") {
        console.warn("[Global] suppressed unhandledrejection - Firestore permission-denied", reason);
        try {
          if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        } catch {}
      }
    };

    if (typeof globalThis?.addEventListener === "function") {
      globalThis.addEventListener("unhandledrejection", handler as EventListener);
      return () => globalThis.removeEventListener("unhandledrejection", handler as EventListener);
    }

    // Node-like fallback
    if ((global as any)?.process && typeof (global as any).process.on === "function") {
      (global as any).process.on("unhandledRejection", handler);
      return () => (global as any).process.off("unhandledRejection", handler);
    }
  }, []);

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
