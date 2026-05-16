import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import palette from "@/constants/palette";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Avatar, Chip } from "react-native-paper";

export default function LocationsIndexScreen() {
  const navigation = useRouter();
  const { company } = useSelectedCompany();

  const columns: AppListColumn<any>[] = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      width: 180,
    },
    {
      title: "Dirección",
      dataIndex: "address",
      key: "address",
      width: 220,
    },
    {
      title: "Teléfono",
      dataIndex: "phone",
      key: "phone",
      width: 140,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "Estado",
      key: "is_active",
      width: 100,
      align: "center",
      render: (_, item) => (
        <Chip
          style={{
            backgroundColor: item.is_active ? palette.success : palette.error,
          }}
          textStyle={{ color: "white" }}
          compact
        >
          {item.is_active ? "Activa" : "Inactiva"}
        </Chip>
      ),
    },
  ];

  return (
    <AppList
      title="Sucursales"
      service={Services.admin.locations}
      defaultFilters={{ company_id: company?.id }}
      columns={columns}
      renderCard={({ item }) => ({
        title: item.name,
        description: item.description || item.address,
        left: (
          <Avatar.Text
            size={50}
            label={item.name?.charAt(0)?.toUpperCase() || "S"}
            style={styles.avatar}
          />
        ),
        right: (
          <Chip
            style={{
              backgroundColor: item.is_active ? palette.success : palette.error,
            }}
            textStyle={{ color: "white" }}
            compact
          >
            {item.is_active ? "Activa" : "Inactiva"}
          </Chip>
        ),
        bottom: [
          ...(item.phone ? [{ label: "Tel", value: item.phone }] : []),
          ...(item.email ? [{ label: "Email", value: item.email }] : []),
        ],
      })}
      menu={generateCrudMenu("/(tabs)/administration/locations" as any)}
      searchPlaceholder="Buscar sucursales..."
      emptyMessage="No hay sucursales para mostrar"
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: palette.primary,
  },
});
