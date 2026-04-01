import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { auth } from "../service/firebaseConfig";
import { usePlasticConsumption } from "../src/PlasticConsumptionContext";

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { entries } = usePlasticConsumption();
  const [email, setEmail] = useState(auth.currentUser?.email || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState<
    "menu" | "edit" | "records"
  >("menu");

  const user = auth.currentUser;

  const fullName =
    user?.displayName?.trim() || email.split("@")[0] || "Usuário sem nome";

  const memberSince = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR")
    : "Não disponível";

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [entries],
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: "Perfil",
      headerShown: true,
    });
  }, [navigation]);

  React.useEffect(() => {
    if (route.params?.section === "records") {
      setActiveSection("records");
    }
  }, [route.params?.section]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.navigate("Login");
    } catch {
      Alert.alert("Erro", "Não foi possível sair da conta agora.");
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert("Erro", "Digite o novo email");
      return;
    }
    if (!currentPassword.trim()) {
      Alert.alert("Erro", "Digite sua senha para confirmar");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);

      setMessage("Email atualizado com sucesso!");
      setNewEmail("");
      setCurrentPassword("");
      setEmail(newEmail);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao atualizar email");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Erro", "Digite a nova senha");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem");
      return;
    }
    if (!currentPassword.trim()) {
      Alert.alert("Erro", "Digite sua senha atual para confirmar");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setMessage("Senha atualizada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f5f7fb" }}>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: 16,
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 86,
            height: 86,
            borderRadius: 43,
            backgroundColor: "#ece6f1",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <MaterialCommunityIcons name="account" size={48} color="#5f4b8b" />
        </View>

        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 4 }}>
          {fullName}
        </Text>
        <Text style={{ color: "#6b7280", marginBottom: 2 }}>{email}</Text>
        <Text style={{ color: "#94a3b8" }}>Membro desde {memberSince}</Text>
      </View>

      {activeSection === "menu" ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveSection("edit")}
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 15 }}>
              Editar informações da conta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("records")}
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 15 }}>
              Ver registros
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: "#fee2e2",
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#b91c1c", fontSize: 15 }}>
              Sair
            </Text>
          </TouchableOpacity>
        </View>
      ) : activeSection === "edit" ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <Button
            mode="text"
            onPress={() => setActiveSection("menu")}
            style={{ alignSelf: "flex-start", marginBottom: 8 }}
          >
            Voltar
          </Button>

          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Alterar Email
          </Text>
          <TextInput
            label="Novo email"
            value={newEmail}
            onChangeText={setNewEmail}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#fff" }}
            keyboardType="email-address"
          />

          <TextInput
            label="Senha atual (para confirmar)"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#fff" }}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleUpdateEmail}
            loading={loading}
            disabled={!newEmail.trim() || !currentPassword.trim()}
            style={{ marginBottom: 20 }}
          >
            Atualizar Email
          </Button>

          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Alterar Senha
          </Text>

          <TextInput
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#fff" }}
          />

          <TextInput
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#fff" }}
          />

          <TextInput
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 16, backgroundColor: "#fff" }}
          />

          {message ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: "#16a34a", fontWeight: "600" }}>
                {message}
              </Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={handleUpdatePassword}
            loading={loading}
            disabled={!newPassword.trim() || !currentPassword.trim()}
          >
            Atualizar Senha
          </Button>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <Button
            mode="text"
            onPress={() => setActiveSection("menu")}
            style={{ alignSelf: "flex-start", marginBottom: 8 }}
          >
            Voltar
          </Button>

          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
            Todos os registros
          </Text>
          <Text style={{ color: "#6b7280", marginBottom: 12 }}>
            {sortedEntries.length} registro(s)
          </Text>

          {sortedEntries.length === 0 ? (
            <Text style={{ color: "#6b7280" }}>Nenhum registro ainda.</Text>
          ) : (
            sortedEntries.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e5e7eb",
                }}
              >
                <View>
                  <Text style={{ color: "#111827", fontWeight: "500" }}>
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                    {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <Text style={{ fontWeight: "700", color: "#111827" }}>
                  {item.amountGrams} g
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
