import RecentMovements from "@/components/Dashboard/RecentMovements";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip, Text, TouchableRipple } from "react-native-paper";

interface Operation {
  key: string;
  label: string;
  description: string;
  color: string;
  backgroundColor: string;
  icon: any;
  link: string;
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "bold" }}>
            Bienvenido {auth.user?.name || ""}!
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: palette.textSecondary, marginTop: 4 }}
          >
            Gestiona los movimientos diarios de tu negocio
          </Text>
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

      {/* Filters */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Text
          variant="titleMedium"
          style={{ fontWeight: "bold", marginBottom: 12 }}
        >
          Movimientos Recientes
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            selected={filter === "all"}
            onPress={() => setFilter("all")}
            mode={filter === "all" ? "flat" : "outlined"}
            selectedColor={palette.primary}
          >
            Todos
          </Chip>
          <Chip
            selected={filter === "entry"}
            onPress={() => setFilter("entry")}
            mode={filter === "entry" ? "flat" : "outlined"}
            selectedColor={palette.success}
            icon="arrow-down-circle"
          >
            Entradas
          </Chip>
          <Chip
            selected={filter === "exit"}
            onPress={() => setFilter("exit")}
            mode={filter === "exit" ? "flat" : "outlined"}
            selectedColor={palette.error}
            icon="arrow-up-circle"
          >
            Salidas
          </Chip>
          <Chip
            selected={filter === "production"}
            onPress={() => setFilter("production")}
            mode={filter === "production" ? "flat" : "outlined"}
            selectedColor={palette.accent}
            icon="factory"
          >
            Producción
          </Chip>
          <Chip
            selected={filter === "adjustment"}
            onPress={() => setFilter("adjustment")}
            mode={filter === "adjustment" ? "flat" : "outlined"}
            selectedColor={palette.secondary}
            icon="clipboard-edit"
          >
            Ajustes
          </Chip>
        </ScrollView>
      </View>

      <ScrollView style={{ marginBottom: 8 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <RecentMovements filter={filter} />
        </View>
      </ScrollView>
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
  },
  operationCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
});
