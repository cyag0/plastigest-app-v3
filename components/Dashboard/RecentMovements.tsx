import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Card, Chip, Text, TouchableRipple } from "react-native-paper";

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

type FilterType = "all" | "entry" | "exit" | "production" | "adjustment";

interface RecentMovementsProps {
  filter: FilterType;
}

export default function RecentMovements({ filter }: RecentMovementsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const response = await Services.reports.recentMovements({
        scope: "location",
        limit: 20,
      });

      setRecentMovements(response.data.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
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
        return { name: "arrow-up-circle", color: palette.red };
      case "transfer":
        return { name: "swap-horizontal-circle", color: palette.blue };
      case "production":
        return { name: "factory", color: palette.success };
      case "adjustment":
        return { name: "clipboard-edit", color: palette.red };
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

  const translateReason = (reason: string) => {
    const translations: Record<string, string> = {
      Loss: "Pérdida",
      Shrinkage: "Merma",
      Adjustment: "Ajuste",
      Purchase: "Compra",
      Sale: "Venta",
      Transfer: "Transferencia",
      Production: "Producción",
      Return: "Devolución",
      Damage: "Daño",
      Expiry: "Vencimiento",
      Theft: "Robo",
      Donation: "Donación",
      Sample: "Muestra",
      "Internal Use": "Uso Interno",
      Correction: "Corrección",
      Count: "Conteo",
      "Initial Stock": "Stock Inicial",
    };
    return translations[reason] || reason;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={palette.primary} />
        <Text style={styles.loadingText}>Cargando movimientos...</Text>
      </View>
    );
  }

  if (filteredMovements.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="inbox-outline"
          size={48}
          color={palette.textSecondary}
        />
        <Text style={styles.emptyText}>No hay movimientos recientes</Text>
      </View>
    );
  }

  return (
    <View>
      {filteredMovements.map((movement) => {
        const icon = getMovementIcon(movement.movement_type);
        const moneyBadge = movement.generated_money
          ? getMoneyBadge(movement.money_type)
          : null;

        return (
          <TouchableRipple
            key={movement.id}
            onPress={() => {
              // Navegar al detalle del movimiento según el tipo
              const routes: Record<string, string> = {
                entry: "/(tabs)/home/purchases",
                exit: "/(tabs)/home/sales",
                production: "/(tabs)/home/production",
                adjustment: "/(tabs)/home/adjustment",
              };
              const route = routes[movement.movement_type];
              if (route) {
                router.push(`${route}/${movement.id}` as any);
              }
            }}
            style={styles.movementCard}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                {/* Icono */}
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: icon.color + "15" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={icon.name as any}
                    size={20}
                    color={icon.color}
                  />
                </View>

                {/* Información principal */}
                <View style={styles.mainInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.movementType} numberOfLines={1}>
                      {translateReason(movement.movement_reason_label)}
                    </Text>
                    {moneyBadge && (
                      <Chip
                        compact
                        style={[
                          styles.moneyChip,
                          { backgroundColor: moneyBadge.color + "20" },
                        ]}
                        textStyle={[
                          styles.moneyChipText,
                          { color: moneyBadge.color },
                        ]}
                      >
                        {moneyBadge.label}
                      </Chip>
                    )}
                  </View>

                  <View style={styles.detailsRow}>
                    <Text style={styles.detailText}>
                      {new Date(movement.movement_date).toLocaleDateString(
                        "es-ES",
                        {
                          day: "2-digit",
                          month: "short",
                        }
                      )}
                    </Text>
                    <Text style={styles.detailDot}>•</Text>
                    <Text style={styles.detailText}>
                      {movement.products_count}{" "}
                      {movement.products_count === 1 ? "producto" : "productos"}
                    </Text>
                    {movement.document_number && (
                      <>
                        <Text style={styles.detailDot}>•</Text>
                        <Text style={styles.detailText}>
                          {movement.document_number}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Costo */}
                <View style={styles.costContainer}>
                  <Text style={styles.costValue}>
                    $
                    {parseFloat(movement.total_cost?.toString() || "0").toFixed(
                      2
                    )}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    color: palette.textSecondary,
    fontSize: 13,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    color: palette.textSecondary,
    fontSize: 14,
  },
  movementCard: {
    marginBottom: 8,
    borderRadius: 8,
  },
  card: {
    backgroundColor: palette.card,
    elevation: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingVertical: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  mainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  movementType: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    flex: 1,
  },
  moneyChip: {
    height: 20,
  },
  moneyChipText: {
    fontSize: 10,
    fontWeight: "600",
    marginVertical: 0,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: palette.textSecondary,
  },
  detailDot: {
    fontSize: 11,
    color: palette.textSecondary,
  },
  costContainer: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  costValue: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.primary,
  },
});
