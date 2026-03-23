import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { Avatar, Chip, Icon, IconButton, Text } from "react-native-paper";

export default function WorkerIndexScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);
  const { location } = useAuth();

  if (!location) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <IconButton icon="alert-circle" size={64} iconColor={palette.warning} />
        <Text
          variant="titleLarge"
          style={{ fontWeight: "700", marginTop: 16, marginBottom: 8 }}
        >
          Sin Sucursal Seleccionada
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: palette.textSecondary, textAlign: "center" }}
        >
          Debes seleccionar una sucursal primero
        </Text>
      </View>
    );
  }

  return (
    <>
      <AppList
        title={`Trabajadores - ${location.name}`}
        service={Services.admin.workers}
        defaultFilters={{
          location_id: location.id,
        }}
        renderCard={({ item }) => ({
          title: item.user?.name || item.user_name || "Sin nombre",
          description: `${item.position || "Sin cargo"} • ${
            item.department || "Sin departamento"
          }`,
          left: (
            <Avatar.Text
              size={50}
              label={(item.user?.name || item.user_name || "T")
                .charAt(0)
                .toUpperCase()}
              style={{ backgroundColor: palette.accent }}
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
          bottomText: (
            <View style={{ gap: 4, marginTop: 4 }}>
              {item.role && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon
                    source="shield-account"
                    size={14}
                    color={palette.primary}
                  />
                  <Text variant="bodySmall" style={{ color: palette.text }}>
                    {item.role.name}
                  </Text>
                </View>
              )}
              {item.locations && item.locations.length > 0 && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon source="map-marker" size={14} color={palette.info} />
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.textSecondary }}
                  >
                    {item.locations.length}{" "}
                    {item.locations.length === 1 ? "sucursal" : "sucursales"}
                  </Text>
                </View>
              )}
            </View>
          ),
        })}
        onItemPress={(entity) => {
          navigation.push(`/(tabs)/administration/workers/${entity.id}` as any);
        }}
        onPressCreate={() => {
          navigation.push("/(tabs)/administration/workers/form" as any);
        }}
        menu={{
          onEdit(item) {
            navigation.push(
              `/(tabs)/administration/workers/${item.id}/edit` as any
            );
          },
        }}
        searchPlaceholder="Buscar trabajadores..."
        emptyMessage="No hay trabajadores registrados"
      />

      <FilterModal ref={modalRef} />
    </>
  );
}
