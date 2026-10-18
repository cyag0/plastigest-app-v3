import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { activeFilter } from "@/constants/listFilters";
import PermissionGate from "@/components/App/PermissionGate";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";

/** Total de permisos del rol (el índice manda solo los primeros 10 nombres). */
function permissionsCount(item: any): number {
  return item.permissions_count ?? item.permissions?.length ?? 0;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export default function RolesListScreen() {
  const navigation = useRouter();

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
      // Quienes lo tienen (directo o en alguna sucursal): a ellos les quita
      // los permisos apagar el rol.
      title: "Personas",
      key: "users_count",
      width: 100,
      align: "center",
      render: (_, item) => item.users_count ?? "—",
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
        // Nombre, descripción, cuántos permisos tiene y cuántas personas lo
        // tienen. Antes iban hasta 8 chips con el nombre interno del permiso
        // ("Leer Usuarios"), que ya no es como los llama el editor de roles.
        renderCard={({ item }) => ({
          title: item.name,
          description: (
            <React.Fragment>
              {!!item.description && <AppList.Description>{item.description}</AppList.Description>}
              <AppList.Description>
                {[
                  plural(permissionsCount(item), "permiso", "permisos"),
                  item.users_count != null ? plural(item.users_count, "persona", "personas") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </AppList.Description>
            </React.Fragment>
          ),
          right: <ActiveBadge active={!!item.is_active} />,
        })}
        onItemPress={(entity) => {
          navigation.push("/(tabs)/home/roles/" + entity.id);
        }}
        onPressCreate={() => {
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
    </PermissionGate>
  );
}
