import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import palette from "@/constants/palette";
import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
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
  const { location } = useAuth();
  const alerts = useAlerts();
  // Las acciones sin permiso no se ofrecen (permissionPrefix en la lista).
  // Quien no tiene acceso a todas las sucursales (system_admin o
  // locations_all) ve las suyas, pero solo abre, edita o elimina la actual:
  // con las demás el backend responde 404.
  const allLocations = useAllLocationsAccess();
  const isReachable = (item: { id: number | string }) =>
    allLocations || Number(item.id) === location?.id;
  const crudMenu = generateCrudMenu("/(tabs)/administration/locations" as any, {
    showView: isReachable,
    showEdit: isReachable,
    showDelete: isReachable,
  });
  const menu = {
    ...crudMenu,
    onShow: (item: { id: number | string }) => {
      if (isReachable(item)) {
        crudMenu.onShow(item);
      } else {
        alerts.info("Para ver los datos de otra sucursal, cámbiate a ella.");
      }
    },
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
      permissionPrefix="locations"
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
