import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Avatar, Chip } from "react-native-paper";

export default function UsersIndexScreen() {
  const route = "/(tabs)/administration/users";

  return (
    <AppList
      title="Usuarios del Sistema"
      service={Services.admin.users}
      renderCard={({ item }) => ({
        title: item.name,
        description: item.email,
        left: (
          <Avatar.Text
            size={50}
            label={item.name?.charAt(0)?.toUpperCase() || "U"}
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
            {item.is_active ? "Activo" : "Inactivo"}
          </Chip>
        ),
      })}
      menu={generateCrudMenu(route)}
      searchPlaceholder="Buscar usuarios..."
      emptyMessage="No hay usuarios registrados"
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: palette.primary,
  },
});
