import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
  useRef,
    useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../service/firebaseConfig";

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
  const currentUidRef = useRef<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    const loadEntriesForUid = async (uid: string | null) => {
      const perKey = uid ? `${STORAGE_KEY}-${uid}` : STORAGE_KEY;
      try {
        const rawPer = await AsyncStorage.getItem(perKey);
        if (rawPer) {
          setEntries(JSON.parse(rawPer) as PlasticEntry[]);
          return;
        }

        // Do NOT auto-migrate global/device entries into a newly created user account.
        // If there's no per-user data, start with an empty history for this account.
        setEntries([]);
      } catch {
        setEntries([]);
      }
    };

    // initial load
    void loadEntriesForUid(auth.currentUser?.uid || null);

    // listen for auth changes and reload accordingly
    const unsub = onAuthStateChanged(auth, (u) => {
      currentUidRef.current = u?.uid || null;
      void loadEntriesForUid(u?.uid || null);
    });

    return () => {
      unsub();
    };
  }, []);

  const persist = async (nextEntries: PlasticEntry[]) => {
    entriesRef.current = nextEntries;
    setEntries(nextEntries);
    const uid = currentUidRef.current;
    const perKey = uid ? `${STORAGE_KEY}-${uid}` : STORAGE_KEY;
    await AsyncStorage.setItem(perKey, JSON.stringify(nextEntries));
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
