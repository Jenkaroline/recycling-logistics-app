import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "plastic-consumption-entries-v1";

export type PlasticEntry = {
  id: string;
  amountGrams: number;
  createdAt: string;
};

type PlasticConsumptionContextValue = {
  entries: PlasticEntry[];
  totalGrams: number;
  addEntry: (amountGrams: number) => Promise<void>;
};

const PlasticConsumptionContext =
  createContext<PlasticConsumptionContextValue | null>(null);

export function PlasticConsumptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [entries, setEntries] = useState<PlasticEntry[]>([]);

  useEffect(() => {
    const loadEntries = async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as PlasticEntry[];
        setEntries(parsed);
      } catch {
        setEntries([]);
      }
    };

    void loadEntries();
  }, []);

  const persist = async (nextEntries: PlasticEntry[]) => {
    setEntries(nextEntries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  };

  const addEntry = async (amountGrams: number) => {
    const next: PlasticEntry[] = [
      {
        id: `${Date.now()}`,
        amountGrams: Number(amountGrams.toFixed(2)),
        createdAt: new Date().toISOString(),
      },
      ...entries,
    ];
    await persist(next);
  };

  const totalGrams = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.amountGrams, 0),
    [entries],
  );

  return (
    <PlasticConsumptionContext.Provider
      value={{ entries, totalGrams, addEntry }}
    >
      {children}
    </PlasticConsumptionContext.Provider>
  );
}

export function usePlasticConsumption() {
  const context = useContext(PlasticConsumptionContext);
  if (!context) {
    throw new Error(
      "usePlasticConsumption deve ser usado dentro do PlasticConsumptionProvider",
    );
  }
  return context;
}
