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
          <Avatar.Image
            size={50}
            source={
              item.avatar && item.avatar.length > 0
                ? { uri: item.avatar[0].uri }
                : require("@/assets/images/icon.png")
            }
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
        bottom: [
          {
            label: "Compañías:",
            value: (item.companies && item.companies.length) || 0,
          },
        ],
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
