import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Chip, Text } from "react-native-paper";

export default function CompaniesIndexScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  return (
    <>
      <AppList
        title="Compañías"
        service={Services.admin.companies}
        // Mostrar 10 compañías por página
        renderCard={({ item }) => ({
          title: item.name,
          description: (
            <React.Fragment>
              <AppList.Description style={styles.businessName}>
                {item.business_name}
              </AppList.Description>

              <View style={styles.detailsContainer}>
                {item.rfc && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>RFC:</Text>
                    <Text style={styles.value}>{item.rfc}</Text>
                  </View>
                )}

                {item.email && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{item.email}</Text>
                  </View>
                )}

                {item.phone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Teléfono:</Text>
                    <Text style={styles.value}>{item.phone}</Text>
                  </View>
                )}

                {item.address && (
                  <View style={styles.addressContainer}>
                    <Text style={styles.label}>Dirección:</Text>
                    <Text style={styles.addressText}>{item.address}</Text>
                  </View>
                )}
              </View>
            </React.Fragment>
          ),
          left: (
            <Avatar.Text
              size={50}
              label={item.name?.charAt(0)?.toUpperCase() || "C"}
              style={styles.avatar}
            />
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
                {item.is_active ? "Activa" : "Inactiva"}
              </Chip>
            </React.Fragment>
          ),
        })}
        onItemPress={(entity) => {
          navigation.push("/(tabs)/home/companies/" + entity.id);
        }}
        onPressCreate={() => {
          navigation.push("/(tabs)/home/companies/form");
        }}
        searchPlaceholder="Buscar compañías..."
      />

      <FilterModal ref={modalRef} />
    </>
  );
}

const styles = StyleSheet.create({
  businessName: {
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
  addressContainer: {
    marginTop: 4,
  },
  addressText: {
    fontSize: 11,
    color: palette.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  avatar: {
    backgroundColor: palette.primary,
  },
});
