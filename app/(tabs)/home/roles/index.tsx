import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { Chip } from "react-native-paper";

export default function RolesListScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  return (
    <>
      <AppList
        title="Roles"
        service={Services.admin.roles}
        renderCard={({ item }) => ({
          title: item.name,
          description: (
            <React.Fragment>
              <AppList.Description>{item.description}</AppList.Description>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  maxHeight: 60, // Limita la altura para máximo 2 filas
                  overflow: "hidden",
                }}
              >
                {item.permissions?.slice(0, 8).map((permission: string) => (
                  <Chip
                    key={permission}
                    style={{
                      backgroundColor: palette.surface,
                      marginRight: 4,
                      marginTop: 4,
                      padding: 0,
                    }}
                    textStyle={{
                      color: palette.textSecondary,
                      fontSize: 10,
                      lineHeight: 10,
                    }}
                  >
                    {permission}
                  </Chip>
                ))}
                {item.permissions && item.permissions.length > 8 && (
                  <Chip
                    style={{
                      backgroundColor: palette.primary,
                      marginRight: 4,
                      marginTop: 4,
                      padding: 0,
                    }}
                    textStyle={{
                      color: "white",
                      fontSize: 10,
                      lineHeight: 10,
                      fontWeight: "bold",
                    }}
                  >
                    +{item.permissions.length - 8}
                  </Chip>
                )}
              </View>
            </React.Fragment>
          ),
          right: (
            <React.Fragment>
              <Chip
                style={{
                  backgroundColor: item.is_active
                    ? palette.primary
                    : palette.red,
                  marginBottom: 4,
                }}
                textStyle={{ color: "white" }}
                compact
              >
                {item.is_active ? "Activo" : "Inactivo"}
              </Chip>
            </React.Fragment>
          ),
        })}
        onItemPress={(entity) => {
          navigation.push("/(tabs)/home/roles/" + entity.id);
        }}
        onPressCreate={() => {
          /* console.log("hola");
          modalRef.current?.show(); */

          navigation.push("/(tabs)/home/roles/form");
        }}
        searchPlaceholder="Buscar roles..."
      />

      <FilterModal ref={modalRef} />
    </>
  );
}
