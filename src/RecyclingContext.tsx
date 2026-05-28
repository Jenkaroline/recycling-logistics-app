import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";
import { recordAuditEvent } from "./auditLogger";

const MAX_EDIT_COUNT = 3;

type RecyclingAction = {
  id: string;
  type: string;
  typeId?: string;
  groupId?: string | null;
  authorId?: string;
  authorName?: string;
  xpEarned?: number;
  notes?: string;
  photoUrl?: string | null;
  contestCount?: number;
  contestPenaltyApplied?: boolean;
  contestPenaltyAppliedAt?: string | null;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  editCount?: number;
};

type AddActionInput =
  | string
  | {
      type: string;
      typeId?: string;
      groupId?: string | null;
      authorId?: string;
      authorName?: string;
      xpEarned?: number;
      notes?: string;
      photoUrl?: string | null;
      contestCount?: number;
      contestPenaltyApplied?: boolean;
      contestPenaltyAppliedAt?: string | null;
      locationLabel?: string | null;
      latitude?: number | null;
      longitude?: number | null;
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
    editCount: Number(entry.editCount || 0),
    createdAt:
      typeof createdAt === "string"
        ? createdAt
        : hasToDate
          ? (createdAt as { toDate: () => Date }).toDate().toISOString()
          : new Date().toISOString(),
      contestCount: Number(entry.contestCount || 0),
      contestPenaltyApplied: Boolean(entry.contestPenaltyApplied),
      contestPenaltyAppliedAt:
        typeof entry.contestPenaltyAppliedAt === "string"
          ? entry.contestPenaltyAppliedAt
          : null,
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

      unsubscribe = onSnapshot(
        actionsQuery,
        (snapshot) => {
          setEntries(
            snapshot.docs.map((snap) =>
              normalizeAction({
                id: snap.id,
                ...(snap.data() as Omit<RecyclingAction, "id">),
              }),
            ),
          );
        },
        (error) => {
          if (error.code === "permission-denied") {
            setEntries([]);
            return;
          }
          console.warn("Recycling actions listener failed:", error);
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
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const addAction = async (input: AddActionInput, notes?: string) => {
    const payload = typeof input === "string" ? { type: input, notes } : input;
    const actionId = `${Date.now()}`;
    const uid = currentUidRef.current;
    if (!uid) return;

    const userActionRef = doc(collection(db, "users", uid, "recyclingActions"));
    const basePayload = {
      type: payload.type,
      typeId: payload.typeId || null,
      groupId: payload.groupId ?? null,
      authorId: payload.authorId || uid,
      authorName: payload.authorName || null,
      xpEarned: Number(payload.xpEarned || 0),
      notes: payload.notes || null,
      photoUrl: payload.photoUrl || null,
      contestCount: Number(payload.contestCount || 0),
      contestPenaltyApplied: Boolean(payload.contestPenaltyApplied),
      contestPenaltyAppliedAt: payload.contestPenaltyAppliedAt || null,
      locationLabel: payload.locationLabel || null,
      latitude: typeof payload.latitude === "number" ? payload.latitude : null,
      longitude: typeof payload.longitude === "number" ? payload.longitude : null,
      editCount: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(userActionRef, basePayload);

    if (payload.groupId) {
      await setDoc(doc(collection(db, "groupRecyclingActions", payload.groupId, "entries")), basePayload);
    }

    void recordAuditEvent({
      eventType: "create",
      resourceType: "recycling_action",
      resourceId: userActionRef.id,
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

    const actionRef = doc(db, "users", uid, "recyclingActions", id);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(actionRef);
      if (!snapshot.exists()) {
        throw new Error("not-found");
      }

      const currentEditCount = Number(snapshot.data().editCount || 0);
      if (currentEditCount >= MAX_EDIT_COUNT) {
        const error = new Error("edit-limit-reached");
        (error as any).code = "edit-limit-reached";
        throw error;
      }

      transaction.update(actionRef, {
        type: payload.type,
        notes: payload.notes || null,
        editCount: currentEditCount + 1,
        updatedAt: serverTimestamp(),
      });
    });
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_action",
      resourceId: id,
      payload: { type: payload.type, notes: payload.notes || null, editCount: 1 },
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
