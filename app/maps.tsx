import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

type CollectionPoint = {
  id: string;
  name: string;
  address: string;
};

const COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: "1",
    name: "Ecoponto Republica",
    address: "Regiao central - Sao Paulo",
  },
  {
    id: "2",
    name: "Coleta Seletiva Consolacao",
    address: "Consolacao - Sao Paulo",
  },
  {
    id: "3",
    name: "Ecoponto Vila Mariana",
    address: "Vila Mariana - Sao Paulo",
  },
];

export default function MapsScreen() {
  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: "#f5f7fb" }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
        Pontos de coleta
      </Text>
      <Text style={{ color: "#4b5563", marginBottom: 16 }}>
        Lista local de ecopontos sem uso de API paga.
      </Text>

      {COLLECTION_POINTS.map((point) => (
        <View
          key={point.id}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", marginBottom: 4 }}>
            {point.name}
          </Text>
          <Text style={{ color: "#4b5563", marginBottom: 10 }}>
            {point.address}
          </Text>
          <Button mode="text">Ver detalhes</Button>
        </View>
      ))}

      <View style={{ marginTop: 12, marginBottom: 20 }}>
        <Text style={{ color: "#6b7280", fontSize: 13 }}>
          Dica: edite COLLECTION_POINTS para adicionar pontos da sua cidade.
        </Text>
      </View>
    </ScrollView>
  );
}
