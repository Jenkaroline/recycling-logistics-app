import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";
import { useRecyclingCompetition } from "./RecyclingCompetitionContext";

export type AppNotificationKind = "invitation" | "invitation-response" | "chat" | "evidence";

export type AppNotificationItem = {
  id: string;
  sourceId: string;
  kind: AppNotificationKind;
  groupId: string;
  groupName: string;
  title: string;
  description: string;
  actorName?: string;
  recipientUid?: string;
  ownerId?: string;
  status?: "pending" | "accepted" | "declined";
  timestamp: number;
  rawCreatedAt: string;
};

type ChatDoc = {
  groupId?: string;
  authorId?: string;
  authorName?: string;
  text?: string;
  createdAt?: string;
  createdAtClient?: string;
};

type EvidenceDoc = {
  groupId?: string;
  authorId?: string;
  authorName?: string;
  type?: string;
  notes?: string | null;
  createdAt?: string;
};

const MIN_VALID_TIMESTAMP = Date.UTC(2000, 0, 1);

function normalizeDateValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) || parsed.getTime() < MIN_VALID_TIMESTAMP ? null : parsed;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate();
    return parsed.getTime() < MIN_VALID_TIMESTAMP ? null : parsed;
  }

  return null;
}

function toTimestamp(value: unknown) {
  return normalizeDateValue(value)?.getTime() ?? Date.now();
}

function toIsoString(value: unknown) {
  return normalizeDateValue(value)?.toISOString() ?? new Date().toISOString();
}

function getSeenStorageKey(uid: string) {
  return `appNotificationsSeenAt:${uid}`;
}

const seenTimestampByUser = new Map<string, number>();
const seenListenersByUser = new Map<string, Set<(value: number) => void>>();

function readSeenTimestamp(uid: string) {
  return seenTimestampByUser.get(uid) || 0;
}

function writeSeenTimestamp(uid: string, value: number) {
  seenTimestampByUser.set(uid, value);
  const listeners = seenListenersByUser.get(uid);
  if (!listeners) return;

  listeners.forEach((listener) => listener(value));
}

function subscribeSeenTimestamp(uid: string, listener: (value: number) => void) {
  const listeners = seenListenersByUser.get(uid) || new Set<(value: number) => void>();
  listeners.add(listener);
  seenListenersByUser.set(uid, listeners);

  return () => {
    const currentListeners = seenListenersByUser.get(uid);
    if (!currentListeners) return;
    currentListeners.delete(listener);
    if (currentListeners.size === 0) {
      seenListenersByUser.delete(uid);
    }
  };
}

export function useAppNotifications() {
  const { groups, groupInvitations } = useRecyclingCompetition();
  const currentUid = auth.currentUser?.uid || null;
  const [chatByGroup, setChatByGroup] = useState<Record<string, AppNotificationItem[]>>({});
  const [evidenceByGroup, setEvidenceByGroup] = useState<Record<string, AppNotificationItem[]>>({});
  const [seenTimestamp, setSeenTimestamp] = useState(0);
  const seenTimestampRef = useRef(0);

  const relevantGroups = useMemo(() => {
    if (!currentUid) return [];
    return groups.filter((group) => group.ownerId === currentUid || group.members.some((member) => member.id === currentUid));
  }, [groups, currentUid]);

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    relevantGroups.forEach((group) => map.set(group.id, group.name));
    return map;
  }, [relevantGroups]);

  const groupIdsKey = useMemo(() => relevantGroups.map((group) => group.id).sort().join("|"), [relevantGroups]);

  useEffect(() => {
    let cancelled = false;

    if (!currentUid) {
      seenTimestampRef.current = 0;
      setSeenTimestamp(0);
      return;
    }

    const initialSeenTimestamp = readSeenTimestamp(currentUid);
    seenTimestampRef.current = initialSeenTimestamp;
    setSeenTimestamp(initialSeenTimestamp);

    const unsubscribeSeen = subscribeSeenTimestamp(currentUid, (value) => {
      seenTimestampRef.current = value;
      setSeenTimestamp(value);
    });

    const storageKey = getSeenStorageKey(currentUid);

    void AsyncStorage.getItem(storageKey)
      .then((storedValue) => {
        if (cancelled) return;

        const parsedValue = storedValue ? Number(storedValue) : 0;
        const nextValue = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;

        if (nextValue > seenTimestampRef.current) {
          writeSeenTimestamp(currentUid, nextValue);
        }
      })
      .catch((error) => {
        console.warn("[useAppNotifications] failed to load seen state:", error);
      });

    return () => {
      cancelled = true;
      unsubscribeSeen();
    };
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid || relevantGroups.length === 0) {
      setChatByGroup({});
      return;
    }

    const unsubscribers = relevantGroups.map((group) => {
      const messagesQuery = query(
        collection(db, "groupChatMessages", group.id, "messages"),
        orderBy("createdAt", "desc"),
        limit(30),
      );

      return onSnapshot(
        messagesQuery,
        (snapshot) => {
          const items = snapshot.docs
            .map((snap) => {
              const data = snap.data() as ChatDoc;
              if (data.authorId === currentUid) return null;

              const rawCreatedAt = toIsoString(data.createdAtClient || data.createdAt);
              const actorName = data.authorName || "Alguém";
              const title = `${group.name}: ${actorName} enviou uma mensagem`;
              return {
                id: `chat-${group.id}-${snap.id}`,
                sourceId: snap.id,
                kind: "chat" as const,
                groupId: group.id,
                groupName: groupNameById.get(group.id) || group.name,
                title,
                description: data.text ? data.text : "Nova mensagem no chat.",
                actorName: data.authorName || undefined,
                ownerId: undefined,
                recipientUid: undefined,
                status: undefined,
                timestamp: toTimestamp(data.createdAtClient || data.createdAt || rawCreatedAt),
                rawCreatedAt,
              } satisfies AppNotificationItem;
            })
            .filter((item): item is AppNotificationItem => item !== null);

          setChatByGroup((prev) => ({ ...prev, [group.id]: items }));
        },
        (error) => {
          if (error.code === "permission-denied") {
            setChatByGroup((prev) => ({ ...prev, [group.id]: [] }));
            return;
          }
          console.warn("[useAppNotifications] chat listener failed:", error);
        },
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUid, groupIdsKey, groupNameById, relevantGroups]);

  useEffect(() => {
    if (!currentUid || relevantGroups.length === 0) {
      setEvidenceByGroup({});
      return;
    }

    const unsubscribers = relevantGroups.map((group) => {
      const evidenceQuery = query(
        collection(db, "groupRecyclingActions", group.id, "entries"),
        orderBy("createdAt", "desc"),
        limit(30),
      );

      return onSnapshot(
        evidenceQuery,
        (snapshot) => {
          const items = snapshot.docs
            .map((snap) => {
              const data = snap.data() as EvidenceDoc;
              if (data.authorId === currentUid) return null;

              const rawCreatedAt = toIsoString(data.createdAt);
              return {
                id: `evidence-${group.id}-${snap.id}`,
                sourceId: snap.id,
                kind: "evidence" as const,
                groupId: group.id,
                groupName: groupNameById.get(group.id) || group.name,
                title: data.type || "Nova evidência",
                description: data.notes?.trim() || `${data.authorName || "Alguém"} adicionou uma nova evidência.`,
                actorName: data.authorName || undefined,
                ownerId: undefined,
                recipientUid: undefined,
                status: undefined,
                timestamp: toTimestamp(rawCreatedAt),
                rawCreatedAt,
              } satisfies AppNotificationItem;
            })
            .filter((item): item is AppNotificationItem => item !== null);

          setEvidenceByGroup((prev) => ({ ...prev, [group.id]: items }));
        },
        (error) => {
          if (error.code === "permission-denied") {
            setEvidenceByGroup((prev) => ({ ...prev, [group.id]: [] }));
            return;
          }
          console.warn("[useAppNotifications] evidence listener failed:", error);
        },
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUid, groupIdsKey, groupNameById, relevantGroups]);

  // listen for group notifications (contests / invalidations)
  useEffect(() => {
    if (!currentUid || relevantGroups.length === 0) {
      return;
    }

    const unsubscribers = relevantGroups.map((group) => {
      const notificationsQuery = query(
        collection(db, "groupNotifications", group.id, "items"),
        orderBy("createdAt", "desc"),
        limit(30),
      );

      return onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const items = snapshot.docs
            .map((snap) => {
              const data = snap.data() as any;
              // don't surface notifications generated by the current user
              if (data.actorId === currentUid) return null;

              const rawCreatedAt = toIsoString(data.createdAt);
              if (data.type === "contested") {
                const title = `${group.name}: Evidência contestada`;
                const description = `${data.actorName || "Alguém"} contestou evidência de ${data.entryAuthorName || "alguém"}${data.reason ? ` — ${data.reason}` : ""}`;
                return {
                  id: `gnotif-${group.id}-${snap.id}`,
                  sourceId: snap.id,
                  kind: "evidence" as const,
                  groupId: group.id,
                  groupName: groupNameById.get(group.id) || group.name,
                  title,
                  description,
                  actorName: data.actorName || undefined,
                  ownerId: undefined,
                  recipientUid: undefined,
                  status: undefined,
                  timestamp: toTimestamp(rawCreatedAt),
                  rawCreatedAt,
                } satisfies AppNotificationItem;
              }

              if (data.type === "invalidated") {
                const title = `${group.name}: Evidência invalidada`;
                const description = `A evidência de ${data.entryAuthorName || "alguém"} foi considerada inválida.`;
                return {
                  id: `gnotif-${group.id}-${snap.id}`,
                  sourceId: snap.id,
                  kind: "evidence" as const,
                  groupId: group.id,
                  groupName: groupNameById.get(group.id) || group.name,
                  title,
                  description,
                  actorName: data.actorName || undefined,
                  ownerId: undefined,
                  recipientUid: undefined,
                  status: undefined,
                  timestamp: toTimestamp(rawCreatedAt),
                  rawCreatedAt,
                } satisfies AppNotificationItem;
              }

              return null;
            })
            .filter((item): item is AppNotificationItem => item !== null);

          // replace group notifications for this group to avoid duplicates
          setEvidenceByGroup((prev) => ({ ...prev, [group.id]: items }));
        },
        (error) => {
          if (error.code === "permission-denied") {
            return;
          }
          console.warn("[useAppNotifications] group notifications listener failed:", error);
        },
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUid, groupIdsKey, groupNameById, relevantGroups]);

  const invitationNotifications = useMemo<AppNotificationItem[]>(() => {
    if (!currentUid) return [];

    return groupInvitations
      .filter((invite) => invite.recipientUid === currentUid || invite.ownerId === currentUid)
      .map((invite) => {
        const received = invite.recipientUid === currentUid;
        const timestamp = toTimestamp(received ? invite.createdAt : invite.updatedAt || invite.createdAt);
        const actorName = received ? invite.ownerName : invite.recipientName || invite.recipientEmail;
        const rawCreatedAt = toIsoString(received ? invite.createdAt : invite.updatedAt || invite.createdAt);

        return {
          id: `invite-${invite.id}`,
          sourceId: invite.id,
          kind: received && invite.status === "pending" ? "invitation" : "invitation-response",
          groupId: invite.groupId,
          groupName: invite.groupName,
          title: invite.groupName,
          description: received
            ? invite.status === "pending"
              ? `Convite de ${actorName} aguardando sua resposta.`
              : invite.status === "accepted"
                ? `Você aceitou o convite de ${actorName}.`
                : `Você recusou o convite de ${actorName}.`
            : invite.status === "accepted"
              ? `${actorName} aceitou o seu convite.`
              : `${actorName} recusou o seu convite.`,
          actorName,
          ownerId: invite.ownerId,
          recipientUid: invite.recipientUid,
          status: invite.status,
          timestamp,
          rawCreatedAt,
        } satisfies AppNotificationItem;
      })
      .filter((item) => item.status === "pending" || item.kind === "invitation-response");
  }, [groupInvitations, currentUid]);

  const chatNotifications = useMemo(() => Object.values(chatByGroup).flat(), [chatByGroup]);
  const evidenceNotifications = useMemo(() => Object.values(evidenceByGroup).flat(), [evidenceByGroup]);

  const notifications = useMemo(() => {
    return [...invitationNotifications, ...chatNotifications, ...evidenceNotifications].sort((a, b) => b.timestamp - a.timestamp);
  }, [invitationNotifications, chatNotifications, evidenceNotifications]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (notification.kind === "invitation" && notification.status === "pending") {
        return true;
      }

      return notification.timestamp > seenTimestamp;
    });
  }, [notifications, seenTimestamp]);

  const markNotificationsAsSeen = async () => {
    if (!currentUid) return;

    const storageKey = getSeenStorageKey(currentUid);
    const latestTimestamp = notifications.reduce((max, notification) => Math.max(max, notification.timestamp), 0);
    const nextSeenTimestamp = Math.max(seenTimestampRef.current, latestTimestamp + 1);

    writeSeenTimestamp(currentUid, nextSeenTimestamp);

    try {
      await AsyncStorage.setItem(storageKey, String(nextSeenTimestamp));
    } catch (error) {
      console.warn("[useAppNotifications] failed to persist seen state:", error);
    }
  };

  return {
    notifications,
    unreadNotifications,
    notificationCount: unreadNotifications.length,
    markNotificationsAsSeen,
  };
}