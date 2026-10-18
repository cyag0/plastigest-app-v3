import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { FilterConfig } from "@/components/App/AppList/AppListFilter";
import { useCan } from "@/hooks/useCan";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

// Los mismos tipos que el formulario de la unidad.
const FILTERS: FilterConfig[] = [
  {
    type: "simple",
    name: "unit_type",
    label: "Tipo",
    options: [
      { label: "Todos", value: "" },
      { label: "Cantidad (piezas)", value: "quantity" },
      { label: "Peso (kg, g)", value: "mass" },
      { label: "Volumen (L, ml)", value: "volume" },
      { label: "Longitud (m, cm)", value: "length" },
    ],
  },
  {
    // Las del sistema las comparten todas las empresas; las otras las creó
    // la empresa.
    type: "simple",
    name: "origin",
    label: "Origen",
    options: [
      { label: "Todas", value: "" },
      { label: "Del sistema", value: "system" },
      { label: "De la empresa", value: "company" },
    ],
  },
];

export default function UnidadesScreen() {
  const router = useRouter();
  const { company, availableCompanies, selectCompany, isLoading } =
    useSelectedCompany();
  const { can } = useCan();
  // Las unidades globales (sin empresa) las comparten todas las empresas:
  // solo un administrador del sistema las modifica (el backend responde 403).
  const canChangeUnit = (item: any) => item.company_id != null || can("system_admin");

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

  const columns: AppListColumn<any>[] = [
    { title: "Nombre", dataIndex: "name", key: "name", width: 200 },
    { title: "Abreviatura", dataIndex: "abbreviation", key: "abbreviation", width: 120, align: "center" },
    // "1 dz = 12 pz" o "Unidad base" (el backend lo arma).
    { title: "Equivalencia", dataIndex: "description", key: "description", width: 260 },
  ];

  return (
    <View style={{ flex: 1 }}>
      <AppList
        title="Unidades"
        service={Services.home.unidades}
        permissionPrefix="units"
        columns={columns}
        filters={FILTERS}
        renderCard={({ item }) => ({
          title: `${item.name} (${item.abbreviation})`,
          description: item.description,
          bottom: [
            {
              label: "Creado el",
              value: formatDate(item.created_at),
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
        onItemPress={(item) => {
          router.push(`/(tabs)/administration/unidades/${item.id}` as any);
        }}
        menu={{
          onEdit(item) {
            router.push(
              `/(tabs)/administration/unidades/${item.id}/edit` as any,
            );
          },
          showEdit: canChangeUnit,
          showDelete: canChangeUnit,
        }}
      />
    </View>
  );
}
