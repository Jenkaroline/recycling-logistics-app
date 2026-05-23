import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  Timestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../service/firebaseConfig";
import { recordAuditEvent } from "./auditLogger";

type GroupChatMessage = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
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
  createdAt: string;
  ownerId: string;
  isActive: boolean;
  members: CompetitionMember[];
  totalXp: number;
  totalActions: number;
};

type RecyclingCompetitionContextValue = {
  groups: CompetitionGroup[];
  activeGroupId: string | null;
  activeGroup: CompetitionGroup | null;
  rankedMembers: CompetitionMember[];
  chatMessages: GroupChatMessage[];
  createGroup: (name: string) => Promise<void>;
  setActiveGroup: (groupId: string | null) => Promise<void>;
  activateGroup: (groupId: string) => Promise<void>;
  deactivateGroup: (groupId: string) => Promise<void>;
  updateGroupName: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMemberToActiveGroup: (name: string) => Promise<void>;
  removeMemberFromActiveGroup: (memberId: string) => Promise<void>;
  awardXpToActiveGroup: (xp: number) => Promise<void>;
  addChatMessage: (text: string) => Promise<void>;
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

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (hasToDate(value)) return value.toDate().toISOString();
  return new Date().toISOString();
}

function normalizeGroup(group: CompetitionGroup & { createdAt?: unknown }): CompetitionGroup {
  return {
    ...group,
    createdAt: normalizeTimestamp(group.createdAt),
    ownerId: group.ownerId || group.members.find((member) => member.isOwner)?.id || "local-user",
    isActive: typeof group.isActive === "boolean" ? group.isActive : true,
    totalXp: Number(group.totalXp || 0),
    totalActions: Number(group.totalActions || 0),
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

function normalizeChatMessage(message: GroupChatMessage & { createdAt?: unknown }): GroupChatMessage {
  return {
    ...message,
    createdAt: normalizeTimestamp(message.createdAt),
  };
}

function getCurrentUserName() {
  const user = auth.currentUser;
  return user?.displayName?.trim() || user?.email?.split("@")[0] || "Você";
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
  const [groups, setGroups] = useState<CompetitionGroup[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<GroupChatMessage[]>([]);
  const activeGroupIdRef = useRef<string | null>(null);
  const currentUidRef = useRef<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    let unsubscribeGroups: (() => void) | null = null;
    let unsubscribeMeta: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;

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

      if (!uid) {
        setGroups([]);
        setActiveGroupIdState(null);
        setChatMessages([]);
        return;
      }

      const groupsQuery = query(
        collection(db, "users", uid, "competitionGroups"),
        orderBy("createdAt", "desc"),
      );
      unsubscribeGroups = onSnapshot(groupsQuery, (snapshot) => {
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
      });

      const metaRef = doc(db, "users", uid, "competitionMeta", "state");
      unsubscribeMeta = onSnapshot(metaRef, (snapshot) => {
        if (!snapshot.exists()) {
          setActiveGroupIdState(null);
          return;
        }

        const nextActiveGroupId = snapshot.data().activeGroupId ?? null;
        setActiveGroupIdState((current) =>
          current === nextActiveGroupId || nextActiveGroupId === null ? nextActiveGroupId : current,
        );
      });

      const messagesQuery = query(
        collection(db, "users", uid, "competitionChatMessages"),
        orderBy("createdAt", "desc"),
      );
      unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        setChatMessages(
          snapshot.docs.map((snap) =>
            normalizeChatMessage({
              id: snap.id,
              ...(snap.data() as Omit<GroupChatMessage, "id">),
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

  const createGroup = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();
    const uid = currentUidRef.current;
    if (!uid) return;

    const groupRef = doc(collection(db, "users", uid, "competitionGroups"));
    const nextGroup: CompetitionGroup = {
      id: groupRef.id,
      name: trimmed,
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
      payload: { name: trimmed },
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

    await writeGroup(groupId, { isActive: false });

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

    await writeGroup(groupId, { isActive: true });
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

    await writeGroup(groupId, { name: trimmed });
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { name: trimmed },
    });
  };

  const deleteGroup = async (groupId: string) => {
    const uid = currentUidRef.current;
    if (!uid) return;

    await deleteDoc(doc(db, "users", uid, "competitionGroups", groupId));
    const nextActiveGroupId = activeGroupIdRef.current === groupId ? null : activeGroupIdRef.current;
    await persistActiveGroupId(nextActiveGroupId);
    void recordAuditEvent({
      eventType: "delete",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { activeGroupId: nextActiveGroupId },
    });
  };

  const addMemberToActiveGroup = async (name: string) => {
    const groupId = activeGroupIdRef.current;
    const trimmed = name.trim();
    if (!groupId || !trimmed) return;

    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    if (group.members.some((member) => member.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const nextGroup = {
      ...group,
      members: [
        ...group.members,
        {
          id: `member-${Date.now()}`,
          name: trimmed,
          totalXp: 0,
          actionsCount: 0,
          isOwner: false,
        },
      ],
    };

    await writeGroup(groupId, nextGroup);
    void recordAuditEvent({
      eventType: "member_add",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { memberName: trimmed },
    });
  };

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
    };

    await writeGroup(groupId, nextGroup);
    void recordAuditEvent({
      eventType: "member_remove",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { memberId },
    });
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

    await writeGroup(groupId, nextGroup);
    void recordAuditEvent({
      eventType: "update",
      resourceType: "recycling_group",
      resourceId: groupId,
      payload: { xpAwarded: xp },
    });
  };

  const addChatMessage = async (text: string) => {
    const groupId = activeGroupIdRef.current;
    const trimmed = text.trim();
    if (!groupId || !trimmed) return;

    const uid = currentUidRef.current;
    if (!uid) return;

    const messageId = `msg-${Date.now()}`;
    await setDoc(doc(db, "users", uid, "competitionChatMessages", messageId), {
      groupId,
      authorId: uid,
      authorName: getCurrentUserName(),
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    void recordAuditEvent({
      eventType: "message",
      resourceType: "competition_chat",
      resourceId: groupId,
      payload: { text: trimmed },
    });
  };

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId && group.isActive) || null,
    [groups, activeGroupId],
  );
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
        createGroup,
        setActiveGroup,
        activateGroup,
        deactivateGroup,
        updateGroupName,
        deleteGroup,
        addMemberToActiveGroup,
        removeMemberFromActiveGroup,
        awardXpToActiveGroup,
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
