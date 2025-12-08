import TaskList from "@/components/Dashboard/TaskList";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, TouchableRipple } from "react-native-paper";

interface Operation {
  key: string;
  label: string;
  description: string;
  color: string;
  backgroundColor: string;
  icon: any;
  link: Href;
  iconName: string;
}

const operations: Operation[] = [
  {
    key: "produccion",
    label: "Producción",
    description: "Órdenes de producción",
    color: "#fff",
    backgroundColor: palette.error,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/production",
    iconName: "factory",
  },
  {
    key: "compras",
    label: "Compras",
    description: "Compras a proveedores",
    color: "#fff",
    backgroundColor: palette.primary,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/purchases",
    iconName: "cart",
  },
  {
    key: "ventas",
    label: "Ventas",
    description: "Ventas a clientes",
    color: "#fff",
    backgroundColor: palette.textSecondary,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/sales",
    iconName: "cash-register",
  },
  {
    key: "transferencias",
    label: "Transferencias",
    description: "Entre sucursales",
    color: "#fff",
    backgroundColor: palette.accent,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/transfers",
    iconName: "swap-horizontal",
  },
  {
    key: "ajustes",
    label: "Ajustes",
    description: "Mermas y correcciones",
    color: "#fff",
    backgroundColor: palette.secondary,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/adjustment",
    iconName: "clipboard-edit",
  },
];

type FilterType = "all" | "entry" | "exit" | "production" | "adjustment";

export default function OperationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");

  const auth = useAuth();
  const { selectedLocation } = useSelectedLocation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
            Hola, {auth.user?.name?.split(" ")[0] || ""}
          </Text>
          {/* Company and Location Info */}
          {(auth.selectedCompany || selectedLocation) && (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 8,
                width: "100%",
              }}
            >
              {auth.selectedCompany && (
                <View style={styles.compactInfo}>
                  <MaterialCommunityIcons
                    name="office-building"
                    size={14}
                    color={palette.primary}
                  />
                  <Text variant="bodySmall" numberOfLines={1}>
                    {auth.selectedCompany.name}
                  </Text>
                </View>
              )}
              {selectedLocation && (
                <View style={styles.compactInfo}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={14}
                    color={palette.blue}
                  />
                  <Text variant="bodySmall" numberOfLines={1}>
                    {selectedLocation.name}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions - Horizontal Scroll */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Text
          variant="titleMedium"
          style={{ fontWeight: "bold", marginBottom: 12 }}
        >
          Accesos Rápidos
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {operations.map((operation) => (
            <TouchableRipple
              key={operation.key}
              onPress={() => router.push(operation.link as any)}
              style={[
                styles.operationCard,
                { backgroundColor: operation.backgroundColor },
              ]}
            >
              <View style={{ alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name={operation.iconName as any}
                    size={28}
                    color={operation.color}
                  />
                </View>
                <Text
                  variant="labelLarge"
                  style={{
                    color: operation.color,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {operation.label}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{
                    color: operation.color,
                    opacity: 0.8,
                    textAlign: "center",
                  }}
                >
                  {operation.description}
                </Text>
              </View>
            </TouchableRipple>
          ))}
        </ScrollView>
      </View>

      {/* Tasks Section */}
      <TaskList limit={10} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  compactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactInfoText: {
    color: palette.textSecondary,
    fontWeight: "500",
    fontSize: 12,
    flex: 1,
  },
  operationCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
});
