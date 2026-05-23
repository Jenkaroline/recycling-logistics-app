import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useDrawerStatus } from "@react-navigation/drawer";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecyclingCompetition } from "../src/RecyclingCompetitionContext";
import { useRecycling } from "../src/RecyclingContext";
import { useThemePreference } from "../src/ThemePreferenceContext";
import { auth, db } from "../service/firebaseConfig";

type GroupTab = "stats" | "feed" | "chat";
type ManageAction = "rename" | "addMember" | "critical" | null;
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
  dangerSubtext: string;
  cardBorder: string;
  modalSurface: string;
  modalInput: string;
};

export default function MyGroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const drawerOpen = drawerStatus === "open";
  const { darkModeEnabled } = useThemePreference();
  const { entries: recyclingEntries } = useRecycling();
  const {
    groups,
    rankedMembers,
    chatMessages,
    createGroup,
    setActiveGroup,
    activateGroup,
    deactivateGroup,
    updateGroupName,
    deleteGroup,
    addChatMessage,
    addMemberToActiveGroup,
  } = useRecyclingCompetition();

  const [createVisible, setCreateVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<GroupTab>("stats");
  const [messageText, setMessageText] = useState("");
  const [manageMenuVisible, setManageMenuVisible] = useState(false);
  const [manageAction, setManageAction] = useState<ManageAction>(null);
  const [manageGroupName, setManageGroupName] = useState("");
  const [manageMemberName, setManageMemberName] = useState("");

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
        dangerSubtext: "#e9b9c3",
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
        dangerSubtext: "#8a4a59",
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
    return [...rankedMembers];
  }, [rankedMembers, selectedGroup]);

  const groupFeed = useMemo(() => {
    if (!selectedGroup) return [];
    return recyclingEntries
      .filter((entry) => entry.groupId === selectedGroup.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [recyclingEntries, selectedGroup]);

  const groupChat = useMemo(() => {
    if (!selectedGroup) return [];
    return chatMessages
      .filter((message) => message.groupId === selectedGroup.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [chatMessages, selectedGroup]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    await createGroup(groupName.trim());
    setGroupName("");
    setCreateVisible(false);
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

    setSelectedGroupId(groupId);
    setSelectedTab("stats");
    await setActiveGroup(groupId);
  };

  const openManageGroup = () => {
    if (!selectedGroup) return;
    setManageGroupName(selectedGroup.name);
    setManageMemberName("");
    setManageAction(null);
    setManageMenuVisible(true);
  };

  const openManageAction = (action: Exclude<ManageAction, null>) => {
    setManageMenuVisible(false);
    setManageAction(action);
  };

  const closeManageAction = () => {
    setManageAction(null);
    setManageMenuVisible(false);
  };

  const handleRenameGroup = async () => {
    if (!selectedGroup) return;
    const nextName = manageGroupName.trim();
    if (!nextName || nextName === selectedGroup.name) return;
    await updateGroupName(selectedGroup.id, nextName);
    setManageGroupName(nextName);
    setManageAction(null);
    setManageMenuVisible(false);
    Alert.alert("Nome atualizado", `O grupo agora se chama "${nextName}".`);
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
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", inputEmail),
        limit(1),
      );
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        Alert.alert("Usuário não encontrado", "Este e-mail não está cadastrado no app.");
        return;
      }

      const userData = userSnapshot.docs[0].data() as {
        username?: string;
      };
      const memberName = userData.username?.trim() || inputEmail.split("@")[0];
      await addMemberToActiveGroup(memberName);
      setManageAction(null);
      setManageMenuVisible(false);
    } catch {
      Alert.alert("Falha na validação", "Não foi possível validar o e-mail agora. Tente novamente.");
      return;
    }

    setManageMemberName("");
    Alert.alert("Membro adicionado", "Pessoa incluída no grupo com sucesso.");
  };

  const renameDisabled = !manageGroupName.trim() || manageGroupName.trim() === selectedGroup?.name;
  const addDisabled = !manageMemberName.trim();

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    await addChatMessage(messageText.trim());
    setMessageText("");
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
              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                {group.totalXp} XP • {group.totalActions} registro(s) • {group.members.length} membro(s)
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setSelectedGroupId(null)}
            style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12, alignItems: "center" }}>
            <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: "900", marginTop: 2 }} numberOfLines={1}>
              {selectedGroup.name}
            </Text>
          </View>
          {canManageSelectedGroup ? (
            <TouchableOpacity
              onPress={openManageGroup}
              style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="settings-outline" size={18} color={palette.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 42, height: 42 }} />
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
              groupFeed.map((entry) => (
                <View key={entry.id} style={{ backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 18, padding: 16 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: "800" }}>{entry.type}</Text>
                    <Text style={{ color: palette.recycleAccent, fontWeight: "800" }}>{entry.xpEarned || 0} XP</Text>
                  </View>
                  <Text style={{ color: palette.textSecondary, fontSize: 12, marginBottom: 8 }}>
                    {entry.authorName || "Membro"} • {new Date(entry.createdAt).toLocaleString("pt-BR")}
                  </Text>
                  {entry.notes ? (
                    <Text style={{ color: palette.textPrimary, fontSize: 13, lineHeight: 18 }}>{entry.notes}</Text>
                  ) : (
                    <Text style={{ color: palette.textMuted, fontSize: 13 }}>Sem observações.</Text>
                  )}
                </View>
              ))
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
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 10 }}>
                  {groupChat.map((message) => {
                    const isMine = message.authorId === currentUserId || message.authorName === currentUserName;
                    const initials = (message.authorName || "U")
                      .split(" ")
                      .map((part) => part.charAt(0))
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <View
                        key={message.id}
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
                            {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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
                onPress={() => navigation.dispatch(drawerOpen ? DrawerActions.closeDrawer() : DrawerActions.openDrawer())}
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

      <Modal visible={createVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: palette.modalSurface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, borderWidth: 1, borderColor: palette.cardBorder }}>
            <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: 12 }}>Novo grupo</Text>
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
            <Button mode="contained" buttonColor={palette.recycleAccent} textColor={palette.panel} onPress={handleCreateGroup} disabled={!groupName.trim()} style={{ marginBottom: 10 }}>
              Criar grupo
            </Button>
            <Button mode="text" onPress={() => setCreateVisible(false)}>Cancelar</Button>
          </View>
        </View>
      </Modal>

      <Modal visible={manageMenuVisible} animationType="slide" onRequestClose={closeManageAction}>
        <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top + 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 1, fontWeight: "700" }}>CONFIGURAÇÃO</Text>
              <Text style={{ color: palette.textPrimary, fontSize: 28, fontWeight: "900", marginTop: 2 }}>Gerenciar grupo</Text>
            </View>
            <TouchableOpacity
              onPress={closeManageAction}
              style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={20} color={palette.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: palette.textSecondary, fontSize: 12, marginBottom: 14, paddingHorizontal: 20 }}>
            Escolha o que deseja ajustar.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}>
            <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panelAlt }}>
              <TouchableOpacity
                onPress={() => setManageAction((current) => (current === "rename" ? null : "rename"))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 16,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Renomear grupo</Text>
                </View>
                <Ionicons name={manageAction === "rename" ? "chevron-up" : "create-outline"} size={20} color={palette.textSecondary} />
              </TouchableOpacity>

              {manageAction === "rename" ? (
                <View style={{ backgroundColor: palette.panel, borderTopWidth: 1, borderTopColor: palette.cardBorder, padding: 14 }}>
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
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button
                      mode="contained"
                      contentStyle={{ height: 46, paddingHorizontal: 8 }}
                      buttonColor={palette.panelAlt}
                      textColor={palette.textMuted}
                      onPress={async () => {
                        if (renameDisabled) {
                          Alert.alert("Preencha o nome", "Informe um nome válido e diferente do atual.");
                          return;
                        }
                        await handleRenameGroup();
                        setManageAction(null);
                        setManageMenuVisible(false);
                      }}
                      style={{ borderRadius: 14, borderWidth: 0.2, borderColor: palette.textMuted, justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 0 }}
                    >
                      Salvar
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.panelAlt }}>
              <TouchableOpacity
                onPress={() => setManageAction((current) => (current === "addMember" ? null : "addMember"))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 16,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: palette.textPrimary, fontWeight: "700" }}>Adicionar pessoas</Text>
                  <Text style={{ color: palette.textSecondary, fontSize: 12, marginBottom: 10 }}>Informe um e-mail cadastrado no app.</Text>
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
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button
                      mode="contained"
                      contentStyle={{ height: 46, paddingHorizontal: 8 }}
                      buttonColor={palette.panelAlt}
                      textColor={palette.textMuted}
                      onPress={async () => {
                        if (addDisabled) {
                          Alert.alert("Preencha o e-mail", "Informe o e-mail da pessoa a ser adicionada.");
                          return;
                        }
                        await handleAddMember();
                        setManageAction(null);
                        setManageMenuVisible(false);
                      }}
                      style={{ borderRadius: 14, borderWidth: 0.2, borderColor: palette.textMuted, justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 0 }}
                    >
                      Salvar
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: palette.dangerBorder, backgroundColor: palette.dangerPanel }}>
              <TouchableOpacity
                onPress={() => setManageAction((current) => (current === "critical" ? null : "critical"))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 16,
                }}
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
                              await deactivateGroup(selectedGroup.id);
                              setSelectedGroupId(null);
                              setManageAction(null);
                              setManageMenuVisible(false);
                              Alert.alert("Grupo desativado", "O grupo foi removido da lista ativa.");
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
                            await activateGroup(selectedGroup.id);
                            await setActiveGroup(selectedGroup.id);
                            setManageAction(null);
                            setManageMenuVisible(false);
                            Alert.alert("Grupo reativado", "Agora você já pode entrar no grupo.");
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
                            await deleteGroup(selectedGroup?.id || "");
                            setSelectedGroupId(null);
                            setManageAction(null);
                            setManageMenuVisible(false);
                            Alert.alert("Grupo excluído", "O grupo foi removido com sucesso.");
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

                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
