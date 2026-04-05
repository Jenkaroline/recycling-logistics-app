import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
  useRef,
    useState,
} from "react";

const STORAGE_KEY = "plastic-consumption-entries-v1";

export type PlasticEntry = {
  id: string;
  amountGrams: number;
  createdAt: string;
  categoryName?: string;
  categoryIcon?: string;
};

type PlasticConsumptionContextValue = {
  entries: PlasticEntry[];
  totalGrams: number;
  addEntry: (
    amountGrams: number,
    category?: { name: string; icon?: string },
  ) => Promise<void>;
  updateEntry: (
    id: string,
    payload: { amountGrams: number; categoryName?: string },
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
};

const PlasticConsumptionContext =
  createContext<PlasticConsumptionContextValue | null>(null);

export function PlasticConsumptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [entries, setEntries] = useState<PlasticEntry[]>([]);
  const entriesRef = useRef<PlasticEntry[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

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
    entriesRef.current = nextEntries;
    setEntries(nextEntries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  };

  const addEntry = async (
    amountGrams: number,
    category?: { name: string; icon?: string },
  ) => {
    const currentEntries = entriesRef.current;
    const next: PlasticEntry[] = [
      {
        id: `${Date.now()}`,
        amountGrams: Number(amountGrams.toFixed(2)),
        createdAt: new Date().toISOString(),
        categoryName: category?.name,
        categoryIcon: category?.icon,
      },
      ...currentEntries,
    ];
    await persist(next);
  };

  const updateEntry = async (
    id: string,
    payload: { amountGrams: number; categoryName?: string },
  ) => {
    const currentEntries = entriesRef.current;
    const next = currentEntries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            amountGrams: Number(payload.amountGrams.toFixed(2)),
            categoryName: payload.categoryName,
          }
        : entry,
    );
    await persist(next);
  };

  const deleteEntry = async (id: string) => {
    const currentEntries = entriesRef.current;
    const next = currentEntries.filter((entry) => entry.id !== id);
    await persist(next);
  };

  const totalGrams = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.amountGrams, 0),
    [entries],
  );

  return (
    <PlasticConsumptionContext.Provider
      value={{ entries, totalGrams, addEntry, updateEntry, deleteEntry }}
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
