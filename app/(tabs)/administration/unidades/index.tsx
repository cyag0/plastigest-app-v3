import AppList from "@/components/App/AppList/AppList";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function UnidadesScreen() {
  const router = useRouter();
  const { company, availableCompanies, selectCompany, isLoading } =
    useSelectedCompany();

  useEffect(() => {
    // Seleccionar automáticamente la primera empresa si no hay ninguna seleccionada
    if (
      !company &&
      availableCompanies &&
      availableCompanies.length > 0 &&
      !isLoading
    ) {
      selectCompany(availableCompanies[0]);
    }
  }, [company, availableCompanies, isLoading]);

  if (isLoading || !company) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
          title: `${item.name} (${item.abbreviation})`,
          description: item.description,
          bottom: [
            {
              label: "Creado el",
              value: new Date(item.created_at).toLocaleDateString(),
            },
          ],
        })}
        onPressCreate={() =>
          router.push("/(tabs)/administration/unidades/form" as any)
        }
        detailRoute={(item) =>
          `/(tabs)/administration/unidades/${item.id}` as any
        }
        searchPlaceholder="Buscar unidades..."
        defaultFilters={{ company_id: company.id }}
        onItemPress={(item) => {
          router.push(`/(tabs)/administration/unidades/${item.id}` as any);
        }}
        menu={{
          onEdit(item) {
            router.push(
              `/(tabs)/administration/unidades/${item.id}/edit` as any
            );
          },
        }}
      />
    </View>
  );
}
