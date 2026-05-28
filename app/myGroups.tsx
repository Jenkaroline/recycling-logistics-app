import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useDrawerStatus } from "@react-navigation/drawer";
import { DrawerActions, useNavigation, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addDoc, collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth } from "../service/firebaseConfig";
import { useRecyclingCompetition } from "../src/RecyclingCompetitionContext";
import { useRecycling } from "../src/RecyclingContext";
import { useRecyclingTypes } from "../src/RecyclingTypesContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { translateFirebaseError } from "../src/firebaseErrorMapper";
import { captureRecyclingEvidencePhoto } from "../src/recyclingEvidence";
import { db } from "../service/firebaseConfig";

type GroupTab = "stats" | "feed" | "chat";
type ManageAction = "rename" | "addMember" | "critical" | "members" | null;

type GroupEvidenceEntry = {
  id: string;
  type: string;
  typeId?: string | null;
  groupId: string;
  authorId?: string | null;
  authorName?: string | null;
  xpEarned?: number;
  notes?: string | null;
  photoUrl?: string | null;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contestCount?: number;
  contestPenaltyApplied?: boolean;
  contestPenaltyAppliedAt?: string | null;
  contestReasons?: Array<{
    authorId: string;
    authorName?: string | null;
    reason: string;
    createdAt: string;
  }>;
  createdAt: string;
};

function normalizeDateString(value: unknown) {
  const minValidTimestamp = Date.UTC(2000, 0, 1);

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() >= minValidTimestamp) {
      return parsed.toISOString();
    }
  }

  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate();
    if (parsed.getTime() >= minValidTimestamp) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function parseChatDate(value: unknown) {
  const normalized = normalizeDateString(value);
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDayKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function formatChatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatChatTimeLabel(value: unknown) {
  const date = parseChatDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

type GroupPalette = {
  bg: string;
  panel: string;
  panelAlt: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  recycleAccent: string;
  recycleSoft: string;
  recycleLine: string;
  danger: string;
  dangerPanel: string;
  dangerBorder: string;
  dangerText: string;
  cardBorder: string;
  modalSurface: string;
  modalInput: string;
};

export default function MyGroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const drawerNavigation = navigation.getParent?.("MainDrawer") || navigation;
  const { darkModeEnabled } = useThemePreference();
  const { addAction: addRecyclingAction } = useRecycling();
  const { types: recyclingTypes } = useRecyclingTypes();
  const {
    groups,
    chatMessages,
    createGroup,
    setActiveGroup,
    activateGroup,
    deactivateGroup,
    updateGroupName,
    updateGroupDetails,
    removeMember,
    leaveGroup,
    deleteGroup,
    addChatMessage,
    sendGroupInvitation,
    activeGroupId,
    awardXpToActiveGroup,
    adjustGroupXp,
  } = useRecyclingCompetition();

  const [createVisible, setCreateVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupDurationDays, setGroupDurationDays] = useState("7");
  const [groupImageUrl, setGroupImageUrl] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<GroupTab>("stats");
  const [messageText, setMessageText] = useState("");
  const [manageMenuVisible, setManageMenuVisible] = useState(false);
  const [manageAction, setManageAction] = useState<ManageAction>(null);
  const [manageGroupName, setManageGroupName] = useState("");
  const [manageGroupDescription, setManageGroupDescription] = useState("");
  const [manageGroupImageUrl, setManageGroupImageUrl] = useState("");
  const [manageMemberName, setManageMemberName] = useState("");
  const [groupEvidenceEntries, setGroupEvidenceEntries] = useState<GroupEvidenceEntry[]>([]);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [contestModalVisible, setContestModalVisible] = useState(false);
  const [contestReason, setContestReason] = useState("");
  const [contestTargetEntry, setContestTargetEntry] = useState<GroupEvidenceEntry | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);

  const resetCreateForm = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupDurationDays("7");
    setGroupImageUrl("");
  };

  const handlePickGroupImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão", "Permita acesso à galeria para adicionar a imagem do grupo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.3,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;

    if (dataUrl.length > 900000) {
      Alert.alert("Imagem grande demais", "Escolha uma foto menor para salvar no Firestore.");
      return;
    }

    setGroupImageUrl(dataUrl);
  };

  const handlePickManageGroupImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão", "Permita acesso à galeria para atualizar a imagem do grupo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.3,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;

    if (dataUrl.length > 900000) {
      Alert.alert("Imagem grande demais", "Escolha uma foto menor para salvar no Firestore.");
      return;
    }

    setManageGroupImageUrl(dataUrl);
  };

  const palette: GroupPalette = darkModeEnabled
    ? {
        bg: "#061526",
        panel: "#0c2740",
        panelAlt: "#123252",
        textPrimary: "#eaf4ff",
        textSecondary: "#b7cde6",
        textMuted: "#8aa6c0",
        recycleAccent: "#0fd3b6",
        recycleSoft: "rgba(15, 211, 182, 0.14)",
        recycleLine: "rgba(15, 211, 182, 0.4)",
        danger: "#ff8b94",
        dangerPanel: "#2b1821",
        dangerBorder: "#5f3140",
        dangerText: "#fca5a5",
        cardBorder: "#1e3a57",
        modalSurface: "#0c2740",
        modalInput: "#123252",
      }
    : {
        bg: "#f4f8fc",
        panel: "#ffffff",
        panelAlt: "#edf3f9",
        textPrimary: "#1d3750",
        textSecondary: "#5d748b",
        textMuted: "#6b7f95",
        recycleAccent: "#1b8f5a",
        recycleSoft: "rgba(27, 143, 90, 0.11)",
        recycleLine: "rgba(27, 143, 90, 0.24)",
        danger: "#b3314d",
        dangerPanel: "#fdecef",
        dangerBorder: "#f4c6cf",
        dangerText: "#b3314d",
        cardBorder: "#d7e5f2",
        modalSurface: "#ffffff",
        modalInput: "#f3f8fd",
      };

  const inputTheme = {
    colors: {
      primary: palette.recycleAccent,
      outline: palette.cardBorder,
      onSurface: palette.textPrimary,
      onSurfaceVariant: palette.textSecondary,
    },
  };

  useEffect(() => {
    if (selectedGroupId && !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(null);
      setSelectedTab("stats");
    }
  }, [groups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  useEffect(() => {
    const routeGroupId = route?.params?.groupId;
    const routeTab = route?.params?.tab;
    if (!routeGroupId) return;
    if (!groups.some((group) => group.id === routeGroupId)) return;

    setSelectedGroupId(routeGroupId);
    setSelectedTab(routeTab === "stats" ? "stats" : "stats");
    void setActiveGroup(routeGroupId);
  }, [route?.params?.groupId, route?.params?.tab, groups, setActiveGroup]);

  useEffect(() => {
    if (!selectedGroup?.id) {
      setGroupEvidenceEntries([]);
      return;
    }

    const evidenceQuery = query(
      collection(db, "groupRecyclingActions", selectedGroup.id, "entries"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      evidenceQuery,
      (snapshot) => {
        setGroupEvidenceEntries(
          snapshot.docs
            .map((snap) => ({
              id: snap.id,
              ...(snap.data() as Omit<GroupEvidenceEntry, "id">),
              createdAt: normalizeDateString((snap.data() as { createdAt?: unknown }).createdAt),
            }))
            .filter((entry) => !Boolean((entry as GroupEvidenceEntry).contestPenaltyApplied)),
        );
      },
      (error) => {
        if (error.code === "permission-denied") {
          setGroupEvidenceEntries([]);
          return;
        }
        console.warn("Group evidence listener failed:", error);
      },
    );

    return () => unsubscribe();
  }, [selectedGroup?.id]);

  const currentUserId = auth.currentUser?.uid || null;
  const currentUserName = auth.currentUser?.displayName?.trim() || auth.currentUser?.email?.split("@")[0] || "Você";
  const canManageSelectedGroup = Boolean(
    selectedGroup?.members.some((member) => member.id === currentUserId && member.isOwner),
  );

  const visibleGroups = useMemo(() => {
    return [...groups]
      .filter((group) => {
        const isOwner = group.ownerId === currentUserId;
        const isMember = group.members.some((member) => member.id === currentUserId);
        if (!isOwner && !isMember) return false;
        if (!group.isActive && !isOwner) return false;
        return true;
      })
      .sort((a, b) => b.totalXp - a.totalXp);
  }, [groups, currentUserId]);

  const groupMembers = useMemo(() => {
    if (!selectedGroup) return [];
    const memberMap = new Map<
      string,
      {
        id: string;
        name: string;
        totalXp: number;
        actionsCount: number;
        isOwner: boolean;
      }
    >();

    (selectedGroup.members || []).forEach((member) => {
      memberMap.set(member.id, {
        id: member.id,
        name: member.name,
        totalXp: 0,
        actionsCount: 0,
        isOwner: Boolean(member.isOwner),
      });
    });

    groupEvidenceEntries.forEach((entry) => {
      const authorId = entry.authorId || entry.authorName || `entry-${entry.id}`;
      const current = memberMap.get(authorId) || {
        id: authorId,
        name: entry.authorName || "Membro",
        totalXp: 0,
        actionsCount: 0,
        isOwner: false,
      };

      current.name = current.name || entry.authorName || "Membro";
      current.totalXp += Number(entry.xpEarned || 0);
      current.actionsCount += 1;
      memberMap.set(authorId, current);
    });

    return [...memberMap.values()].sort((a, b) => {
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [groupEvidenceEntries, selectedGroup]);

  const groupFeed = useMemo(() => {
    if (!selectedGroup) return [];
    return groupEvidenceEntries;
  }, [groupEvidenceEntries, selectedGroup]);

  const orderedRecyclingTypes = useMemo(() => {
    const key = "descarte em ecoponto";
    const lowerKey = key.toLowerCase();
    const found = recyclingTypes.find((type) => String(type.type).toLowerCase() === lowerKey);
    if (!found) return recyclingTypes;
    return [found, ...recyclingTypes.filter((type) => type.id !== found.id)];
  }, [recyclingTypes]);

  const groupChat = useMemo(() => {
    const chatGroupId = activeGroupId || selectedGroup?.id || null;
    if (!chatGroupId) return [];
    return chatMessages
      .filter((message) => String(message.groupId) === String(chatGroupId))
      .sort((a, b) => {
        const firstDate = parseChatDate(a.createdAt)?.getTime() ?? 0;
        const secondDate = parseChatDate(b.createdAt)?.getTime() ?? 0;
        return firstDate - secondDate;
      });
  }, [chatMessages, selectedGroup, activeGroupId]);

  const chatTimeline = useMemo(() => {
    const rows: Array<
      | { type: "day"; id: string; label: string }
      | { type: "message"; id: string; message: (typeof groupChat)[number] }
    > = [];

    let lastDayKey: string | null = null;

    groupChat.forEach((message) => {
      const messageDate = parseChatDate(message.createdAt);
      const dayKey = messageDate ? getLocalDayKey(messageDate) : null;

      if (messageDate && dayKey !== lastDayKey) {
        rows.push({ type: "day", id: `day-${dayKey}`, label: formatChatDayLabel(messageDate) });
        lastDayKey = dayKey;
      }

      rows.push({ type: "message", id: message.id, message });
    });

    return rows;
  }, [groupChat]);

  useEffect(() => {
    if (selectedTab !== "chat") return;
    chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [groupChat.length, selectedTab]);

  useEffect(() => {
    if (selectedTab === "chat") {
      setRecordModalVisible(false);
    }
  }, [selectedTab]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const durationDays = Number.parseInt(groupDurationDays, 10);
    try {
      await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        durationDays: Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 7,
        imageUrl: groupImageUrl,
      });
      resetCreateForm();
      setCreateVisible(false);
    } catch (error) {
      Alert.alert("Falha ao criar grupo", "Não foi possível criar o grupo agora. Tente novamente em instantes.");
    }
  };

  const openGroup = async (groupId: string) => {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    if (!group.isActive) {
      const isOwner = group.ownerId === currentUserId;
      if (!isOwner) {
        Alert.alert("Grupo inativo", "Este grupo está inativo no momento.");
        return;
      }

      Alert.alert(
        "Grupo inativo",
        "Este grupo não pode ser acessado agora. Deseja reativar?",
        [
          { text: "Agora não", style: "cancel" },
          {
            text: "Sim, reativar",
            onPress: () => {
              setSelectedGroupId(groupId);
              setSelectedTab("stats");
              setManageGroupName(group.name);
              setManageMemberName("");
              setManageAction("critical");
              setManageMenuVisible(true);
            },
          },
        ],
      );
      return;
    }

    try {
      setSelectedGroupId(groupId);
      setSelectedTab("stats");
      await setActiveGroup(groupId);
    } catch (error) {
      Alert.alert("Falha ao abrir grupo", "Não foi possível abrir o grupo agora. Tente novamente em instantes.");
    }
  };

  const openManageGroup = () => {
    if (!selectedGroup) return;
    setManageGroupName(selectedGroup.name);
    setManageGroupDescription(selectedGroup.description || "");
    setManageGroupImageUrl(selectedGroup.imageUrl || "");
    setManageMemberName("");
    setManageAction(null);
    setManageMenuVisible(true);
  };

  const closeManageAction = () => {
    setManageAction(null);
    setManageMenuVisible(false);
    resetManageForm();
  };

  const resetManageForm = () => {
    setManageGroupName("");
    setManageGroupDescription("");
    setManageGroupImageUrl("");
    setManageMemberName("");
  };

  const handleRenameGroup = async () => {
    if (!selectedGroup) return;
    const nextName = manageGroupName.trim();
    const nextDescription = manageGroupDescription.trim();
    const nextImageUrl = manageGroupImageUrl;

    if (
      (!nextName || nextName === selectedGroup.name) &&
      nextDescription === (selectedGroup.description || "") &&
      nextImageUrl === (selectedGroup.imageUrl || "")
    ) {
      return;
    }

    try {
      await updateGroupDetails(selectedGroup.id, {
        name: nextName || selectedGroup.name,
        description: nextDescription,
        imageUrl: nextImageUrl,
      });
      setManageGroupName(nextName);
      setManageGroupDescription(nextDescription);
      setManageGroupImageUrl(nextImageUrl);
      setManageAction(null);
      setManageMenuVisible(false);
      Alert.alert("Grupo atualizado", "As informações do grupo foram salvas.");
    } catch (error) {
      Alert.alert("Falha ao atualizar grupo", "Não foi possível salvar as alterações agora. Tente novamente em instantes.");
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup) return;
    const inputEmail = manageMemberName.trim().toLowerCase();
    if (!inputEmail) return;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(inputEmail)) {
      Alert.alert("E-mail inválido", "Digite um e-mail válido para adicionar a pessoa.");
      return;
    }

    try {
      const result = await sendGroupInvitation(inputEmail);
      setManageAction(null);
      setManageMenuVisible(false);
      setManageMemberName("");

      if (!result.persisted || !result.recipientFound || !result.delivered) {
        Alert.alert("Falha ao enviar", `O e-mail ${inputEmail} precisa estar cadastrado no app para receber o convite.`);
        return;
      }

      Alert.alert("Convite enviado", "A pessoa receberá o convite na tela de notificações.");
    } catch (error) {
      const errorCode = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      if (errorCode === "same-email") {
        Alert.alert("E-mail inválido", "Você não pode convidar o seu próprio e-mail.");
        return;
      }

      if (errorCode === "invalid-email" || errorMessage === "invalid-email") {
        Alert.alert("E-mail inválido", "Digite um e-mail válido para enviar o convite.");
        return;
      }

      if (errorCode === "no-active-group") {
        Alert.alert("Grupo indisponível", "Selecione um grupo ativo antes de enviar convites.");
        return;
      }

      if (errorCode === "not-owner") {
        Alert.alert("Sem permissão", "Apenas o dono do grupo pode enviar convites.");
        return;
      }

      if (errorCode === "already-member") {
        Alert.alert("Pessoa já no grupo", "Essa pessoa já aceitou e faz parte do grupo. Não é possível enviar o convite novamente.");
        return;
      }

      if (errorCode === "invite-pending") {
        Alert.alert("Convite já enviado", "Já existe um convite pendente para esta pessoa. Aguarde ela responder antes de tentar novamente.");
        return;
      }

      if (errorCode === "not-found" || errorMessage === "not-found") {
        Alert.alert("Pessoa não cadastrada", "Não encontramos essa pessoa no app. Peça para ela se cadastrar e tente novamente.");
        return;
      }

      if (errorCode === "lookup-failed") {
        Alert.alert("Não foi possível validar", "Não conseguimos confirmar esse e-mail agora. Verifique sua conexão e tente novamente.");
        return;
      }

      if (errorCode === "delivery-failed") {
        Alert.alert("Falha ao enviar", "Encontramos a pessoa, mas não conseguimos entregar o convite na tela de notificações. Tente novamente.");
        return;
      }

      console.error("[MyGroups] failed to send invitation", {
        email: inputEmail,
        groupId: selectedGroup.id,
        errorCode: errorCode || "unknown",
      });

      Alert.alert("Falha ao enviar convite", "Não foi possível enviar o convite agora. Tente novamente em instantes.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;
    const member = selectedGroup.members.find((m) => m.id === memberId);
    if (!member) return;

    Alert.alert(
      "Remover membro",
      `Remover ${member.name} do grupo?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember(selectedGroup.id, memberId);
              Alert.alert("Removido", `${member.name} foi removido do grupo.`);
            } catch (err) {
              console.error("[handleRemoveMember]", err);
              Alert.alert("Erro", "Não foi possível remover o membro. Tente novamente.");
            }
          },
        },
      ],
    );
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    Alert.alert(
      "Sair do grupo",
      `Deseja sair do grupo ${selectedGroup.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(selectedGroup.id);
              setManageMenuVisible(false);
              setSelectedGroupId(null);
              Alert.alert("Saída", "Você saiu do grupo.");
            } catch (err) {
              console.error("[handleLeaveGroup]", err);
              Alert.alert("Erro", "Não foi possível sair do grupo. Tente novamente.");
            }
          },
        },
      ],
    );
  };

  const handleAddGroupRecord = async (item: { id: string; type: string; xp: number }) => {
    if (!selectedGroup) return;

    const photoUrl = await captureRecyclingEvidencePhoto();
    if (!photoUrl) return;

    try {
      const currentUser = auth.currentUser;
      await addRecyclingAction({
        type: item.type,
        typeId: item.id,
        groupId: selectedGroup.id,
        photoUrl,
        authorName: currentUser?.displayName?.trim() || currentUser?.email?.split("@")[0] || "Você",
        xpEarned: item.xp,
      });
      await awardXpToActiveGroup(item.xp);
      navigation.navigate("Home", { tab: "recycling", groupId: selectedGroup.id });
    } catch (error) {
      Alert.alert("Falha ao registrar evidência", translateFirebaseError(error));
    }
  };

  const openContestModal = (entry: GroupEvidenceEntry) => {
    if (entry.authorId === auth.currentUser?.uid) {
      Alert.alert("Sem ação", "Você não pode contestar a sua própria evidência.");
      return;
    }

    setContestTargetEntry(entry);
    setContestReason("");
    setContestModalVisible(true);
  };

  const submitContest = async () => {
    if (!selectedGroup || !contestTargetEntry) return;
    const reason = contestReason.trim();
    if (!reason) {
      Alert.alert("Motivo obrigatório", "Explique por que esta evidência é inválida.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      let shouldApplyPenalty = false;
      await runTransaction(db, async (transaction) => {
        const entryRef = doc(db, "groupRecyclingActions", selectedGroup.id, "entries", contestTargetEntry.id);
        const entrySnapshot = await transaction.get(entryRef);
        if (!entrySnapshot.exists()) {
          throw new Error("Evidência não encontrada.");
        }

        const currentCount = Number(entrySnapshot.data().contestCount || 0);
        const currentPenaltyApplied = Boolean(entrySnapshot.data().contestPenaltyApplied);
        const nextCount = currentCount + 1;
        const previousReasons = Array.isArray(entrySnapshot.data().contestReasons)
          ? entrySnapshot.data().contestReasons
          : [];
        const nextReasons = [
          ...previousReasons,
          {
            authorId: currentUser.uid,
            authorName: currentUser.displayName?.trim() || currentUser.email?.split("@")[0] || "Você",
            reason,
            createdAt: new Date().toISOString(),
          },
        ].slice(-10);

        transaction.update(entryRef, {
          contestCount: nextCount,
          contestPenaltyApplied: currentPenaltyApplied || nextCount > 5,
          contestPenaltyAppliedAt: !currentPenaltyApplied && nextCount > 5 ? serverTimestamp() : entrySnapshot.data().contestPenaltyAppliedAt || null,
          contestReasons: nextReasons,
        });

        shouldApplyPenalty = !currentPenaltyApplied && nextCount > 5;
      });

      // create a group-level notification about the contest (all members will receive it, except the actor)
      try {
        await addDoc(collection(db, "groupNotifications", selectedGroup.id, "items"), {
          type: "contested",
          entryId: contestTargetEntry.id,
          entryAuthorId: contestTargetEntry.authorId || null,
          entryAuthorName: contestTargetEntry.authorName || null,
          actorId: currentUser.uid,
          actorName: currentUser.displayName?.trim() || currentUser.email?.split("@")[0] || "Alguém",
          reason,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("failed to create contest notification:", err);
      }

      if (shouldApplyPenalty) {
        const penaltyXp = Number(contestTargetEntry.xpEarned || 0);
        if (penaltyXp > 0) {
          await adjustGroupXp(selectedGroup.id, -penaltyXp);
        }
      }
        // notify members that the evidence was invalidated
        try {
          await addDoc(collection(db, "groupNotifications", selectedGroup.id, "items"), {
            type: "invalidated",
            entryId: contestTargetEntry.id,
            entryAuthorId: contestTargetEntry.authorId || null,
            entryAuthorName: contestTargetEntry.authorName || null,
            actorId: currentUser.uid,
            actorName: currentUser.displayName?.trim() || currentUser.email?.split("@")[0] || "Alguém",
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn("failed to create invalidation notification:", err);
        }

      setContestModalVisible(false);
      setContestReason("");
      setContestTargetEntry(null);
    } catch (error) {
      if ((error as { code?: string })?.code === "permission-denied") {
        Alert.alert("Sem permissão", "Não foi possível salvar a contestação agora.");
        return;
      }
      Alert.alert("Erro", "Não foi possível registrar a contestação.");
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      await addChatMessage(messageText.trim());
      setMessageText("");
    } catch (error) {
      Alert.alert("Falha ao enviar mensagem", translateFirebaseError(error));
    }
  };

  const renderGroupList = () => (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 48, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 1, fontWeight: "700" }}>GRUPOS</Text>
          <Text style={{ color: palette.textPrimary, fontSize: 28, fontWeight: "900", marginTop: 4 }}>Desafie seus amigos!</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 8 }}>Selecione um grupo para conferir estatísticas, rankings e pontuações.</Text>
        </View>
        <Image source={require("../assets/images/polvo.png")} style={{ width: 120, height: 100, marginLeft: 12 }} contentFit="contain" />
      </View>

      {visibleGroups.length === 0 ? (
        <View style={{ backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 18 }}>
          <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 6 }}>Nenhum grupo disponível</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 18 }}>
             Incentive o engajamento! Crie um grupo para interagir, obter rankings e estatísticas de desempenho coletivo.
          </Text>
          <Button mode="contained" buttonColor={palette.panelAlt} textColor={palette.recycleAccent} onPress={() => setCreateVisible(true)} style={{ marginTop: 14, borderRadius: 14, borderWidth: 0.2, borderColor: palette.recycleAccent, justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 0 }}>
            Criar grupo
          </Button>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {visibleGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              onPress={() => void openGroup(group.id)}
              style={{ backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 16, marginTop: 20 }}
            >
              {group.imageUrl ? (
                <Image source={{ uri: group.imageUrl }} style={{ width: "100%", height: 140, borderRadius: 14, marginBottom: 12, backgroundColor: palette.panelAlt }} contentFit="cover" transition={180} />
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 17 }}>{group.name}</Text>
                <View
                  style={{
                    backgroundColor: group.isActive ? palette.recycleSoft : palette.panelAlt,
                    borderColor: group.isActive ? palette.recycleLine : palette.dangerBorder,
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: group.isActive ? palette.recycleAccent : palette.dangerText, fontSize: 11, fontWeight: "700" }}>
                    {group.isActive ? "Ativo" : "Inativo"}
                  </Text>
                </View>
              </View>
              {group.description ? (
                <Text style={{ color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>
                  {group.description}
                </Text>
              ) : null}
              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                {group.totalXp} XP • {group.totalActions} registro(s) • {group.members.length} membro(s)
                {group.durationDays ? ` • ${group.durationDays} dia(s)` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderDetail = () => {
    if (!selectedGroup) return null;

    const segments: Array<{ key: GroupTab; label: string }> = [
      { key: "stats", label: "Classificação" },
      { key: "feed", label: "Evidências" },
      { key: "chat", label: "Chat" },
    ];

    return (
      <ScrollView
        scrollEnabled={selectedTab !== "chat"}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setSelectedGroupId(null)}
            style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12, alignItems: "center" }}>
            {selectedGroup.imageUrl ? (
              <Image source={{ uri: selectedGroup.imageUrl }} style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 8, backgroundColor: palette.panelAlt }} contentFit="cover" transition={180} />
            ) : (
              <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <MaterialCommunityIcons name="group" size={32} color={palette.recycleAccent} />
              </View>
            )}
            <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: "900", marginTop: 2 }} numberOfLines={1}>
              {selectedGroup.name}
            </Text>
            {groupMembers.some((m) => m.id === currentUserId) && selectedGroup.ownerId !== currentUserId ? (
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>Você participa deste grupo</Text>
            ) : null}

            {selectedGroup.description ? (
              <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 4, textAlign: "center" }} numberOfLines={2}>
                {selectedGroup.description}
              </Text>
            ) : null}
            {selectedGroup.durationDays ? (
              <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>
                Desafio por {selectedGroup.durationDays} dia(s)
              </Text>
            ) : null}
          </View>
          {canManageSelectedGroup ? (
            <TouchableOpacity
              onPress={openManageGroup}
              style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="settings-outline" size={18} color={palette.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setManageAction("members");
                setManageMenuVisible(true);
              }}
              style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="people-outline" size={18} color={palette.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: "row", backgroundColor: palette.panelAlt, borderRadius: 16, padding: 4, marginBottom: 14 }}>
          {segments.map((segment) => (
            <TouchableOpacity
              key={segment.key}
              onPress={() => setSelectedTab(segment.key)}
              style={{
                flex: 1,
                borderRadius: 12,
                paddingVertical: 10,
                backgroundColor: selectedTab === segment.key ? palette.panel : "transparent",
                borderWidth: selectedTab === segment.key ? 1 : 0,
                borderColor: selectedTab === segment.key ? palette.cardBorder : "transparent",
                alignItems: "center",
              }}
            >
              <Text style={{ color: selectedTab === segment.key ? palette.textPrimary : palette.textSecondary, fontWeight: "800", fontSize: 12 }}>
                {segment.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

       

        {selectedTab === "stats" ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 14 }}>
                <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "700" }}>XP TOTAL</Text>
                <Text style={{ color: palette.recycleAccent, fontSize: 24, fontWeight: "900", marginTop: 4 }}>{selectedGroup.totalXp}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 14 }}>
                <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "700" }}>AÇÕES</Text>
                <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: "900", marginTop: 4 }}>{selectedGroup.totalActions}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 16 }}>
              <Text style={{ color: palette.textPrimary, fontWeight: "800", marginBottom: 10 }}>Classificação</Text>
              {groupMembers.length === 0 ? (
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Ainda não há participantes.</Text>
              ) : (
                groupMembers.map((member, index) => (
                  <View
                    key={member.id}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: index === groupMembers.length - 1 ? 0 : 1, borderBottomColor: palette.cardBorder }}
                  >
                    <View>
                      <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>#{index + 1} {member.name}</Text>
                      <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{member.actionsCount} ações</Text>
                    </View>
                    <Text style={{ color: palette.recycleAccent, fontWeight: "800" }}>{member.totalXp} XP</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}

        {selectedTab === "feed" ? (
          <View style={{ gap: 12 }}>
            {groupFeed.length === 0 ? (
              <View style={{ backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 16 }}>
                <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Ainda não há evidências registradas para este grupo.</Text>
              </View>
            ) : (
              groupFeed.map((entry) => {
                const createdAt = new Date(normalizeDateString(entry.createdAt));
                const timeLabel = createdAt.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const contestCount = Number(entry.contestCount || 0);
                const invalidated = contestCount > 5 || Boolean(entry.contestPenaltyApplied);
                const contestReasons = Array.isArray(entry.contestReasons) ? entry.contestReasons : [];

                return (
                  <View key={entry.id} style={{ backgroundColor: palette.panel, borderWidth: 1, borderColor: invalidated ? palette.dangerBorder : palette.cardBorder, borderRadius: 24, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ color: palette.textPrimary, fontWeight: "900", fontSize: 15 }} numberOfLines={1}>
                            {entry.type}
                          </Text>
                          <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                            {entry.authorName || "Membro"} • {timeLabel}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: invalidated ? palette.dangerPanel : palette.recycleSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Text style={{ color: invalidated ? palette.dangerText : palette.recycleAccent, fontWeight: "900", fontSize: 11 }}>{entry.xpEarned || 0} XP</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        {contestCount > 0 ? (
                          <View style={{ backgroundColor: palette.panelAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: "800" }}>{contestCount} contestações</Text>
                          </View>
                        ) : null}
                        {invalidated ? (
                          <View style={{ backgroundColor: palette.dangerPanel, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: palette.dangerText, fontSize: 11, fontWeight: "800" }}>Invalidada</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {entry.photoUrl ? (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                        <Image source={{ uri: entry.photoUrl }} style={{ width: "100%", height: 190, borderRadius: 18, backgroundColor: palette.panelAlt }} contentFit="cover" transition={180} />
                      </View>
                    ) : null}

                    <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                      {entry.locationLabel || (typeof entry.latitude === "number" && typeof entry.longitude === "number") ? (
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: palette.panelAlt, borderRadius: 16, padding: 12, marginBottom: 12 }}>
                          <Ionicons name="location-outline" size={16} color={palette.recycleAccent} />
                          <Text style={{ color: palette.textPrimary, fontSize: 13, lineHeight: 19, flex: 1 }}>
                            {entry.locationLabel || `${entry.latitude?.toFixed(6)}, ${entry.longitude?.toFixed(6)}`}
                          </Text>
                        </View>
                      ) : null}

                      <View style={{ backgroundColor: palette.panelAlt, borderRadius: 16, padding: 12, marginBottom: 12 }}>
                        {entry.notes ? (
                          <Text style={{ color: palette.textPrimary, fontSize: 13, lineHeight: 19 }}>{entry.notes}</Text>
                        ) : (
                          <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 19 }}>Sem observações.</Text>
                        )}
                      </View>

                      {contestReasons.length > 0 ? (
                        <View style={{ gap: 8, marginBottom: 12 }}>
                          {contestReasons.slice(-2).map((contest) => (
                            <View key={`${contest.authorId}-${contest.createdAt}`} style={{ backgroundColor: palette.panelAlt, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: palette.cardBorder }}>
                              <Text style={{ color: palette.textSecondary, fontSize: 10, fontWeight: "800", marginBottom: 4 }}>
                                {contest.authorName || "Usuário"}
                              </Text>
                              <Text style={{ color: palette.textPrimary, fontSize: 12, lineHeight: 17 }}>
                                {contest.reason}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <TouchableOpacity
                        onPress={() => openContestModal(entry)}
                        disabled={entry.authorId === auth.currentUser?.uid}
                        style={{
                          alignSelf: "flex-start",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          backgroundColor: entry.authorId === auth.currentUser?.uid ? palette.panelAlt : palette.dangerPanel,
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          opacity: entry.authorId === auth.currentUser?.uid ? 0.55 : 1,
                        }}
                      >
                        <Ionicons name="alert-circle-outline" size={16} color={palette.dangerText} />
                        <Text style={{ color: palette.dangerText, fontSize: 12, fontWeight: "800" }}>Contestar evidência</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {selectedTab === "chat" ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                backgroundColor: palette.panel,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                borderRadius: 22,
                padding: 12,
                gap: 10,
                minHeight: 400,
                maxHeight: 440,
              }}
            >
              {groupChat.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color={palette.recycleAccent} />
                  </View>
                  <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 15, marginBottom: 4 }}>Ainda não há mensagens</Text>
                  <Text style={{ color: palette.textSecondary, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                    Seja o primeiro a puxar a conversa do grupo.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  ref={chatScrollRef}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => {
                    if (selectedTab === "chat") {
                      chatScrollRef.current?.scrollToEnd({ animated: true });
                    }
                  }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "flex-end",
                    paddingTop: 4,
                    paddingBottom: 20,
                    gap: 10,
                  }}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: "400" }}>
                      Grupo criado em {new Date(selectedGroup.createdAt).toLocaleDateString("pt-BR")}.
                    </Text>
                  </View>

                  {chatTimeline.map((item) => {
                    if (item.type === "day") {
                      return (
                        <View key={item.id} style={{ alignItems: "center", marginVertical: 6 }}>
                          <View
                            style={{
                              backgroundColor: palette.panelAlt,
                              borderColor: palette.cardBorder,
                              borderWidth: 1,
                              borderRadius: 999,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>
                              {item.label}
                            </Text>
                          </View>
                        </View>
                      );
                    }

                    const message = item.message;
                    const isMine = message.authorId === currentUserId || message.authorName === currentUserName;
                    const initials = (message.authorName || "U")
                      .split(" ")
                      .map((part) => part.charAt(0))
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <View
                        key={item.id}
                        style={{
                          flexDirection: isMine ? "row-reverse" : "row",
                          alignItems: "flex-end",
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            backgroundColor: isMine ? palette.recycleAccent : palette.panelAlt,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: isMine ? palette.panel : palette.textPrimary, fontWeight: "900", fontSize: 11 }}>{initials}</Text>
                        </View>

                        <View style={{ flex: 1, alignItems: isMine ? "flex-end" : "flex-start" }}>
                          <View
                            style={{
                              maxWidth: "88%",
                              backgroundColor: isMine ? palette.recycleAccent : palette.panelAlt,
                              borderRadius: 18,
                              borderTopRightRadius: isMine ? 6 : 18,
                              borderTopLeftRadius: isMine ? 18 : 6,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                            }}
                          >
                            <Text style={{ color: isMine ? palette.panel : palette.textPrimary, fontWeight: "800", fontSize: 12, marginBottom: 4 }}>
                              {isMine ? "Você" : message.authorName}
                            </Text>
                            <Text style={{ color: isMine ? palette.panel : palette.textPrimary, fontSize: 13, lineHeight: 18 }}>
                              {message.text}
                            </Text>
                          </View>
                          <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 4, marginHorizontal: 4 }}>
                            {formatChatTimeLabel(message.createdAt)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View
              style={{
                backgroundColor: palette.panel,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                borderRadius: 22,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                <TextInput
                  label="Escreva uma mensagem"
                  placeholder="Digite sua mensagem"
                  value={messageText}
                  onChangeText={setMessageText}
                  mode="outlined"
                  multiline
                  textColor={palette.textPrimary}
                  placeholderTextColor={palette.textSecondary}
                  selectionColor={palette.recycleAccent}
                  cursorColor={palette.recycleAccent}
                  outlineColor={palette.cardBorder}
                  activeOutlineColor={palette.recycleAccent}
                  outlineStyle={{ borderRadius: 14, borderWidth: 0.8 }}
                  theme={inputTheme}
                  style={{ flex: 1, backgroundColor: palette.modalInput }}
                />
                <TouchableOpacity
                  onPress={() => void sendMessage()}
                  disabled={!messageText.trim()}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: messageText.trim() ? palette.recycleAccent : palette.panelAlt,
                  }}
                >
                  <Ionicons name="send" size={18} color={messageText.trim() ? palette.panel : palette.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top }}>
      {!selectedGroup && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, zIndex: 40 }} pointerEvents="box-none">
          <View style={{ height: insets.top + 28 }} />
          <View style={{ height: 64 - insets.top - 28, paddingHorizontal: 12, justifyContent: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <TouchableOpacity
                onPress={() => drawerNavigation.dispatch(drawerOpen ? DrawerActions.closeDrawer() : DrawerActions.openDrawer())}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: palette.panel,
                  borderWidth: 1,
                  borderColor: palette.cardBorder,
                }}
              >
                <Ionicons name={drawerOpen ? "close" : "menu"} size={20} color={palette.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCreateVisible(true)}
                style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="add" size={22} color={palette.recycleAccent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {selectedGroup ? renderDetail() : renderGroupList()}

      {selectedGroup && selectedTab !== "chat" ? (
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}>
          <TouchableOpacity
            onPress={() => setRecordModalVisible(true)}
            style={{
              position: "absolute",
              right: 16,
              bottom: insets.bottom + 16,
              width: 54,
              height: 54,
              borderRadius: 18,
              backgroundColor: palette.recycleAccent,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.16,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <Ionicons name="add" size={24} color={palette.panel} />
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={createVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: palette.modalSurface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, borderWidth: 1, borderColor: palette.cardBorder }}>
<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: palette.textPrimary }}>Criar grupo</Text>
          <Text style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}>Crie e configure seu grupo. </Text>
        </View>
        <TouchableOpacity onPress={() => { resetCreateForm(); setCreateVisible(false); }} style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="close" size={16} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>            
      <TouchableOpacity
        onPress={() => void handlePickGroupImage()}
        style={{
          height: 150,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: palette.panelAlt,
          borderWidth: 1,
          borderColor: palette.cardBorder,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {groupImageUrl ? (
          <Image source={{ uri: groupImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={180} />
        ) : (
          <View style={{ alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons name="image-plus" size={30} color={palette.recycleAccent} />
            <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Adicionar imagem do desafio</Text>
          </View>
        )}
      </TouchableOpacity>
      <TextInput
              label="Nome do grupo"
              value={groupName}
              onChangeText={setGroupName}
              mode="outlined"
              textColor={palette.textPrimary}
              placeholderTextColor={palette.textSecondary}
              selectionColor={palette.recycleAccent}
              cursorColor={palette.recycleAccent}
              outlineColor={palette.cardBorder}
              activeOutlineColor={palette.recycleAccent}
              outlineStyle={{ borderRadius: 14, borderWidth: 0.8 }}
              theme={inputTheme}
              style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
            />
            <TextInput
              label="Descrição"
              value={groupDescription}
              onChangeText={setGroupDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              textColor={palette.textPrimary}
              placeholderTextColor={palette.textSecondary}
              selectionColor={palette.recycleAccent}
              cursorColor={palette.recycleAccent}
              outlineColor={palette.cardBorder}
              activeOutlineColor={palette.recycleAccent}
              outlineStyle={{ borderRadius: 14, borderWidth: 0.8 }}
              theme={inputTheme}
              style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
            />
            <TextInput
              label="Duração do desafio (dias)"
              value={groupDurationDays}
              onChangeText={setGroupDurationDays}
              keyboardType="number-pad"
              mode="outlined"
              textColor={palette.textPrimary}
              placeholderTextColor={palette.textSecondary}
              selectionColor={palette.recycleAccent}
              cursorColor={palette.recycleAccent}
              outlineColor={palette.cardBorder}
              activeOutlineColor={palette.recycleAccent}
              outlineStyle={{ borderRadius: 14, borderWidth: 0.8 }}
              theme={inputTheme}
              style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
            />
            <Button mode="contained" buttonColor={palette.recycleAccent} textColor={palette.panel} onPress={handleCreateGroup} style={{ marginBottom: 10 }}>
              Criar grupo
            </Button>
            
          </View>
        </View>
      </Modal>

      <Modal visible={contestModalVisible} transparent animationType="fade" onRequestClose={() => setContestModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 18 }}>
          <View style={{ backgroundColor: palette.modalSurface, borderRadius: 24, borderWidth: 1, borderColor: palette.cardBorder, padding: 16, maxWidth: 520, width: "100%", alignSelf: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 1, fontWeight: "700" }}>CONTESTAÇÃO</Text>
                <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: "900", marginTop: 2 }}>Por que esta evidência é inválida?</Text>
              </View>
              <TouchableOpacity onPress={() => setContestModalVisible(false)} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={18} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              label="Motivo"
              placeholder="Explique o que torna a evidência inválida"
              value={contestReason}
              onChangeText={setContestReason}
              multiline
              mode="outlined"
              textColor={palette.textPrimary}
              placeholderTextColor={palette.textSecondary}
              outlineColor={palette.cardBorder}
              activeOutlineColor={palette.danger}
              theme={inputTheme}
              style={{ backgroundColor: palette.modalInput, marginBottom: 14 }}
            />

            <Button mode="contained" buttonColor={palette.danger} textColor="#fff" onPress={() => void submitContest()}>
              Enviar contestação
            </Button>
          </View>
        </View>
      </Modal>

      <Modal visible={manageMenuVisible} animationType="slide" onRequestClose={closeManageAction}>
        <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top + 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 1, fontWeight: "700" }}>
                {canManageSelectedGroup ? "CONFIGURAÇÃO" : "MEMBROS"}
              </Text>
              <Text style={{ color: palette.textPrimary, fontSize: 28, fontWeight: "900", marginTop: 2 }}>
                {canManageSelectedGroup ? "Gerenciar grupo" : "Participação no grupo"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeManageAction}
              style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={20} color={palette.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: palette.textSecondary, fontSize: 12, marginBottom: 14, paddingHorizontal: 20 }}>
            {canManageSelectedGroup ? "Escolha o que deseja ajustar." : "Veja quem faz parte do grupo e saia se quiser."}
          </Text>

          {canManageSelectedGroup ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}>
              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panelAlt }}>
                <TouchableOpacity
                  onPress={() => setManageAction((current) => (current === "rename" ? null : "rename"))}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 16 }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Alterar informações</Text>
                  </View>
                  <Ionicons name={manageAction === "rename" ? "chevron-up" : "create-outline"} size={20} color={palette.textSecondary} />
                </TouchableOpacity>

                {manageAction === "rename" ? (
                  <View style={{ backgroundColor: palette.panel, borderTopWidth: 1, borderTopColor: palette.cardBorder, padding: 14 }}>
                    <TouchableOpacity
                      onPress={() => void handlePickManageGroupImage()}
                      style={{
                        height: 150,
                        borderRadius: 16,
                        overflow: "hidden",
                        backgroundColor: palette.panelAlt,
                        borderWidth: 1,
                        borderColor: palette.cardBorder,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                      }}
                    >
                      {manageGroupImageUrl ? (
                        <Image source={{ uri: manageGroupImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={180} />
                      ) : (
                        <View style={{ alignItems: "center", gap: 6 }}>
                          <MaterialCommunityIcons name="image-plus" size={30} color={palette.recycleAccent} />
                          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Atualizar imagem do grupo</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TextInput
                      label="Nome do grupo"
                      value={manageGroupName}
                      onChangeText={setManageGroupName}
                      mode="outlined"
                      textColor={palette.textPrimary}
                      placeholderTextColor={palette.textSecondary}
                      selectionColor={palette.recycleAccent}
                      cursorColor={palette.recycleAccent}
                      outlineColor={palette.cardBorder}
                      activeOutlineColor={palette.recycleAccent}
                      outlineStyle={{ borderRadius: 14, borderWidth: 0.8 }}
                      theme={inputTheme}
                      style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
                    />
                    <TextInput
                      label="Descrição"
                      value={manageGroupDescription}
                      onChangeText={setManageGroupDescription}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      textColor={palette.textPrimary}
                      placeholderTextColor={palette.textSecondary}
                      selectionColor={palette.recycleAccent}
                      cursorColor={palette.recycleAccent}
                      outlineColor={palette.cardBorder}
                      activeOutlineColor={palette.recycleAccent}
                      outlineStyle={{ borderRadius: 14, borderWidth: 0.8 }}
                      theme={inputTheme}
                      style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
                    />
                    <Button
                      mode="contained"
                      onPress={async () => {
                        const nextName = manageGroupName.trim();
                        const nextDescription = manageGroupDescription.trim();

                        if (
                          nextName === (selectedGroup?.name || "") &&
                          nextDescription === (selectedGroup?.description || "") &&
                          manageGroupImageUrl === (selectedGroup?.imageUrl || "")
                        ) {
                          Alert.alert("Nada para salvar", "Faça alguma alteração antes de salvar.");
                          return;
                        }
                        await handleRenameGroup();
                      }}
                      buttonColor={palette.recycleAccent}
                      textColor={palette.panel}
                    >
                      Salvar alterações
                    </Button>
                  </View>
                ) : null}
              </View>

              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panelAlt }}>
                <TouchableOpacity
                  onPress={() => setManageAction((current) => (current === "addMember" ? null : "addMember"))}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 16 }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Enviar convite</Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>Informe um e-mail cadastrado no app para enviar um convite.</Text>
                  </View>
                  <Ionicons name={manageAction === "addMember" ? "chevron-up" : "person-add-outline"} size={20} color={palette.textSecondary} />
                </TouchableOpacity>

                {manageAction === "addMember" ? (
                  <View style={{ backgroundColor: palette.panel, borderTopWidth: 1, borderTopColor: palette.cardBorder, padding: 14 }}>
                    <TextInput
                      label="E-mail da pessoa"
                      value={manageMemberName}
                      onChangeText={(value) => setManageMemberName(value.replace(/\s+/g, ""))}
                      mode="outlined"
                      textColor={palette.textPrimary}
                      placeholderTextColor={palette.textSecondary}
                      selectionColor={palette.recycleAccent}
                      cursorColor={palette.recycleAccent}
                      outlineColor={palette.cardBorder}
                      activeOutlineColor={palette.recycleAccent}
                      outlineStyle={{ borderRadius: 14, borderWidth: 0.8 }}
                      theme={inputTheme}
                      style={{ marginBottom: 12, backgroundColor: palette.modalInput }}
                    />
                    <Button
                      mode="contained"
                      onPress={async () => {
                        if (!manageMemberName.trim()) {
                          Alert.alert("Preencha o e-mail", "Informe o e-mail da pessoa para enviar o convite.");
                          return;
                        }
                        await handleAddMember();
                      }}
                      buttonColor={palette.recycleAccent}
                      textColor={palette.panel}
                    >
                      Enviar convite
                    </Button>
                  </View>
                ) : null}
              </View>

              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panelAlt }}>
                <TouchableOpacity
                  onPress={() => setManageAction((current) => (current === "members" ? null : "members"))}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 16 }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Membros</Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>{groupMembers.length} participantes</Text>
                  </View>
                  <Ionicons name={manageAction === "members" ? "chevron-up" : "people-outline"} size={20} color={palette.textSecondary} />
                </TouchableOpacity>

                {manageAction === "members" ? (
                  <View style={{ backgroundColor: palette.panel, borderTopWidth: 1, borderTopColor: palette.cardBorder, padding: 12 }}>
                    {groupMembers.map((member, idx, arr) => {
                      const initials = (member.name || "").split(" ").map((s) => s.charAt(0)).slice(0, 2).join("").toUpperCase() || "U";
                      return (
                        <View key={member.id} style={{ paddingVertical: 10, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: palette.cardBorder }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                                <Text style={{ color: palette.recycleAccent, fontWeight: "900" }}>{initials}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: palette.textPrimary, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{member.name}</Text>
                                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{member.isOwner ? "Administrador" : "Membro"}</Text>
                              </View>
                            </View>
                            <View style={{ marginLeft: 12 }}>
                              {member.id === currentUserId ? (
                                <Text style={{ color: palette.textSecondary, fontWeight: "700" }}>Você</Text>
                              ) : canManageSelectedGroup ? (
                                <TouchableOpacity
                                  onPress={() => void handleRemoveMember(member.id)}
                                  style={{ width: 44, height: 36, borderRadius: 10, backgroundColor: palette.dangerBorder, alignItems: "center", justifyContent: "center" }}
                                >
                                  <Ionicons name="trash" size={18} color={palette.dangerText} />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.dangerBorder, backgroundColor: palette.dangerPanel }}>
                <TouchableOpacity
                  onPress={() => setManageAction((current) => (current === "critical" ? null : "critical"))}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 16 }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: palette.dangerText, fontWeight: "700" }}>Ações críticas</Text>
                  </View>
                  <Ionicons name={manageAction === "critical" ? "chevron-up" : "warning-outline"} size={20} color={palette.dangerText} />
                </TouchableOpacity>

                {manageAction === "critical" ? (
                  <View style={{ backgroundColor: palette.panel, borderTopWidth: 1, borderTopColor: palette.dangerBorder, padding: 14 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (selectedGroup?.isActive) {
                          Alert.alert("Desativar grupo", "Deseja remover este grupo da lista ativa?", [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Desativar",
                              style: "destructive",
                              onPress: async () => {
                                if (!selectedGroup?.id) return;
                                try {
                                  await deactivateGroup(selectedGroup.id);
                                  setSelectedGroupId(null);
                                  setManageAction(null);
                                  setManageMenuVisible(false);
                                  Alert.alert("Grupo desativado", "O grupo foi removido da lista ativa.");
                                } catch (error) {
                                    Alert.alert("Falha ao desativar grupo", "Não foi possível desativar o grupo agora. Tente novamente em instantes.");
                                }
                              },
                            },
                          ]);
                          return;
                        }

                        Alert.alert("Ativar grupo", "Deseja reativar este grupo?", [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Ativar",
                            onPress: async () => {
                              if (!selectedGroup?.id) return;
                              try {
                                await activateGroup(selectedGroup.id);
                                await setActiveGroup(selectedGroup.id);
                                setManageAction(null);
                                setManageMenuVisible(false);
                                Alert.alert("Grupo reativado", "Agora você já pode entrar no grupo.");
                              } catch (error) {
                                Alert.alert("Falha ao ativar grupo", "Não foi possível reativar o grupo agora. Tente novamente em instantes.");
                              }
                            },
                          },
                        ]);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: palette.panelAlt,
                        borderWidth: 1,
                        borderColor: palette.cardBorder,
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>
                          {selectedGroup?.isActive ? "Desativar grupo" : "Ativar grupo"}
                        </Text>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                          {selectedGroup?.isActive ? "Remover o grupo da lista ativa." : "Tornar o grupo disponível novamente."}
                        </Text>
                      </View>
                      <Ionicons
                        name={selectedGroup?.isActive ? "pause-circle-outline" : "play-circle-outline"}
                        size={20}
                        color={palette.textSecondary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert("Excluir grupo", "Deseja remover este grupo?", [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Excluir",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await deleteGroup(selectedGroup?.id || "");
                                setSelectedGroupId(null);
                                setManageAction(null);
                                setManageMenuVisible(false);
                                Alert.alert("Grupo excluído", "O grupo foi removido com sucesso.");
                              } catch (error) {
                                Alert.alert("Falha ao excluir grupo", "Não foi possível excluir o grupo agora. Tente novamente em instantes.");
                              }
                            },
                          },
                        ]);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: palette.panelAlt,
                        borderWidth: 1,
                        borderColor: palette.cardBorder,
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Remover grupo</Text>
                        <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>Excluir o grupo permanentemente.</Text>
                      </View>
                      <Ionicons name="trash-outline" size={20} color={palette.dangerText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void handleLeaveGroup()}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: palette.panelAlt,
                        borderWidth: 1,
                        borderColor: palette.cardBorder,
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Sair do grupo</Text>
                        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>Remover sua participação neste grupo.</Text>
                      </View>
                      <Ionicons name="log-out-outline" size={20} color={palette.dangerText} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}>
              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panelAlt }}>
                <View style={{ backgroundColor: palette.panel, borderBottomWidth: 1, borderBottomColor: palette.cardBorder, padding: 12 }}>
                  <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 14 }}>Lista de membros</Text>
                  <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>{groupMembers.length} participantes</Text>
                </View>

                <View style={{ backgroundColor: palette.panel, padding: 12 }}>
                  {groupMembers.map((member, idx, arr) => {
                    const initials = (member.name || "").split(" ").map((s) => s.charAt(0)).slice(0, 2).join("").toUpperCase() || "U";

                    return (
                      <View key={member.id} style={{ paddingVertical: 10, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: palette.cardBorder }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: palette.panelAlt, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                              <Text style={{ color: palette.recycleAccent, fontWeight: "900" }}>{initials}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: palette.textPrimary, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                                {member.name}
                              </Text>
                              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{member.isOwner ? "Administrador" : "Membro"}</Text>
                            </View>
                          </View>
                          <View style={{ marginLeft: 12 }}>
                            {member.id === currentUserId ? <Text style={{ color: palette.textSecondary, fontWeight: "700" }}>Você</Text> : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => void handleLeaveGroup()}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: palette.dangerPanel,
                  borderWidth: 1,
                  borderColor: palette.dangerBorder,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Sair do grupo</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>Remover sua participação neste grupo.</Text>
                </View>
                <Ionicons name="log-out-outline" size={20} color={palette.dangerText} />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={recordModalVisible} transparent animationType="fade" onRequestClose={() => setRecordModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} pointerEvents="box-none">
          <View
            style={{
              position: "absolute",
              right: 16,
              bottom: insets.bottom + 16,
              width: 320,
              maxWidth: "92%",
              backgroundColor: palette.modalSurface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: palette.cardBorder,
              padding: 16,
              maxHeight: "78%",
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 1, fontWeight: "700" }}>REGISTRAR</Text>
                <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: "900", marginTop: 2 }}>Adicionar evidência</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRecordModalVisible(false)}
                style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={18} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: palette.textSecondary, fontSize: 12, marginBottom: 12 }}>
              Escolha uma ação para registrar XP no grupo.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 6 }}>
              {orderedRecyclingTypes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={async () => {
                    await handleAddGroupRecord(item);
                    setRecordModalVisible(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: palette.cardBorder,
                    backgroundColor: palette.panel,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: "800", fontSize: 14 }} numberOfLines={1}>
                      {item.type}
                    </Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                      {item.hint || "Registro de evidência."}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: palette.recycleSoft }}>
                    <Text style={{ color: palette.recycleAccent, fontWeight: "800", fontSize: 11 }}>{item.xp} XP</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
