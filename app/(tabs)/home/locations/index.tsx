import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Chip, Text } from "react-native-paper";

export default function LocationsIndexScreen() {
  const navigation = useRouter();
  const { company } = useSelectedCompany();

  return (
    <AppList
      title="Sucursales"
      service={Services.admin.locations}
      defaultFilters={{ company_id: company?.id }}
      renderCard={({ item }) => ({
        title: item.name,
        description: (
          <React.Fragment>
            {item.description && (
              <AppList.Description style={styles.description}>
                {item.description}
              </AppList.Description>
            )}

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Dirección:</Text>
                <Text style={styles.value}>{item.address}</Text>
              </View>

              {item.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Teléfono:</Text>
                  <Text style={styles.value}>{item.phone}</Text>
                </View>
              )}

              {item.email && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.value}>{item.email}</Text>
                </View>
              )}

              {item.company_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Compañía:</Text>
                  <Text style={styles.companyName}>{item.company_name}</Text>
                </View>
              )}
            </View>
          </React.Fragment>
        ),
        left: (
          <Avatar.Text
            size={50}
            label={item.name?.charAt(0)?.toUpperCase() || "S"}
            style={styles.avatar}
          />
        ),
        right: (
          <React.Fragment>
            <Chip
              style={{
                backgroundColor: item.is_active
                  ? palette.success
                  : palette.error,
                marginBottom: 4,
              }}
              textStyle={{ color: "white" }}
              compact
            >
              {item.is_active ? "Activa" : "Inactiva"}
            </Chip>
          </React.Fragment>
        ),
      })}
      onItemPress={(location) => {
        navigation.push("/(tabs)/home/locations/" + location.id);
      }}
      onPressCreate={() => {
        navigation.push("/(tabs)/home/locations/form");
      }}
      searchPlaceholder="Buscar sucursales..."
      emptyMessage="No hay sucursales para mostrar"
    />
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primary,
    marginBottom: 8,
  },
  detailsContainer: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.textSecondary,
    marginRight: 6,
  },
  value: {
    fontSize: 12,
    color: palette.text,
    flex: 1,
  },
  companyName: {
    fontSize: 12,
    color: palette.primary,
    fontWeight: "600",
    flex: 1,
  },
  avatar: {
    backgroundColor: palette.primary,
  },
});
