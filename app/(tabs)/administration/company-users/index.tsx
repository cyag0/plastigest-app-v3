import AppList from "@/components/App/AppList/AppList";
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
  const { selectedCompany } = useAuth();

  return (
    <>
      <AppList
        title="Usuarios de la Empresa"
        service={Services.admin.users}
        defaultFilters={{
          by_company: true,
        }}
        renderCard={({ item }) => ({
          title: item.name,
          description: item.email,
          left: (
            <Avatar.Image
              size={50}
              source={
                item.avatar && item.avatar.length > 0 && item.avatar[0]?.uri
                  ? { uri: item.avatar[0].uri }
                  : require("@/assets/images/icon.png")
              }
              style={{ backgroundColor: palette.primary }}
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
              `/(tabs)/administration/company-users/form?id=${entity.id}` as any
            );
          },
          onShow(item) {
            navigation.push(
              `/(tabs)/administration/company-users/${item.id}` as any
            );
          },
        }}
        onItemPress={(entity) => {
          navigation.push(
            `/(tabs)/administration/company-users/${entity.id}` as any
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
