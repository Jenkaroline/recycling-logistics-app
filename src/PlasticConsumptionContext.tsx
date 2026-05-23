import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
  useRef,
    useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";
import { recordAuditEvent } from "./auditLogger";

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
  goalGrams: number | null;
  setGoal: (g: number | null) => Promise<void>;
  updateEntry: (
    id: string,
    payload: { amountGrams: number; categoryName?: string },
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
};

const PlasticConsumptionContext =
  createContext<PlasticConsumptionContextValue | null>(null);

function normalizeEntry(entry: PlasticEntry & { createdAt?: unknown }): PlasticEntry {
  const createdAt = entry.createdAt;

  return {
    ...entry,
    amountGrams: Number(entry.amountGrams || 0),
    createdAt:
      typeof createdAt === "string"
        ? createdAt
        : createdAt instanceof Timestamp
          ? createdAt.toDate().toISOString()
          : new Date().toISOString(),
  };
}

export function PlasticConsumptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [entries, setEntries] = useState<PlasticEntry[]>([]);
  const [goalGrams, setGoalGrams] = useState<number | null>(null);
  const currentUidRef = useRef<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    let unsubscribeEntries: (() => void) | null = null;
    let unsubscribeGoal: (() => void) | null = null;

    const bindForUid = (uid: string | null) => {
      if (unsubscribeEntries) {
        unsubscribeEntries();
        unsubscribeEntries = null;
      }
      if (unsubscribeGoal) {
        unsubscribeGoal();
        unsubscribeGoal = null;
      }

      if (!uid) {
        setEntries([]);
        setGoalGrams(null);
        return;
      }

      const entriesQuery = query(
        collection(db, "users", uid, "plasticConsumptionEntries"),
        orderBy("createdAt", "desc"),
      );
      unsubscribeEntries = onSnapshot(entriesQuery, (snapshot) => {
        setEntries(
          snapshot.docs.map((snap) =>
            normalizeEntry({
              id: snap.id,
              ...(snap.data() as Omit<PlasticEntry, "id">),
            }),
          ),
        );
      });

      const goalRef = doc(db, "users", uid, "plasticConsumptionMeta", "goal");
      unsubscribeGoal = onSnapshot(goalRef, (snapshot) => {
        if (!snapshot.exists()) {
          setGoalGrams(null);
          return;
        }

        const nextGoal = Number(snapshot.data().goalGrams);
        setGoalGrams(Number.isNaN(nextGoal) ? null : nextGoal);
      });
    };

    bindForUid(auth.currentUser?.uid || null);
    const unsub = onAuthStateChanged(auth, (u) => {
      currentUidRef.current = u?.uid || null;
      bindForUid(u?.uid || null);
    });

    return () => {
      unsub();
      if (unsubscribeEntries) unsubscribeEntries();
      if (unsubscribeGoal) unsubscribeGoal();
    };
  }, []);

  const persistGoal = async (g: number | null) => {
    setGoalGrams(g);
    const uid = currentUidRef.current;
    if (!uid) return;

    const goalRef = doc(db, "users", uid, "plasticConsumptionMeta", "goal");
    if (g === null) {
      await deleteDoc(goalRef);
    } else {
      await setDoc(
        goalRef,
        {
          goalGrams: g,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    void recordAuditEvent({
      eventType: "goal_set",
      resourceType: "plastic_consumption",
      resourceId: uid || null,
      payload: { goalGrams: g },
    });
  };

  const addEntry = async (
    amountGrams: number,
    category?: { name: string; icon?: string },
  ) => {
    const entryId = `${Date.now()}`;
    const uid = currentUidRef.current;
    if (!uid) return;

    await setDoc(doc(db, "users", uid, "plasticConsumptionEntries", entryId), {
      amountGrams: Number(amountGrams.toFixed(2)),
      createdAt: serverTimestamp(),
      categoryName: category?.name || null,
      categoryIcon: category?.icon || null,
    });
    void recordAuditEvent({
      eventType: "create",
      resourceType: "plastic_consumption",
      resourceId: entryId,
      payload: {
        amountGrams: Number(amountGrams.toFixed(2)),
        categoryName: category?.name || null,
      },
    });
  };

  const updateEntry = async (
    id: string,
    payload: { amountGrams: number; categoryName?: string },
  ) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await updateDoc(doc(db, "users", uid, "plasticConsumptionEntries", id), {
      amountGrams: Number(payload.amountGrams.toFixed(2)),
      categoryName: payload.categoryName || null,
    });
    void recordAuditEvent({
      eventType: "update",
      resourceType: "plastic_consumption",
      resourceId: id,
      payload: {
        amountGrams: Number(payload.amountGrams.toFixed(2)),
        categoryName: payload.categoryName || null,
      },
    });
  };

  const deleteEntry = async (id: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await deleteDoc(doc(db, "users", uid, "plasticConsumptionEntries", id));
    void recordAuditEvent({
      eventType: "delete",
      resourceType: "plastic_consumption",
      resourceId: id,
    });
  };

  const totalGrams = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.amountGrams, 0),
    [entries],
  );

  return (
    <PlasticConsumptionContext.Provider
      value={{ entries, totalGrams, goalGrams, setGoal: persistGoal, addEntry, updateEntry, deleteEntry }}
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
