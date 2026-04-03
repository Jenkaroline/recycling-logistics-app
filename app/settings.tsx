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
      Alert.alert("Erro", "Digite o novo e-mail");
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

      setMessage("E-mail atualizado com sucesso!");
      setNewEmail("");
      setCurrentPassword("");
      setEmail(newEmail);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao atualizar e-mail");
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
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#061526" }}>
      <View
        style={{
          backgroundColor: "#0c2740",
          borderRadius: 14,
          padding: 16,
          marginBottom: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#123252",
        }}
      >
        <View
          style={{
            width: 86,
            height: 86,
            borderRadius: 43,
            backgroundColor: "#123252",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <MaterialCommunityIcons name="account" size={48} color="#36a3ff" />
        </View>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 4,
            color: "#eaf4ff",
          }}
        >
          {fullName}
        </Text>
        <Text style={{ color: "#b7cde6", marginBottom: 2 }}>{email}</Text>
        <Text style={{ color: "#9ab6d3" }}>Membro desde {memberSince}</Text>
      </View>

      {activeSection === "menu" ? (
        <View
          style={{
            backgroundColor: "#0c2740",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "#123252",
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveSection("edit")}
            style={{
              backgroundColor: "#123252",
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#eaf4ff", fontSize: 15 }}>
              Editar informações da conta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection("records")}
            style={{
              backgroundColor: "#123252",
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#eaf4ff", fontSize: 15 }}>
              Ver registros
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: "#4a1d27",
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
            backgroundColor: "#0c2740",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "#123252",
          }}
        >
          <Button
            mode="text"
            textColor="#b7cde6"
            onPress={() => setActiveSection("menu")}
            style={{ alignSelf: "flex-start", marginBottom: 8 }}
          >
            Voltar
          </Button>

          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 12,
              color: "#eaf4ff",
            }}
          >
            Alterar e-mail
          </Text>
          <TextInput
            label="Novo e-mail"
            value={newEmail}
            onChangeText={setNewEmail}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#e8f2ff" }}
            keyboardType="email-address"
          />

          <TextInput
            label="Senha atual (para confirmar)"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#e8f2ff" }}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <Button
            mode="contained"
            buttonColor="#36a3ff"
            textColor="#032746"
            onPress={handleUpdateEmail}
            loading={loading}
            disabled={!newEmail.trim() || !currentPassword.trim()}
            style={{ marginBottom: 20 }}
          >
            Atualizar e-mail
          </Button>

          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 12,
              color: "#eaf4ff",
            }}
          >
            Alterar Senha
          </Text>

          <TextInput
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#e8f2ff" }}
          />

          <TextInput
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 12, backgroundColor: "#e8f2ff" }}
          />

          <TextInput
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={{ marginBottom: 16, backgroundColor: "#e8f2ff" }}
          />

          {message ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: "#2dd4bf", fontWeight: "600" }}>
                {message}
              </Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            buttonColor="#36a3ff"
            textColor="#032746"
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
            backgroundColor: "#0c2740",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "#123252",
          }}
        >
          <Button
            mode="text"
            textColor="#b7cde6"
            onPress={() => setActiveSection("menu")}
            style={{ alignSelf: "flex-start", marginBottom: 8 }}
          >
            Voltar
          </Button>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 4,
              color: "#eaf4ff",
            }}
          >
            Todos os registros
          </Text>
          <Text style={{ color: "#b7cde6", marginBottom: 12 }}>
            {sortedEntries.length} registro(s)
          </Text>

          {sortedEntries.length === 0 ? (
            <Text style={{ color: "#b7cde6" }}>Nenhum registro ainda.</Text>
          ) : (
            sortedEntries.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#1e3a57",
                }}
              >
                <View>
                  <Text style={{ color: "#eaf4ff", fontWeight: "500" }}>
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                  <Text style={{ color: "#9ab6d3", fontSize: 12 }}>
                    {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <Text style={{ fontWeight: "700", color: "#eaf4ff" }}>
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
