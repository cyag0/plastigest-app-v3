import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { activeFilter } from "@/constants/listFilters";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
import AppChip from "@/components/App/Chip";
import PermissionGate from "@/components/App/PermissionGate";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";

/** Total de permisos del rol (el índice manda solo los primeros 10 nombres). */
function permissionsCount(item: any): number {
  return item.permissions_count ?? item.permissions?.length ?? 0;
}

export default function RolesListScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  const columns: AppListColumn<any>[] = [
    { title: "Nombre", dataIndex: "name", key: "name", width: 200 },
    {
      title: "Permisos",
      key: "permissions",
      width: 100,
      align: "center",
      // El listado solo trae los primeros 10 permisos; el total viene aparte.
      render: (_, item) => permissionsCount(item),
    },
    {
      title: "Estado",
      key: "is_active",
      width: 100,
      align: "center",
      render: (_, item) => <ActiveBadge active={!!item.is_active} />,
    },
  ];

  return (
    <PermissionGate permission="roles_list">
      <AppList
        title="Roles"
        service={Services.admin.roles}
        columns={columns}
        filters={[activeFilter()]}
        renderCard={({ item }) => ({
          title: item.name,
          description: (
            <React.Fragment>
              <AppList.Description>{item.description}</AppList.Description>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 4,
                  marginTop: 4,
                  maxHeight: 44, // Máximo 2 filas de chips
                  overflow: "hidden",
                }}
              >
                {/* Permisos: etiquetas, no estados */}
                {item.permissions?.slice(0, 8).map((permission: string) => (
                  <AppChip key={permission} size="sm">
                    {permission}
                  </AppChip>
                ))}
                {permissionsCount(item) > 8 && (
                  <AppChip size="sm" variant="primary">
                    +{permissionsCount(item) - 8}
                  </AppChip>
                )}
              </View>
            </React.Fragment>
          ),
          right: <ActiveBadge active={!!item.is_active} />,
        })}
        onItemPress={(entity) => {
          navigation.push("/(tabs)/home/roles/" + entity.id);
        }}
        onPressCreate={() => {
          /* console.log("hola");
          modalRef.current?.show(); */

          navigation.push("/(tabs)/home/roles/form");
        }}
        permissionPrefix="roles"
        // El rol del sistema no se edita ni se elimina (el backend responde 422).
        menu={{
          showEdit: (entity) => !entity.is_system,
          showDelete: (entity) => !entity.is_system,
        }}
        searchPlaceholder="Buscar roles..."
      />

      <FilterModal ref={modalRef} />
    </PermissionGate>
  );
}
