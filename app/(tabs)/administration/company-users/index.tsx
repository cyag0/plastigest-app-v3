import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { Avatar, Chip } from "react-native-paper";

export default function CompanyUsersIndexScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);
  const columns: AppListColumn<any>[] = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 220,
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
          {item.is_active ? "Activo" : "Inactivo"}
        </Chip>
      ),
    },
  ];

  return (
    <>
      <AppList
        title="Usuarios de la Empresa"
        service={Services.admin.users}
        defaultFilters={{
          by_company: true,
        }}
        columns={columns}
        renderCard={({ item }) => ({
          title: item.name,
          description: item.email,
          left: item.avatar ? (
            <Avatar.Image
              size={50}
              source={
                item.avatar &&
                item.avatar.length > 0 &&
                item.avatar[0]?.uri && { uri: item.avatar[0].uri }
              }
              style={{ backgroundColor: palette.primary }}
            />
          ) : (
            <Avatar.Text
              size={50}
              label={(item.name || "T").charAt(0).toUpperCase()}
              style={{ backgroundColor: palette.surface }}
            />
          ),
          right: (
            <Chip
              style={{
                backgroundColor: item.is_active
                  ? palette.success
                  : palette.error,
              }}
              textStyle={{ color: "white" }}
              compact
              
            >
              {item.is_active ? "Activo" : "Inactivo"}
            </Chip>
          ),
        })}
        menu={{
          onEdit: (entity) => {
            navigation.push(
              `/(tabs)/administration/company-users/form?id=${entity.id}` as any,
            );
          },
          onShow(item) {
            navigation.push(
              `/(tabs)/administration/company-users/${item.id}` as any,
            );
          },
        }}
        onItemPress={(entity) => {
          navigation.push(
            `/(tabs)/administration/company-users/${entity.id}` as any,
          );
        }}
        onPressCreate={() => {
          navigation.push("/(tabs)/administration/company-users/form" as any);
        }}
        searchPlaceholder="Buscar usuarios..."
        emptyMessage="No hay usuarios en esta empresa"
      />

      <FilterModal ref={modalRef} />
    </>
  );
}
