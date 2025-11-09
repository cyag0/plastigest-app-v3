import AppList from "@/components/App/AppList/AppList";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";

export default function UnidadesScreen() {
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
        title="Unidades"
        service={Services.home.unidades}
        renderCard={({ item }) => ({
          title: `${item.name} (${item.symbol})`,
          description: `${item.type} ${item.is_base ? '- Base' : `- ${item.conversion_rate}x`}${item.description ? ' - ' + item.description : ''}`,
        })}
        onPressCreate={() => router.push("/(tabs)/home/unidades/form" as any)}
        detailRoute={(item) => `/(tabs)/home/unidades/${item.id}` as any}
        searchPlaceholder="Buscar unidades..."
        defaultFilters={{ company_id: company.id }}
      />
    </View>
  );
}