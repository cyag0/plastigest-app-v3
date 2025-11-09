import AppList from "@/components/App/AppList/AppList";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";

export default function ClientesScreen() {
  const router = useRouter();
  const { company, availableCompanies, selectCompany, isLoading } = useSelectedCompany();

  useEffect(() => {
    // Seleccionar automáticamente la primera empresa si no hay ninguna seleccionada
    if (!company && availableCompanies && availableCompanies.length > 0 && !isLoading) {
      console.log("Auto-selecting first company:", availableCompanies[0]);
      selectCompany(availableCompanies[0]);
    }
  }, [company, availableCompanies, isLoading]);

  if (isLoading || !company) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
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
          description: `${item.rfc ? item.rfc + ' - ' : ''}${item.phone || item.email || ''}`,
        })}
        onPressCreate={() => router.push("/(tabs)/home/clientes/form" as any)}
        detailRoute={(item) => `/(tabs)/home/clientes/${item.id}` as any}
        searchPlaceholder="Buscar clientes..."
        defaultFilters={{ company_id: company.id }}
      />
    </View>
  );
}
