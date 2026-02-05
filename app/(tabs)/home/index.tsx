import TaskList from "@/components/Dashboard/TaskList";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TouchableRipple } from "react-native-paper";
import ReportsScreen from "../reports";

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
    backgroundColor: palette.blue,
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
    link: "/(tabs)/home/transfers-menu",
    iconName: "swap-horizontal",
  },
  {
    key: "ajustes",
    label: "Ajustes",
    description: "Mermas y correcciones",
    color: "#fff",
    backgroundColor: palette.red,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/adjustment",
    iconName: "clipboard-edit",
  },
  {
    key: "gastos",
    label: "Gastos",
    description: "Control de gastos",
    color: "#fff",
    backgroundColor: palette.warning,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/expenses",
    iconName: "cash-minus",
  },
  {
    key: "recordatorios",
    label: "Recordatorios",
    description: "Tareas recurrentes",
    color: "#fff",
    backgroundColor: palette.accent,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/reminders",
    iconName: "bell-ring",
  },
  {
    key: "reportes_ventas",
    label: "Reportes",
    description: "Reportes de ventas",
    color: "#fff",
    backgroundColor: palette.secondary,
    icon: require("../../../assets/images/dashboard/categories.png"),
    link: "/(tabs)/home/sales-reports",
    iconName: "chart-line",
  },
];

type FilterType = "all" | "entry" | "exit" | "production" | "adjustment";

export default function OperationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const isWeb = Platform.OS === "web";
  const screenWidth = Dimensions.get("window").width;
  const isWideScreen = screenWidth >= 1024;

  const auth = useAuth();
  const { selectedLocation } = useSelectedLocation();

  // Vista combinada para web con pantalla ancha
  if (isWeb && isWideScreen) {
    return (
      <View style={styles.webContainer}>
        {/* Columna izquierda - Acciones rápidas y tareas */}
        <View style={styles.leftColumn}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineMedium" style={{ fontWeight: "bold" }}>
                  Hola, {auth.user?.name?.split(" ")[0] || ""}
                </Text>
                {/* Company and Location Info */}
                {(auth.selectedCompany || selectedLocation) && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 12,
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

            {/* Quick Actions Grid */}
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text
                variant="titleLarge"
                style={{ fontWeight: "bold", marginBottom: 16 }}
              >
                Accesos Rápidos
              </Text>
              <View style={styles.operationsGrid}>
                {operations.map((operation) => (
                  <TouchableRipple
                    key={operation.key}
                    onPress={() => router.push(operation.link as any)}
                    style={[
                      styles.operationCardWeb,
                      { backgroundColor: operation.backgroundColor },
                    ]}
                  >
                    <View style={{ alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: "rgba(255,255,255,0.25)",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialCommunityIcons
                          name={operation.iconName as any}
                          size={32}
                          color={operation.color}
                        />
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <Text
                          variant="titleSmall"
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
                            opacity: 0.9,
                            textAlign: "center",
                            marginTop: 4,
                          }}
                        >
                          {operation.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </View>

            {/*  <Divider style={{ marginVertical: 8, marginHorizontal: 16 }} /> */}

            {/* Tasks Section */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <Text
                variant="titleLarge"
                style={{ fontWeight: "bold", marginBottom: 16 }}
              >
                Tareas Pendientes
              </Text>
            </View>
            <TaskList limit={10} />
          </ScrollView>
        </View>

        {/* Columna derecha - Dashboard/Reports */}
        <View style={styles.rightColumn}>
          <ReportsScreen />
        </View>
      </View>
    );
  }

  // Vista mobile original
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
  webContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: palette.background,
  },
  leftColumn: {
    width: 620,
  },
  rightColumn: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
    paddingBottom: 16,
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
  operationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  operationCardWeb: {
    width: "48%",
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "transparent",
  },
});
