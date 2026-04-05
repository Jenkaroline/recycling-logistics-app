import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

type ThemePreferenceContextValue = {
  darkModeEnabled: boolean;
  setDarkModeEnabled: (enabled: boolean) => void;
};

const THEME_PREF_KEY = "@settings/darkModeEnabled";

const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [darkModeEnabled, setDarkModeEnabledState] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_PREF_KEY);
        if (!mounted || saved === null) return;
        setDarkModeEnabledState(saved === "true");
      } catch {
        // Keep default on read failure.
      }
    };

    void loadPreference();

    return () => {
      mounted = false;
    };
  }, []);

  const setDarkModeEnabled = (enabled: boolean) => {
    setDarkModeEnabledState(enabled);
    void AsyncStorage.setItem(THEME_PREF_KEY, String(enabled));
  };

  const value = useMemo(
    () => ({
      darkModeEnabled,
      setDarkModeEnabled,
    }),
    [darkModeEnabled],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error(
      "useThemePreference must be used within ThemePreferenceProvider",
    );
  }
  return context;
}
