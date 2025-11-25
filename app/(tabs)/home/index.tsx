import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Badge,
  Card,
  Chip,
  IconButton,
  Text,
  TouchableRipple,
} from "react-native-paper";

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

interface RecentMovement {
  id: number;
  movement_type: string;
  movement_type_label: string;
  movement_reason: string;
  movement_reason_label: string;
  movement_date: string;
  total_cost: number;
  status: string;
  location: any;
  products_count: number;
  generated_money: boolean;
  money_type: string;
  document_number: string | null;
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const auth = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const movementsResponse = await Services.reports.recentMovements({
        limit: 20,
      });
      setRecentMovements(movementsResponse.data.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredMovements = recentMovements.filter((movement) => {
    if (filter === "all") return true;
    return movement.movement_type === filter;
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry":
        return { name: "arrow-down-circle", color: palette.success };
      case "exit":
        return { name: "arrow-up-circle", color: palette.error };
      case "transfer":
        return { name: "swap-horizontal-circle", color: palette.info };
      case "production":
        return { name: "factory", color: palette.accent };
      case "adjustment":
        return { name: "clipboard-edit", color: palette.secondary };
      default:
        return { name: "help-circle", color: palette.textSecondary };
    }
  };

  const getMoneyBadge = (moneyType: string) => {
    switch (moneyType) {
      case "income":
        return { label: "Ingreso", color: palette.success };
      case "expense":
        return { label: "Egreso", color: palette.error };
      default:
        return { label: "Neutro", color: palette.textSecondary };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: 16, color: palette.textSecondary }}>
          Cargando operaciones...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginLeft: 12 }}>
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
              Todos ({recentMovements.length})
            </Chip>
            <Chip
              selected={filter === "entry"}
              onPress={() => setFilter("entry")}
              mode={filter === "entry" ? "flat" : "outlined"}
              selectedColor={palette.success}
              icon="arrow-down-circle"
            >
              Entradas (
              {
                recentMovements.filter((m) => m.movement_type === "entry")
                  .length
              }
              )
            </Chip>
            <Chip
              selected={filter === "exit"}
              onPress={() => setFilter("exit")}
              mode={filter === "exit" ? "flat" : "outlined"}
              selectedColor={palette.error}
              icon="arrow-up-circle"
            >
              Salidas (
              {recentMovements.filter((m) => m.movement_type === "exit").length}
              )
            </Chip>
            <Chip
              selected={filter === "production"}
              onPress={() => setFilter("production")}
              mode={filter === "production" ? "flat" : "outlined"}
              selectedColor={palette.accent}
              icon="factory"
            >
              Producción (
              {
                recentMovements.filter((m) => m.movement_type === "production")
                  .length
              }
              )
            </Chip>
            <Chip
              selected={filter === "adjustment"}
              onPress={() => setFilter("adjustment")}
              mode={filter === "adjustment" ? "flat" : "outlined"}
              selectedColor={palette.secondary}
              icon="clipboard-edit"
            >
              Ajustes (
              {
                recentMovements.filter((m) => m.movement_type === "adjustment")
                  .length
              }
              )
            </Chip>
          </ScrollView>
        </View>

        {/* Recent Movements List */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {filteredMovements.length === 0 ? (
            <Card style={{ backgroundColor: palette.card, padding: 24 }}>
              <View style={{ alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="inbox-outline"
                  size={48}
                  color={palette.textSecondary}
                />
                <Text
                  variant="bodyLarge"
                  style={{
                    color: palette.textSecondary,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  No hay movimientos{filter !== "all" ? " de este tipo" : ""}
                </Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredMovements.map((movement) => {
                const icon = getMovementIcon(movement.movement_type);
                const moneyBadge = getMoneyBadge(movement.money_type);

                return (
                  <Card
                    key={movement.id}
                    style={{ backgroundColor: palette.card }}
                  >
                    <TouchableRipple
                      onPress={() => {
                        // Navigate to movement detail
                        console.log("View movement:", movement.id);
                      }}
                    >
                      <View style={styles.movementItem}>
                        {/* Icon */}
                        <View
                          style={[
                            styles.movementIcon,
                            { backgroundColor: icon.color + "20" },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={icon.name as any}
                            size={24}
                            color={icon.color}
                          />
                        </View>

                        {/* Content */}
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              variant="titleSmall"
                              style={{ fontWeight: "bold", flex: 1 }}
                            >
                              {movement.movement_reason_label}
                            </Text>
                            {movement.generated_money &&
                              movement.total_cost > 0 && (
                                <Badge
                                  size={20}
                                  style={{
                                    backgroundColor: moneyBadge.color,
                                  }}
                                >
                                  {moneyBadge.label}
                                </Badge>
                              )}
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <Text
                              variant="bodySmall"
                              style={{ color: palette.textSecondary }}
                            >
                              📅{" "}
                              {new Date(
                                movement.movement_date
                              ).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={{ color: palette.textSecondary }}
                            >
                              📦 {movement.products_count}{" "}
                              {movement.products_count === 1
                                ? "producto"
                                : "productos"}
                            </Text>
                          </View>

                          {movement.generated_money &&
                            movement.total_cost > 0 && (
                              <Text
                                variant="labelLarge"
                                style={{
                                  color: moneyBadge.color,
                                  fontWeight: "bold",
                                  marginTop: 4,
                                }}
                              >
                                $
                                {movement.total_cost.toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Text>
                            )}
                        </View>

                        {/* Arrow */}
                        <IconButton
                          icon="chevron-right"
                          size={20}
                          iconColor={palette.textSecondary}
                        />
                      </View>
                    </TouchableRipple>
                  </Card>
                );
              })}
            </View>
          )}
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
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
  movementItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  movementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});
