import AppList from "@/components/App/AppList/AppList";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function ClientesScreen() {
  const router = useRouter();
  const auth = useAuth();

  const company = auth.selectedCompany;

  if (!company) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Selecciona una empresa para continuar</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppList
        title="Clientes"
        service={Services.home.clientes}
        renderCard={({ item }) => ({
          title: item.name,
          description: `${item.rfc ? item.rfc + " - " : ""}${
            item.phone || item.email || ""
          }`,
        })}
        onPressCreate={() => router.push("/(tabs)/home/clientes/form" as any)}
        //detailRoute={(item) => `/(tabs)/home/clientes/${item.id}` as any}
        searchPlaceholder="Buscar clientes..."
        defaultFilters={{ company_id: company.id }}
        onItemPress={(item) => {
          router.push(`/(tabs)/home/clientes/${item.id}` as any);
        }}
        menu={{
          onEdit(item) {
            router.push(`/(tabs)/home/clientes/${item.id}/edit` as any);
          },
        }}
      />
    </View>
  );
}
