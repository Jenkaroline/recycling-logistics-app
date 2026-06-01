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
  runTransaction,
  serverTimestamp,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";
import { recordAuditEvent } from "./auditLogger";

export type PlasticEntry = {
  id: string;
  amountGrams: number;
  createdAt: string;
  categoryName?: string;
  categoryIcon?: string;
  editCount?: number;
};

export type PlasticDayConfirmation = {
  dayKey: string;
  status: "zero";
  updatedAt?: string;
};

type PlasticConsumptionContextValue = {
  entries: PlasticEntry[];
  totalGrams: number;
  zeroConsumptionDays: Record<string, true>;
  addEntry: (
    amountGrams: number,
    category?: { name: string; icon?: string },
  ) => Promise<void>;
  goalGrams: number | null;
  setGoal: (g: number | null) => Promise<void>;
  confirmZeroConsumption: (dayKey: string) => Promise<void>;
  clearZeroConsumptionConfirmation: (dayKey: string) => Promise<void>;
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
    editCount: Number(entry.editCount || 0),
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
  const MAX_EDIT_COUNT = 3;
  const [entries, setEntries] = useState<PlasticEntry[]>([]);
  const [goalGrams, setGoalGrams] = useState<number | null>(null);
  const [zeroConsumptionDays, setZeroConsumptionDays] = useState<Record<string, true>>({});
  const currentUidRef = useRef<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    let unsubscribeEntries: (() => void) | null = null;
    let unsubscribeGoal: (() => void) | null = null;
    let unsubscribeZeroConsumptionDays: (() => void) | null = null;

    const bindForUid = (uid: string | null) => {
      if (unsubscribeEntries) {
        unsubscribeEntries();
        unsubscribeEntries = null;
      }
      if (unsubscribeGoal) {
        unsubscribeGoal();
        unsubscribeGoal = null;
      }
      if (unsubscribeZeroConsumptionDays) {
        unsubscribeZeroConsumptionDays();
        unsubscribeZeroConsumptionDays = null;
      }

      if (!uid) {
        setEntries([]);
        setGoalGrams(null);
        setZeroConsumptionDays({});
        return;
      }

      const entriesQuery = query(
        collection(db, "users", uid, "plasticConsumptionEntries"),
        orderBy("createdAt", "desc"),
      );
      unsubscribeEntries = onSnapshot(
        entriesQuery,
        (snapshot) => {
          setEntries(
            snapshot.docs.map((snap) =>
              normalizeEntry({
                id: snap.id,
                ...(snap.data() as Omit<PlasticEntry, "id">),
              }),
            ),
          );
        },
        (error) => {
          if (error.code === "permission-denied") {
            setEntries([]);
            return;
          }
          console.warn("Plastic entries listener failed:", error);
        },
      );

      const goalRef = doc(db, "users", uid, "plasticConsumptionMeta", "goal");
      unsubscribeGoal = onSnapshot(
        goalRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setGoalGrams(null);
            return;
          }

          const nextGoal = Number(snapshot.data().goalGrams);
          setGoalGrams(Number.isNaN(nextGoal) ? null : nextGoal);
        },
        (error) => {
          if (error.code === "permission-denied") {
            setGoalGrams(null);
            return;
          }
          console.warn("Plastic goal listener failed:", error);
        },
      );

      const zeroDaysQuery = query(collection(db, "users", uid, "plasticConsumptionZeroDays"), orderBy("dayKey", "desc"));
      unsubscribeZeroConsumptionDays = onSnapshot(
        zeroDaysQuery,
        (snapshot) => {
          const nextDays: Record<string, true> = {};
          snapshot.docs.forEach((snap) => {
            const data = snap.data() as Partial<PlasticDayConfirmation>;
            if (data.status === "zero") {
              nextDays[data.dayKey || snap.id] = true;
            }
          });
          setZeroConsumptionDays(nextDays);
        },
        (error) => {
          if (error.code === "permission-denied") {
            setZeroConsumptionDays({});
            return;
          }
          console.warn("Plastic zero-consumption listener failed:", error);
        },
      );
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
      if (unsubscribeZeroConsumptionDays) unsubscribeZeroConsumptionDays();
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

  const confirmZeroConsumption = async (dayKey: string) => {
    const uid = currentUidRef.current;
    if (!uid || !dayKey) return;

    await setDoc(
      doc(db, "users", uid, "plasticConsumptionZeroDays", dayKey),
      {
        dayKey,
        status: "zero",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    void recordAuditEvent({
      eventType: "create",
      resourceType: "plastic_consumption",
      resourceId: dayKey,
      payload: { status: "zero" },
    });
  };

  const clearZeroConsumptionConfirmation = async (dayKey: string) => {
    const uid = currentUidRef.current;
    if (!uid || !dayKey) return;

    await deleteDoc(doc(db, "users", uid, "plasticConsumptionZeroDays", dayKey));
    void recordAuditEvent({
      eventType: "delete",
      resourceType: "plastic_consumption",
      resourceId: dayKey,
      payload: { status: "zero" },
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
      editCount: 0,
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

    const entryRef = doc(db, "users", uid, "plasticConsumptionEntries", id);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(entryRef);
      if (!snapshot.exists()) {
        throw new Error("not-found");
      }

      const currentEditCount = Number(snapshot.data().editCount || 0);
      if (currentEditCount >= MAX_EDIT_COUNT) {
        const error = new Error("edit-limit-reached");
        (error as any).code = "edit-limit-reached";
        throw error;
      }

      transaction.update(entryRef, {
        amountGrams: Number(payload.amountGrams.toFixed(2)),
        categoryName: payload.categoryName || null,
        editCount: currentEditCount + 1,
        updatedAt: serverTimestamp(),
      });
    });
    void recordAuditEvent({
      eventType: "update",
      resourceType: "plastic_consumption",
      resourceId: id,
      payload: {
        amountGrams: Number(payload.amountGrams.toFixed(2)),
        categoryName: payload.categoryName || null,
        editCount: 1,
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
      value={{
        entries,
        totalGrams,
        zeroConsumptionDays,
        goalGrams,
        setGoal: persistGoal,
        confirmZeroConsumption,
        clearZeroConsumptionConfirmation,
        addEntry,
        updateEntry,
        deleteEntry,
      }}
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
