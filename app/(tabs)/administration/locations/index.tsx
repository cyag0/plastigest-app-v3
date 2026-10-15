import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Avatar } from "react-native-paper";

export default function LocationsIndexScreen() {
  const navigation = useRouter();
  const { company } = useSelectedCompany();
  const { hasPermission } = useAuth();
  // Sin el permiso el backend responde 403: la acción no se ofrece. Quien no
  // tiene acceso a todas las sucursales (locations_all) solo ve las suyas.
  const crudMenu = generateCrudMenu("/(tabs)/administration/locations" as any, {
    showEdit: hasPermission("locations_update"),
    showDelete: hasPermission("locations_delete"),
  });
  const menu = {
    ...crudMenu,
    onCreate: hasPermission("locations_create") ? crudMenu.onCreate : undefined,
  };

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
        <ActiveBadge active={!!item.is_active} feminine />
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
          <ActiveBadge active={!!item.is_active} feminine />
        ),
        bottom: [
          ...(item.phone ? [{ label: "Tel", value: item.phone }] : []),
          ...(item.email ? [{ label: "Email", value: item.email }] : []),
        ],
      })}
      menu={menu}
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
