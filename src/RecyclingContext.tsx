import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";
import { recordAuditEvent } from "./auditLogger";

type RecyclingAction = {
  id: string;
  type: string;
  typeId?: string;
  groupId?: string | null;
  authorName?: string;
  xpEarned?: number;
  notes?: string;
  createdAt: string;
};

type AddActionInput =
  | string
  | {
      type: string;
      typeId?: string;
      groupId?: string | null;
      authorName?: string;
      xpEarned?: number;
      notes?: string;
    };

type RecyclingContextValue = {
  entries: RecyclingAction[];
  addAction: (input: AddActionInput, notes?: string) => Promise<void>;
  updateAction: (id: string, payload: { type: string; notes?: string }) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
};

const RecyclingContext = createContext<RecyclingContextValue | null>(null);

function normalizeAction(entry: RecyclingAction & { createdAt?: unknown }): RecyclingAction {
  const createdAt = entry.createdAt;
  const hasToDate =
    typeof createdAt === "object" &&
    createdAt !== null &&
    "toDate" in createdAt &&
    typeof (createdAt as { toDate?: unknown }).toDate === "function";

  return {
    ...entry,
    xpEarned: Number(entry.xpEarned || 0),
    createdAt:
      typeof createdAt === "string"
        ? createdAt
        : hasToDate
          ? (createdAt as { toDate: () => Date }).toDate().toISOString()
          : new Date().toISOString(),
  };
}

export function RecyclingProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<RecyclingAction[]>([]);
  const currentUidRef = useRef<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const bindForUid = (uid: string | null) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (!uid) {
        setEntries([]);
        return;
      }

      const actionsQuery = query(
        collection(db, "users", uid, "recyclingActions"),
        orderBy("createdAt", "desc"),
      );

      unsubscribe = onSnapshot(actionsQuery, (snapshot) => {
        setEntries(
          snapshot.docs.map((snap) =>
            normalizeAction({
              id: snap.id,
              ...(snap.data() as Omit<RecyclingAction, "id">),
            }),
          ),
        );
      });
    };

    bindForUid(auth.currentUser?.uid || null);
    const unsub = onAuthStateChanged(auth, (u) => {
      currentUidRef.current = u?.uid || null;
      bindForUid(u?.uid || null);
    });
    return () => {
      unsub();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const addAction = async (input: AddActionInput, notes?: string) => {
    const payload = typeof input === "string" ? { type: input, notes } : input;
    const actionId = `${Date.now()}`;
    const uid = currentUidRef.current;
    if (!uid) return;

    await addDoc(collection(db, "users", uid, "recyclingActions"), {
      type: payload.type,
      typeId: payload.typeId || null,
      groupId: payload.groupId ?? null,
      authorName: payload.authorName || null,
      xpEarned: Number(payload.xpEarned || 0),
      notes: payload.notes || null,
      createdAt: serverTimestamp(),
    });
    void recordAuditEvent({
      eventType: "create",
      resourceType: "recycling_action",
      resourceId: actionId,
      payload: {
        type: payload.type,
        typeId: payload.typeId || null,
        groupId: payload.groupId ?? null,
        xpEarned: Number(payload.xpEarned || 0),
      },
    });
  };

  const updateAction = async (id: string, payload: { type: string; notes?: string }) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await updateDoc(doc(db, "users", uid, "recyclingActions", id), {
      type: payload.type,
      notes: payload.notes || null,
    });
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_action",
      resourceId: id,
      payload: { type: payload.type, notes: payload.notes || null },
    });
  };

  const deleteAction = async (id: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await deleteDoc(doc(db, "users", uid, "recyclingActions", id));
    void recordAuditEvent({
      eventType: "delete",
      resourceType: "recycling_action",
      resourceId: id,
    });
  };

  return (
    <RecyclingContext.Provider value={{ entries, addAction, updateAction, deleteAction }}>
      {children}
    </RecyclingContext.Provider>
  );
}

export function useRecycling() {
  const ctx = useContext(RecyclingContext);
  if (!ctx) throw new Error("useRecycling must be used within RecyclingProvider");
  return ctx;
}
