import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  serverTimestamp,
  Timestamp,
  updateDoc,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";
import { recordAuditEvent } from "./auditLogger";
import { useSocial } from "./SocialContext";

type GroupChatMessage = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  createdAtClient?: string;
};

type CompetitionMember = {
  id: string;
  name: string;
  totalXp: number;
  actionsCount: number;
  isOwner: boolean;
};

type CompetitionGroup = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  durationDays?: number;
  challengeEndsAt?: string | null;
  createdAt: string;
  ownerId: string;
  isActive: boolean;
  members: CompetitionMember[];
  totalXp: number;
  totalActions: number;
  removedMemberIds?: string[];
};

type GroupInvitationStatus = "pending" | "accepted" | "declined";

type GroupInvitation = {
  id: string;
  groupId: string;
  groupName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  recipientUid: string;
  recipientEmail: string;
  recipientName: string;
  membersSnapshot: CompetitionMember[];
  groupCreatedAt: string;
  status: GroupInvitationStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
};

type RecyclingCompetitionContextValue = {
  groups: CompetitionGroup[];
  activeGroupId: string | null;
  activeGroup: CompetitionGroup | null;
  rankedMembers: CompetitionMember[];
  chatMessages: GroupChatMessage[];
  providerId?: string;
  groupInvitations: GroupInvitation[];
  createGroup: (input: {
    name: string;
    description?: string;
    durationDays?: number;
    imageUrl?: string;
  }) => Promise<void>;
  updateGroupDetails: (groupId: string, input: {
    name?: string;
    description?: string;
    imageUrl?: string;
  }) => Promise<void>;
  setActiveGroup: (groupId: string | null) => Promise<void>;
  activateGroup: (groupId: string) => Promise<void>;
  deactivateGroup: (groupId: string) => Promise<void>;
  updateGroupName: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  sendGroupInvitation: (email: string) => Promise<{
    persisted: boolean;
    recipientFound: boolean;
    delivered: boolean;
    inviteId: string;
    recipientEmail: string;
  }>;
  acceptGroupInvitation: (invitationId: string) => Promise<void>;
  declineGroupInvitation: (invitationId: string) => Promise<void>;
  removeMemberFromActiveGroup: (memberId: string) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  awardXpToActiveGroup: (xp: number) => Promise<void>;
  adjustGroupXp: (groupId: string, xpDelta: number) => Promise<void>;
  addChatMessage: (text: string) => Promise<void>;
  recomputeGroupTotals: (groupId: string) => Promise<void>;
};

const RecyclingCompetitionContext = createContext<RecyclingCompetitionContextValue | null>(null);

function hasToDate(value: unknown): value is { toDate: () => Date } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}

const MIN_VALID_TIMESTAMP = Date.UTC(2000, 0, 1);

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() >= MIN_VALID_TIMESTAMP) {
      return parsed.toISOString();
    }
  }
  if (value instanceof Timestamp) {
    const parsed = value.toDate();
    if (parsed.getTime() >= MIN_VALID_TIMESTAMP) {
      return parsed.toISOString();
    }
  }
  if (hasToDate(value)) {
    const parsed = value.toDate();
    if (parsed.getTime() >= MIN_VALID_TIMESTAMP) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeGroup(group: CompetitionGroup & { createdAt?: unknown }): CompetitionGroup {
  return {
    ...group,
    createdAt: normalizeTimestamp(group.createdAt),
    ownerId: group.ownerId || group.members.find((member) => member.isOwner)?.id || "local-user",
    isActive: typeof group.isActive === "boolean" ? group.isActive : true,
    description: typeof group.description === "string" ? group.description : "",
    imageUrl: typeof group.imageUrl === "string" ? group.imageUrl : "",
    durationDays: Number(group.durationDays || 0) || undefined,
    challengeEndsAt: group.challengeEndsAt ? normalizeTimestamp(group.challengeEndsAt) : null,
    totalXp: Number(group.totalXp || 0),
    totalActions: Number(group.totalActions || 0),
    removedMemberIds: Array.isArray(group.removedMemberIds)
      ? Array.from(new Set(group.removedMemberIds.filter((memberId): memberId is string => typeof memberId === "string" && memberId.trim())))
      : [],
    members: Array.isArray(group.members)
      ? group.members.map((member) => ({
          ...member,
          totalXp: Number(member.totalXp || 0),
          actionsCount: Number(member.actionsCount || 0),
          isOwner: Boolean(member.isOwner),
        }))
      : [],
  };
}

function normalizeChatMessage(message: GroupChatMessage & { createdAt?: unknown; createdAtClient?: unknown }): GroupChatMessage {
  return {
    ...message,
    createdAt: normalizeTimestamp(message.createdAtClient || message.createdAt),
    createdAtClient: message.createdAtClient ? normalizeTimestamp(message.createdAtClient) : undefined,
  };
}

function normalizeInvitation(invitation: GroupInvitation & { createdAt?: unknown; updatedAt?: unknown; respondedAt?: unknown }): GroupInvitation {
  return {
    ...invitation,
    createdAt: normalizeTimestamp(invitation.createdAt),
    updatedAt: normalizeTimestamp(invitation.updatedAt),
    respondedAt: invitation.respondedAt ? normalizeTimestamp(invitation.respondedAt) : null,
    membersSnapshot: Array.isArray(invitation.membersSnapshot)
      ? invitation.membersSnapshot.map((member) => ({
          ...member,
          totalXp: Number(member.totalXp || 0),
          actionsCount: Number(member.actionsCount || 0),
          isOwner: Boolean(member.isOwner),
        }))
      : [],
  };
}

function getCurrentUserName() {
  const user = auth.currentUser;
  return user?.displayName?.trim() || user?.email?.split("@")[0] || "Você";
}

function normalizeEmail(value: string | undefined | null) {
  return value?.trim().toLowerCase() || "";
}

function createInvitationError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

function createOwnerMember(now: string): CompetitionMember {
  return {
    id: auth.currentUser?.uid || "local-user",
    name: getCurrentUserName(),
    totalXp: 0,
    actionsCount: 0,
    isOwner: true,
  };
}

function isGroupOwner(group: CompetitionGroup, uid: string | null) {
  if (!uid) return false;
  if (group.ownerId === uid) return true;
  return group.members.some((member) => member.id === uid && member.isOwner);
}

export function RecyclingCompetitionProvider({ children }: { children: React.ReactNode }) {
  const { users } = useSocial();
  const providerIdRef = useRef<string>(Math.random().toString(36).slice(2, 9));
  const [groups, setGroups] = useState<CompetitionGroup[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<GroupChatMessage[]>([]);
  const [ownedInvitations, setOwnedInvitations] = useState<GroupInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<GroupInvitation[]>([]);
  const activeGroupIdRef = useRef<string | null>(null);
  const currentUidRef = useRef<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    let unsubscribeGroups: (() => void) | null = null;
    let unsubscribeMeta: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;
    let unsubscribeOwnedInvitations: (() => void) | null = null;
    let unsubscribeReceivedInvitations: (() => void) | null = null;

    const bindForUid = (uid: string | null) => {
      if (unsubscribeGroups) {
        unsubscribeGroups();
        unsubscribeGroups = null;
      }
      if (unsubscribeMeta) {
        unsubscribeMeta();
        unsubscribeMeta = null;
      }
      if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
      }
      if (unsubscribeOwnedInvitations) {
        unsubscribeOwnedInvitations();
        unsubscribeOwnedInvitations = null;
      }
      if (unsubscribeReceivedInvitations) {
        unsubscribeReceivedInvitations();
        unsubscribeReceivedInvitations = null;
      }

      if (!uid) {
        setGroups([]);
        setActiveGroupIdState(null);
        setChatMessages([]);
        setOwnedInvitations([]);
        setReceivedInvitations([]);
        return;
      }

      const groupsQuery = query(
        collection(db, "users", uid, "competitionGroups"),
        orderBy("createdAt", "desc"),
      );
      unsubscribeGroups = onSnapshot(
        groupsQuery,
        (snapshot) => {
          const loadedGroups = snapshot.docs.map((snap) =>
            normalizeGroup({
              id: snap.id,
              ...(snap.data() as Omit<CompetitionGroup, "id">),
            }),
          );

          setGroups(loadedGroups);
          setActiveGroupIdState((current) =>
            loadedGroups.some((group) => group.id === current && group.isActive)
              ? current
              : loadedGroups.some((group) => group.id === activeGroupIdRef.current && group.isActive)
                ? activeGroupIdRef.current
                : null,
          );
        },
        (error) => {
          if (error.code === "permission-denied") {
            setGroups([]);
            return;
          }
          console.warn("Competition groups listener failed:", error);
        },
      );

      const metaRef = doc(db, "users", uid, "competitionMeta", "state");
      unsubscribeMeta = onSnapshot(
        metaRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setActiveGroupIdState(null);
            return;
          }

          const nextActiveGroupId = snapshot.data().activeGroupId ?? null;
          setActiveGroupIdState((current) =>
            current === nextActiveGroupId || nextActiveGroupId === null ? nextActiveGroupId : current,
          );
        },
        (error) => {
          if (error.code === "permission-denied") {
            setActiveGroupIdState(null);
            return;
          }
          console.warn("Competition meta listener failed:", error);
        },
      );

        // messages are handled by a group-scoped listener (see separate effect)
        unsubscribeMessages = () => {};

      const ownedInvitationsQuery = query(collection(db, "users", uid, "groupInvitationsSent"), orderBy("createdAt", "desc"));
      unsubscribeOwnedInvitations = onSnapshot(
        ownedInvitationsQuery,
        (snapshot) => {
          setOwnedInvitations(
            snapshot.docs.map((snap) =>
              normalizeInvitation({
                id: snap.id,
                ...(snap.data() as Omit<GroupInvitation, "id">),
              }),
            ),
          );
        },
        (error) => {
          if (error.code === "permission-denied") {
            setOwnedInvitations([]);
            return;
          }
          console.warn("Owned invitations listener failed:", error);
        },
      );

      const receivedInvitationsQuery = query(collection(db, "users", uid, "groupInvitationsReceived"), orderBy("createdAt", "desc"));
      unsubscribeReceivedInvitations = onSnapshot(
        receivedInvitationsQuery,
        (snapshot) => {
          setReceivedInvitations(
            snapshot.docs.map((snap) =>
              normalizeInvitation({
                id: snap.id,
                ...(snap.data() as Omit<GroupInvitation, "id">),
              }),
            ),
          );
        },
        (error) => {
          if (error.code === "permission-denied") {
            setReceivedInvitations([]);
            return;
          }
          console.warn("Received invitations listener failed:", error);
        },
      );
    };

    bindForUid(auth.currentUser?.uid || null);

    const unsub = onAuthStateChanged(auth, (u) => {
      currentUidRef.current = u?.uid || null;
      bindForUid(u?.uid || null);
    });

    return () => unsub();
  }, []);

  const persistActiveGroupId = async (nextActiveGroupId: string | null) => {
    activeGroupIdRef.current = nextActiveGroupId;
    setActiveGroupIdState(nextActiveGroupId);

    const uid = currentUidRef.current;
    if (!uid) return;

    await setDoc(
      doc(db, "users", uid, "competitionMeta", "state"),
      {
        activeGroupId: nextActiveGroupId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const groupInvitations = useMemo(() => {
    const map = new Map<string, GroupInvitation>();
    const all = [...ownedInvitations, ...receivedInvitations];
    for (const invitation of all) {
      const existing = map.get(invitation.id);
      if (!existing) {
        map.set(invitation.id, invitation);
        continue;
      }

      const existingTime = Date.parse(existing.updatedAt || existing.createdAt || "");
      const incomingTime = Date.parse(invitation.updatedAt || invitation.createdAt || "");
      if (Number.isFinite(incomingTime) && (!Number.isFinite(existingTime) || incomingTime >= existingTime)) {
        map.set(invitation.id, invitation);
      }
    }

    return [...map.values()].sort((a, b) => {
      const ta = Date.parse(a.updatedAt || a.createdAt);
      const tb = Date.parse(b.updatedAt || b.createdAt);
      return tb - ta;
    });
  }, [ownedInvitations, receivedInvitations]);

  const writeGroup = async (groupId: string, payload: Partial<CompetitionGroup>) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await setDoc(
      doc(db, "users", uid, "competitionGroups", groupId),
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const propagateGroupUpdate = async (groupId: string, payload: Partial<CompetitionGroup> | CompetitionGroup) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const memberIds = new Set<string>();
    (group.members || []).forEach((m) => memberIds.add(m.id));
    if (group.ownerId) memberIds.add(group.ownerId);

    const batch = writeBatch(db);
    const sanitize = (v: any): any => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      if (Array.isArray(v)) return v.map(sanitize).filter((x) => x !== undefined);
      if (typeof v === "object") {
        const out: any = {};
        for (const key of Object.keys(v)) {
          const val = sanitize(v[key]);
          if (val !== undefined) out[key] = val;
        }
        return out;
      }
      return v;
    };

    const cleaned = sanitize(payload);

    for (const memberId of memberIds) {
      batch.set(
        doc(db, "users", memberId, "competitionGroups", groupId),
        {
          ...(cleaned as object),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    try {
      await batch.commit();
    } catch (err: any) {
      console.warn("[propagateGroupUpdate] batch commit failed, falling back to owner-only write", err);
      const isPerm = err && (err.code === "permission-denied" || /permission|insufficient/i.test(String(err?.message || "")));
      if (isPerm) {
        // fallback: write only to the current user's copy so the operation doesn't fail
        try {
          await writeGroup(groupId, cleaned as Partial<CompetitionGroup>);
        } catch (err2) {
          console.error("[propagateGroupUpdate] fallback writeGroup also failed", err2);
          throw err2;
        }
        // still attempt to write the public group doc if permitted
        try {
          await setDoc(doc(db, "groups", groupId), { ...(cleaned as object), updatedAt: serverTimestamp() }, { merge: true });
        } catch (err3) {
          // ignore — rules may prevent writing shared doc in some setups
          console.warn("[propagateGroupUpdate] writing public groups doc failed", err3);
        }
        return;
      }
      throw err;
    }

    // also update the public groups collection so group image/name is visible to all
    try {
      await setDoc(doc(db, "groups", groupId), { ...(cleaned as object), updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      // if this fails due to permissions, it's non-fatal (we already propagated to member docs or fell back)
      console.warn("[propagateGroupUpdate] failed to write public groups doc", err);
    }
  };

  const propagateGroupDelete = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const memberIds = new Set<string>();
    (group.members || []).forEach((m) => memberIds.add(m.id));
    if (group.ownerId) memberIds.add(group.ownerId);

    const batch = writeBatch(db);
    for (const memberId of memberIds) {
      batch.delete(doc(db, "users", memberId, "competitionGroups", groupId));
    }

    try {
      await batch.commit();
    } catch (err) {
      console.warn("[propagateGroupDelete] batch commit failed, falling back to owner-only delete", err);
      const uid = currentUidRef.current;
      if (uid) {
        try {
          await deleteDoc(doc(db, "users", uid, "competitionGroups", groupId));
        } catch (err2) {
          console.warn("[propagateGroupDelete] fallback delete failed", err2);
        }
      }
    }

    try {
      await deleteDoc(doc(db, "groups", groupId));
    } catch (err) {
      console.warn("[propagateGroupDelete] failed to delete public groups doc", err);
    }
  };

  const persistGroupCopy = async (group: CompetitionGroup) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await setDoc(
      doc(db, "users", uid, "competitionGroups", group.id),
      {
        ...group,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const createGroup = async (input: {
    name: string;
    description?: string;
    durationDays?: number;
    imageUrl?: string;
  }) => {
    const trimmed = input.name.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();
    const uid = currentUidRef.current;
    if (!uid) return;

    const durationDays = Number(input.durationDays || 0) > 0 ? Math.floor(Number(input.durationDays)) : undefined;
    const challengeEndsAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const groupRef = doc(collection(db, "users", uid, "competitionGroups"));
    const nextGroup: CompetitionGroup = {
      id: groupRef.id,
      name: trimmed,
      description: input.description?.trim() || "",
      imageUrl: input.imageUrl || "",
      durationDays,
      challengeEndsAt,
      createdAt: now,
      ownerId: uid,
      isActive: true,
      totalXp: 0,
      totalActions: 0,
      members: [createOwnerMember(now)],
    };

    await setDoc(groupRef, {
      ...nextGroup,
      createdAt: serverTimestamp(),
    });
    // create public group document so image/name are visible to all members
    try {
      await setDoc(doc(db, "groups", nextGroup.id), {
        id: nextGroup.id,
        name: nextGroup.name,
        description: nextGroup.description || "",
        imageUrl: nextGroup.imageUrl || "",
        durationDays: nextGroup.durationDays || null,
        challengeEndsAt: nextGroup.challengeEndsAt || null,
        ownerId: nextGroup.ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        membersIds: nextGroup.members.map((m) => m.id || null).filter(Boolean),
      }, { merge: true });
    } catch (err) {
      console.warn("[createGroup] failed to write public groups doc", err);
    }
    try {
      await persistActiveGroupId(nextGroup.id);
    } catch {
      setActiveGroupIdState(nextGroup.id);
      activeGroupIdRef.current = nextGroup.id;
    }
    void recordAuditEvent({
      eventType: "create",
      resourceType: "recycling_group",
      resourceId: nextGroup.id,
      payload: {
        name: trimmed,
        description: nextGroup.description || "",
        durationDays: nextGroup.durationDays || null,
        hasImage: Boolean(nextGroup.imageUrl),
      },
    });
  };

  const setActiveGroup = async (groupId: string | null) => {
    if (groupId === null) {
      await persistActiveGroupId(null);
      void recordAuditEvent({
        eventType: "select",
        resourceType: "recycling_group",
        resourceId: null,
        payload: { activeGroupId: null },
      });
      return;
    }

    const exists = groups.some((group) => group.id === groupId && group.isActive);
    if (!exists) return;
    await persistActiveGroupId(groupId);
    void recordAuditEvent({
      eventType: "select",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { activeGroupId: groupId },
    });
  };

  const deactivateGroup = async (groupId: string) => {
    const currentUid = currentUidRef.current;
    if (!currentUid) return;

    const target = groups.find((item) => item.id === groupId);
    if (!target || !isGroupOwner(target, currentUid)) return;

    await propagateGroupUpdate(groupId, { isActive: false });

    const nextActiveGroupId = activeGroupIdRef.current === groupId ? null : activeGroupIdRef.current;
    await persistActiveGroupId(nextActiveGroupId);
    void recordAuditEvent({
      eventType: "deactivate",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { activeGroupId: nextActiveGroupId },
    });
  };

  const activateGroup = async (groupId: string) => {
    const currentUid = currentUidRef.current;
    if (!currentUid) return;

    const target = groups.find((item) => item.id === groupId);
    if (!target || !isGroupOwner(target, currentUid)) return;

    await propagateGroupUpdate(groupId, { isActive: true });
    await persistActiveGroupId(groupId);
    void recordAuditEvent({
      eventType: "activate",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { activeGroupId: groupId },
    });
  };

  const updateGroupName = async (groupId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await propagateGroupUpdate(groupId, { name: trimmed });
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { name: trimmed },
    });
  };

  const updateGroupDetails = async (
    groupId: string,
    input: {
      name?: string;
      description?: string;
      imageUrl?: string;
    },
  ) => {
    const payload: Partial<CompetitionGroup> = {};
    const auditPayload: Record<string, unknown> = {};

    if (typeof input.name === "string") {
      const trimmedName = input.name.trim();
      if (trimmedName) {
        payload.name = trimmedName;
        auditPayload.name = trimmedName;
      }
    }

    if (typeof input.description === "string") {
      payload.description = input.description.trim();
      auditPayload.description = payload.description;
    }

    if (typeof input.imageUrl === "string") {
      payload.imageUrl = input.imageUrl;
      auditPayload.hasImage = Boolean(input.imageUrl);
    }

    if (Object.keys(payload).length === 0) return;

    // propagate changes to all members so updates are visible to everyone
    await propagateGroupUpdate(groupId, payload);
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: auditPayload,
    });
  };

  const deleteGroup = async (groupId: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await propagateGroupDelete(groupId);

    const nextActiveGroupId = activeGroupIdRef.current === groupId ? null : activeGroupIdRef.current;
    await persistActiveGroupId(nextActiveGroupId);
    void recordAuditEvent({
      eventType: "delete",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { activeGroupId: nextActiveGroupId },
    });
  };

  const sendGroupInvitation = async (email: string) => {
    const currentUid = currentUidRef.current;
    const trimmedEmail = normalizeEmail(email);
    if (!currentUid) {
      throw createInvitationError("not-authenticated", "Entre na conta para enviar convites.");
    }

    if (!trimmedEmail) {
      throw createInvitationError("invalid-email", "Informe um e-mail válido.");
    }

    const currentGroup = groups.find((group) => group.id === activeGroupIdRef.current);
    if (!currentGroup) {
      throw createInvitationError("no-active-group", "Selecione um grupo para enviar o convite.");
    }

    if (!isGroupOwner(currentGroup, currentUid)) {
      throw createInvitationError("not-owner", "Apenas o dono do grupo pode enviar convites.");
    }

    const currentUserEmail = normalizeEmail(auth.currentUser?.email);
    if (trimmedEmail === currentUserEmail) {
      throw createInvitationError("same-email", "Você não pode convidar seu próprio e-mail.");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      throw new Error("invalid-email");
    }

    const recipientFromMemory = users.find((user) => normalizeEmail((user as any).email) === trimmedEmail || normalizeEmail((user as any).emailLower) === trimmedEmail);
    let recipient = recipientFromMemory
      ? {
          uid: recipientFromMemory.uid,
          username: recipientFromMemory.username || "Usuario",
          email: normalizeEmail(recipientFromMemory.email) || trimmedEmail,
        }
      : null;

    try {
      let exactMatchSnapshot: any = null;
      let exactMatchByEmail: any = null;
      let allUsersSnapshot: any = null;

      if (!recipient) {
        // Try direct lookup on normalized email field (preferred)
        exactMatchSnapshot = await getDocs(
          query(collection(db, "users"), where("emailLower", "==", trimmedEmail), limit(1)),
        );

        if (!exactMatchSnapshot.empty) {
          const snap = exactMatchSnapshot.docs[0];
          const data = snap.data() as { username?: string; email?: string; emailLower?: string };
          recipient = {
            uid: snap.id,
            username: data.username || "Usuario",
            email: normalizeEmail(data.emailLower || data.email) || trimmedEmail,
          };
        }

        // If still not found, try matching plain `email` field (some records may not have emailLower)
        if (!recipient) {
          exactMatchByEmail = await getDocs(
            query(collection(db, "users"), where("email", "==", trimmedEmail), limit(1)),
          );
          if (!exactMatchByEmail.empty) {
            const snap = exactMatchByEmail.docs[0];
            const data = snap.data() as { username?: string; email?: string; emailLower?: string };
            recipient = {
              uid: snap.id,
              username: data.username || "Usuario",
              email: normalizeEmail(data.emailLower || data.email) || trimmedEmail,
            };
          }
        }
      }

      if (!recipient) {
        allUsersSnapshot = await getDocs(collection(db, "users"));
        const fallbackDoc = allUsersSnapshot.docs.find((snap) => {
          const data = snap.data() as { email?: string; emailLower?: string };
          return normalizeEmail(data.emailLower || data.email) === trimmedEmail;
        });

        if (fallbackDoc) {
          const data = fallbackDoc.data() as { username?: string; email?: string; emailLower?: string };
          recipient = {
            uid: fallbackDoc.id,
            username: data.username || "Usuario",
            email: normalizeEmail(data.emailLower || data.email) || trimmedEmail,
          };
        }
      }

      if (!recipient) {
        // Debug logging to help identify why lookup failed for specific email
        try {
          console.error("[sendGroupInvitation] recipient not found debug", {
            email: trimmedEmail,
            groupId: currentGroup.id,
            recipientFromMemory: Boolean(recipientFromMemory),
            recipientFromMemoryEmail: recipientFromMemory ? normalizeEmail((recipientFromMemory as any).email) || (recipientFromMemory as any).emailLower : null,
            exactMatchCount: exactMatchSnapshot ? exactMatchSnapshot.docs.length : 0,
            exactMatchByEmailCount: exactMatchByEmail ? exactMatchByEmail.docs.length : 0,
            allUsersCount: allUsersSnapshot ? allUsersSnapshot.docs.length : 0,
            sampleFirstUserEmails: allUsersSnapshot && allUsersSnapshot.docs.length ? allUsersSnapshot.docs.slice(0,5).map((d: any) => ({ id: d.id, email: normalizeEmail((d.data() as any).emailLower || (d.data() as any).email) })) : [],
          });
        } catch (err) {
          console.warn("[sendGroupInvitation] debug logging failed", err);
        }
      }
    } catch (error) {
      console.error("[sendGroupInvitation] recipient lookup failed", {
        email: trimmedEmail,
        groupId: currentGroup.id,
        error,
      });
      throw createInvitationError(
        "lookup-failed",
        "Não foi possível validar o e-mail agora. Verifique sua conexão e tente novamente.",
      );
    }

    const currentUserName = getCurrentUserName();

    if (!recipient) {
      throw createInvitationError("not-found", `O e-mail ${trimmedEmail} não está cadastrado no app.`);
    }

    const isAlreadyMember = currentGroup.members.some((member) => member.id === recipient.uid);
    if (isAlreadyMember) {
      throw createInvitationError("already-member", "Esta pessoa já faz parte do grupo.");
    }

    const pendingInvite = ownedInvitations.find(
      (invite) =>
        invite.groupId === currentGroup.id &&
        invite.recipientUid === recipient.uid &&
        invite.status === "pending",
    );
    if (pendingInvite) {
      throw createInvitationError("invite-pending", "Já existe um convite pendente para esta pessoa.");
    }

    const inviteId = `${currentGroup.id}_${recipient.uid}`;
    const inviteData = {
      id: inviteId,
      groupId: currentGroup.id,
      groupName: currentGroup.name,
      ownerId: currentUid,
      ownerName: currentUserName,
      ownerEmail: currentUserEmail,
      recipientUid: recipient.uid,
      recipientEmail: (recipient.email || trimmedEmail).toLowerCase(),
      recipientName: recipient.username?.trim() || trimmedEmail.split("@")[0],
      membersSnapshot: currentGroup.members.map((member) => ({
        ...member,
        totalXp: Number(member.totalXp || 0),
        actionsCount: Number(member.actionsCount || 0),
        isOwner: Boolean(member.isOwner),
      })),
      groupCreatedAt: currentGroup.createdAt,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      respondedAt: null,
    };

    console.info("[sendGroupInvitation] resolved recipient", {
      email: trimmedEmail,
      groupId: currentGroup.id,
      recipientUid: recipient.uid,
      recipientEmail: recipient.email,
      inviteId,
    });

    const batch = writeBatch(db);
    console.info("[sendGroupInvitation] committing batch", {
      inviteId,
      ownerPath: `users/${currentUid}/groupInvitationsSent/${inviteId}`,
      recipientPath: `users/${recipient.uid}/groupInvitationsReceived/${inviteId}`,
    });
    batch.set(doc(db, "users", currentUid, "groupInvitationsSent", inviteId), inviteData, { merge: true });
    batch.set(doc(db, "users", recipient.uid, "groupInvitationsReceived", inviteId), inviteData, { merge: true });
    await batch.commit();

    console.info("[sendGroupInvitation] batch committed", {
      inviteId,
      recipientUid: recipient.uid,
    });

    const recipientDeliverySnap = await getDoc(doc(db, "users", recipient.uid, "groupInvitationsReceived", inviteId));
    console.info("[sendGroupInvitation] delivery snapshot", {
      inviteId,
      exists: recipientDeliverySnap.exists(),
      recipientUid: recipient.uid,
    });
    if (!recipientDeliverySnap.exists()) {
      throw createInvitationError("delivery-failed", "O convite foi salvo, mas não chegou à lista de notificações do destinatário.");
    }

    void recordAuditEvent({
      eventType: "member_invite",
      resourceType: "recycling_group",
      resourceId: currentGroup.id,
      payload: { recipientEmail: trimmedEmail },
    });

    console.info("[sendGroupInvitation] invite created", {
      groupId: currentGroup.id,
      groupName: currentGroup.name,
      recipientEmail: trimmedEmail,
      recipientUid: recipient.uid,
      inviteId,
    });

    return {
      persisted: true,
      recipientFound: true,
      delivered: true,
      inviteId,
      recipientEmail: trimmedEmail,
    };
  };

  const acceptGroupInvitation = async (invitationId: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    const invitation = receivedInvitations.find((item) => item.id === invitationId && item.recipientUid === uid);
    if (!invitation || invitation.status !== "pending") return;

    const currentUserName = getCurrentUserName();
    const nextMembers = invitation.membersSnapshot.some((member) => member.id === uid)
      ? invitation.membersSnapshot
      : [
          ...invitation.membersSnapshot,
          {
            id: uid,
            name: currentUserName,
            totalXp: 0,
            actionsCount: 0,
            isOwner: false,
          },
        ];

    const nextGroup: CompetitionGroup = {
      id: invitation.groupId,
      name: invitation.groupName,
      createdAt: invitation.groupCreatedAt,
      ownerId: invitation.ownerId,
      isActive: true,
      totalXp: invitation.membersSnapshot.reduce((sum, member) => sum + Number(member.totalXp || 0), 0),
      totalActions: invitation.membersSnapshot.reduce((sum, member) => sum + Number(member.actionsCount || 0), 0),
      members: nextMembers,
      removedMemberIds: [],
    };

    await persistGroupCopy(nextGroup);
    await persistActiveGroupId(invitation.groupId);

    const statusUpdate = {
      status: "accepted" as const,
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", invitation.ownerId, "groupInvitationsSent", invitation.id), statusUpdate, { merge: true });
    await setDoc(doc(db, "users", uid, "groupInvitationsReceived", invitation.id), statusUpdate, { merge: true });

    void recordAuditEvent({
      eventType: "member_invite_accept",
      resourceType: "recycling_group",
      resourceId: invitation.groupId,
      payload: { invitationId },
    });
  };

  const declineGroupInvitation = async (invitationId: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    const invitation = receivedInvitations.find((item) => item.id === invitationId && item.recipientUid === uid);
    if (!invitation || invitation.status !== "pending") return;

    const statusUpdate = {
      status: "declined" as const,
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", invitation.ownerId, "groupInvitationsSent", invitation.id), statusUpdate, { merge: true });
    await setDoc(doc(db, "users", uid, "groupInvitationsReceived", invitation.id), statusUpdate, { merge: true });

    void recordAuditEvent({
      eventType: "member_invite_decline",
      resourceType: "recycling_group",
      resourceId: invitation.groupId,
      payload: { invitationId },
    });
  };

  useEffect(() => {
    const currentUid = currentUidRef.current;
    if (!currentUid || ownedInvitations.length === 0 || groups.length === 0) return;

    void (async () => {
      for (const invitation of ownedInvitations) {
        if (invitation.status !== "accepted") continue;

        const targetGroup = groups.find((group) => group.id === invitation.groupId);
        if (!targetGroup) continue;

        const hasRecipient = targetGroup.members.some((member) => member.id === invitation.recipientUid);
        if (hasRecipient) continue;
        if ((targetGroup.removedMemberIds || []).includes(invitation.recipientUid)) continue;

        const nextGroup = {
          ...targetGroup,
          members: [
            ...targetGroup.members,
            {
              id: invitation.recipientUid,
              name: invitation.recipientName || invitation.recipientEmail.split("@")[0],
              totalXp: 0,
              actionsCount: 0,
              isOwner: false,
            },
          ],
          removedMemberIds: (targetGroup.removedMemberIds || []).filter((memberId) => memberId !== invitation.recipientUid),
        };

        await propagateGroupUpdate(targetGroup.id, nextGroup);
      }
    })();
  }, [groups, ownedInvitations]);

  const removeMemberFromActiveGroup = async (memberId: string) => {
    const groupId = activeGroupIdRef.current;
    if (!groupId) return;

    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    const member = group.members.find((item) => item.id === memberId);
    if (!member || member.isOwner) return;

    const nextGroup = {
      ...group,
      members: group.members.filter((item) => item.id !== memberId),
      removedMemberIds: Array.from(new Set([...(group.removedMemberIds || []), memberId])),
    };

    await propagateGroupUpdate(groupId, nextGroup);
    void recordAuditEvent({
      eventType: "member_remove",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { memberId },
    });
  };

  const markAcceptedInvitationAsRemoved = async (groupId: string, memberId: string) => {
    const matchingInvitation = [...ownedInvitations, ...receivedInvitations].find(
      (invitation) =>
        invitation.groupId === groupId &&
        invitation.recipientUid === memberId &&
        invitation.status === "accepted",
    );

    if (!matchingInvitation) return;

    const statusUpdate = {
      status: "declined" as const,
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", matchingInvitation.ownerId, "groupInvitationsSent", matchingInvitation.id), statusUpdate, { merge: true });
    await setDoc(doc(db, "users", matchingInvitation.recipientUid, "groupInvitationsReceived", matchingInvitation.id), statusUpdate, { merge: true });
  };

  const removeMember = async (groupId: string, memberId: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const isCallerOwner = group.ownerId === uid;
    const isRemovingOwner = group.ownerId === memberId;

    // Only group owner can remove others; anyone can remove themselves
    if (!isCallerOwner && memberId !== uid) return;

    // If removing the owner:
    if (isRemovingOwner) {
      // If owner is the only member, delete the group
      if ((group.members || []).length <= 1) {
        await deleteGroup(groupId);
        void recordAuditEvent({
          eventType: "delete",
          resourceType: "recycling_group",
          resourceId: groupId,
          payload: { reason: "owner_left" },
        });
        return;
      }

      // Promote the first remaining member to owner
      const remaining = group.members.filter((m) => m.id !== memberId);
      const newOwner = remaining[0];
      const promoted = remaining.map((m) => ({ ...m, isOwner: m.id === newOwner.id }));

      const payload: Partial<CompetitionGroup> = {
        members: promoted,
        ownerId: newOwner.id,
      };

      await propagateGroupUpdate(groupId, payload);
      void recordAuditEvent({
        eventType: "member_remove_promote",
        resourceType: "recycling_group",
        resourceId: groupId,
        payload: { removedMemberId: memberId, promotedTo: newOwner.id },
      });
      return;
    }

    // Removing a normal member: propagate to all members
    const nextMembers = group.members.filter((m) => m.id !== memberId);
    await propagateGroupUpdate(groupId, { members: nextMembers });
    await markAcceptedInvitationAsRemoved(groupId, memberId);
    if (memberId !== uid) {
      try {
        await addDoc(collection(db, "users", memberId, "competitionNotifications"), {
          type: "member-removed",
          groupId,
          groupName: group.name,
          actorId: uid,
          actorName: getCurrentUserName(),
          recipientUid: memberId,
          title: group.name,
          description: `${getCurrentUserName()} removeu você do grupo ${group.name}.`,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("[removeMember] failed to create member removal notification", err);
      }
    }
    void recordAuditEvent({
      eventType: "member_remove",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { memberId },
    });
  };

  const leaveGroup = async (groupId: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;
    await removeMember(groupId, uid);
  };

  const awardXpToActiveGroup = async (xp: number) => {
    const groupId = activeGroupIdRef.current;
    if (!groupId || xp <= 0) return;

    const currentUserId = currentUidRef.current || "local-user";
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    let ownerUpdated = false;
    const nextMembers = group.members.map((member) => {
      if (member.id !== currentUserId) return member;
      ownerUpdated = true;
      return {
        ...member,
        name: member.name || getCurrentUserName(),
        totalXp: member.totalXp + xp,
        actionsCount: member.actionsCount + 1,
      };
    });

    if (!ownerUpdated) {
      nextMembers.push({
        id: currentUserId,
        name: getCurrentUserName(),
        totalXp: xp,
        actionsCount: 1,
        isOwner: true,
      });
    }

    const nextGroup = {
      ...group,
      members: nextMembers,
      totalXp: group.totalXp + xp,
      totalActions: group.totalActions + 1,
    };

    await propagateGroupUpdate(groupId, nextGroup);
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { xpAwarded: xp },
    });
    // Ensure totals are consistent with stored entries
    try {
      await recomputeGroupTotals(groupId);
    } catch (err) {
      console.warn("[awardXpToActiveGroup] recomputeGroupTotals failed", err);
    }
  };

  const adjustGroupXp = async (groupId: string, xpDelta: number) => {
    if (!groupId || xpDelta === 0) return;

    const currentUserId = currentUidRef.current || "local-user";
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    const nextXp = Math.max(0, group.totalXp + xpDelta);
    const nextMembers = group.members.map((member) => {
      if (member.id !== currentUserId) return member;
      return {
        ...member,
        name: member.name || getCurrentUserName(),
        totalXp: Math.max(0, member.totalXp + xpDelta),
      };
    });

    const nextGroup = {
      ...group,
      members: nextMembers,
      totalXp: nextXp,
    };

    await propagateGroupUpdate(groupId, nextGroup);
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { xpDelta },
    });
    try {
      await recomputeGroupTotals(groupId);
    } catch (err) {
      console.warn("[adjustGroupXp] recomputeGroupTotals failed", err);
    }
  };

  const recomputeGroupTotals = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    try {
      const entriesSnap = await getDocs(collection(db, "groupRecyclingActions", groupId, "entries"));
      const perUser = new Map<string, { totalXp: number; actionsCount: number }>();
      let totalXp = 0;
      let totalActions = 0;

      entriesSnap.docs.forEach((snap) => {
        const entry = snap.data() as any;
        const authorId = entry.authorId || entry.author || null;
        const xp = Number(entry.xpEarned || entry.xp || 0);
        const contestPenaltyApplied = Boolean(entry.contestPenaltyApplied);
        const contestCount = Number(entry.contestCount || 0);

        const invalidated = contestPenaltyApplied || contestCount > 5;
        if (!authorId || invalidated) return;

        const prev = perUser.get(authorId) || { totalXp: 0, actionsCount: 0 };
        prev.totalXp += xp;
        prev.actionsCount += 1;
        perUser.set(authorId, prev);

        totalXp += xp;
        totalActions += 1;
      });

      const nextMembers = (group.members || []).map((member) => ({
        ...member,
        totalXp: perUser.get(member.id)?.totalXp || 0,
        actionsCount: perUser.get(member.id)?.actionsCount || 0,
      }));

      await propagateGroupUpdate(groupId, { members: nextMembers, totalXp, totalActions });
      void recordAuditEvent({
        eventType: "recompute",
        resourceType: "recycling_group",
        resourceId: groupId,
        payload: { totalXp, totalActions },
      });
    } catch (err) {
      console.error("[recomputeGroupTotals] failed", err);
      throw err;
    }
  };

  const addChatMessage = async (text: string) => {
    const groupId = activeGroupIdRef.current;
    const trimmed = text.trim();
    if (!groupId || !trimmed) return;

    const uid = currentUidRef.current;
    if (!uid) return;

    const messageId = `msg-${Date.now()}`;
    // write message to the group's chat subcollection under the group's owner doc
    const targetPath = `groupChatMessages/${groupId}/messages/${messageId}`;
    try {
      await setDoc(doc(db, "groupChatMessages", groupId, "messages", messageId), {
        groupId,
        authorId: uid,
        authorName: getCurrentUserName(),
        text: trimmed,
        createdAtClient: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[addChatMessage] failed to write message", { targetPath, groupId, messageId, err });
      throw err;
    }
    void recordAuditEvent({
      eventType: "message",
      resourceType: "competition_chat",
      resourceId: groupId,
      payload: { text: trimmed },
    });
  };

  // Listen to messages for the currently active group (top-level collection)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const groupId = activeGroupIdRef.current;
    if (!groupId) {
      setChatMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, "groupChatMessages", groupId, "messages"),
      orderBy("createdAt", "desc"),
    );

    unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const loaded = snapshot.docs.map((snap) =>
          normalizeChatMessage({
            id: snap.id,
            ...(snap.data() as Omit<GroupChatMessage, "id">),
          }),
        );
        const sample = loaded.slice(0, 5).map((m) => ({ id: m.id, groupId: m.groupId, authorId: m.authorId, text: (m.text || "").slice(0, 60) }));
        console.info("[GroupChat] snapshot", { groupId, count: loaded.length, sample, providerId: providerIdRef.current });
        setChatMessages(loaded);
      },
      (error) => {
        if (error.code === "permission-denied") {
          setChatMessages([]);
          return;
        }
        console.warn("Group chat messages listener failed:", error);
      },
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeGroupId]);

  const activeGroup = useMemo(() => {
    const base = groups.find((group) => group.id === activeGroupId && group.isActive) || null;
    if (!base) return null;

    // Merge accepted invitations into members so accepted users appear
    const acceptedInvites = groupInvitations.filter((inv) => inv.groupId === base.id && inv.status === "accepted");
    if (acceptedInvites.length === 0) return base;

    const extraMembers: CompetitionMember[] = acceptedInvites
      .map((inv) => ({
        id: inv.recipientUid,
        name: inv.recipientName || inv.recipientEmail.split("@")[0],
        totalXp: 0,
        actionsCount: 0,
        isOwner: false,
      }))
      .filter((m) => !base.members.some((bm) => bm.id === m.id) && !(base.removedMemberIds || []).includes(m.id));

    if (extraMembers.length === 0) return base;

    return {
      ...base,
      members: [...base.members, ...extraMembers],
    };
  }, [groups, activeGroupId, groupInvitations]);
  const rankedMembers = useMemo(() => {
    if (!activeGroup) return [];
    return [...activeGroup.members].sort((a, b) => {
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [activeGroup]);

  return (
    <RecyclingCompetitionContext.Provider
      value={{
        groups,
        activeGroupId,
        activeGroup,
        rankedMembers,
        chatMessages,
        providerId: providerIdRef.current,
        groupInvitations,
        createGroup,
        updateGroupDetails,
        setActiveGroup,
        activateGroup,
        deactivateGroup,
        updateGroupName,
        deleteGroup,
        sendGroupInvitation,
        acceptGroupInvitation,
        declineGroupInvitation,
        removeMemberFromActiveGroup,
          removeMember,
          leaveGroup,
        awardXpToActiveGroup,
        adjustGroupXp,
        addChatMessage,
      }}
    >
      {children}
    </RecyclingCompetitionContext.Provider>
  );
}

export function useRecyclingCompetition() {
  const ctx = useContext(RecyclingCompetitionContext);
  if (!ctx) throw new Error("useRecyclingCompetition must be used within RecyclingCompetitionProvider");
  return ctx;
}
