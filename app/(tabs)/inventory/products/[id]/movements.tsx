import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { Button, Chip, Icon, Text } from "react-native-paper";

type Movement = App.Entities.StockMovement;
type Response = App.Entities.StockMovementsResponse;

/**
 * Trazabilidad de un producto: qué le ha pasado a sus existencias y por qué.
 *
 * Cada renglón muestra el saldo antes y después del movimiento, que es lo que
 * permite auditar una diferencia sin recalcular nada: si dos renglones
 * consecutivos no encadenan, el problema está entre ellos.
 */
export default function ProductMovements() {
  const params = useLocalSearchParams<{ id: string }>();
  const productId = parseInt(params.id, 10);
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useStyles();

  const [payload, setPayload] = useState<Response | null>(null);
  const [items, setItems] = useState<Movement[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** null = sin filtrar. Guarda el `reason` que llegó del backend. */
  const [reason, setReason] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number, selectedReason: string | null) => {
      const res = await Services.products.movements(productId, {
        page: targetPage,
        per_page: 25,
        ...(selectedReason ? { reason: selectedReason } : {}),
      });

      setPayload(res);
      // La primera página reemplaza; las siguientes se acumulan.
      setItems((prev) =>
        targetPage === 1 ? res.data : [...prev, ...res.data],
      );
      setPage(targetPage);
    },
    [productId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load(1, reason);
      } catch (e: any) {
        if (!cancelled) {
          alerts.error("No se pudo cargar el historial: " + e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, reason]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(1, reason);
    } catch (e: any) {
      alerts.error("No se pudo actualizar: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    const meta = payload?.meta;
    if (!meta || loadingMore || page >= meta.last_page) return;

    setLoadingMore(true);
    try {
      await load(page + 1, reason);
    } catch (e: any) {
      alerts.error("No se pudieron cargar más movimientos: " + e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const unit = payload?.product.unit_abbreviation || payload?.product.unit || "";

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View>
          <View style={styles.summary}>
            <Text variant="titleMedium" style={styles.productName}>
              {payload?.product.name}
            </Text>
            {!!payload?.product.code && (
              <Text variant="bodySmall" style={styles.muted}>
                {payload.product.code}
              </Text>
            )}
            <View style={styles.stockRow}>
              <Text variant="bodySmall" style={styles.muted}>
                Existencia actual
              </Text>
              <Text variant="headlineSmall" style={styles.stockValue}>
                {payload?.product.current_stock ?? 0} {unit}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.muted}>
              {payload?.meta.total ?? 0} movimiento
              {(payload?.meta.total ?? 0) === 1 ? "" : "s"} registrado
              {(payload?.meta.total ?? 0) === 1 ? "" : "s"}
            </Text>
          </View>

          {/* Filtro por motivo. Sólo se ofrecen los motivos que el backend conoce. */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
            data={[
              { value: "", label: "Todos" },
              ...(payload?.filters.reasons ?? []),
            ]}
            keyExtractor={(f) => f.value || "all"}
            renderItem={({ item: f }) => {
              const selected = (reason ?? "") === f.value;
              return (
                <Chip
                  selected={selected}
                  onPress={() => setReason(f.value || null)}
                  style={styles.chip}
                  compact
                >
                  {f.label}
                </Chip>
              );
            }}
          />
        </View>
      }
      renderItem={({ item }) => <MovementRow item={item} unit={unit} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon source="history" size={40} color={colors.textMuted} />
          <Text variant="bodyMedium" style={styles.emptyText}>
            {reason
              ? "No hay movimientos de ese tipo."
              : "Este producto todavía no registra movimientos de inventario."}
          </Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={styles.footer} color={colors.primary} />
        ) : payload && page < payload.meta.last_page ? (
          <Button onPress={onEndReached} style={styles.footer}>
            Cargar más
          </Button>
        ) : null
      }
    />
  );
}

function MovementRow({ item, unit }: { item: Movement; unit: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isIn = item.direction === "in";
  const color = isIn ? colors.success : colors.error;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: color + "1A" }]}>
        <Icon source={item.reason_icon} size={20} color={color} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text variant="bodyMedium" style={styles.reason}>
            {item.reason_label}
          </Text>
          <Text variant="bodyMedium" style={[styles.delta, { color }]}>
            {isIn ? "+" : "−"}
            {item.quantity} {unit}
          </Text>
        </View>

        {/* El encadenado de saldos es lo que hace auditable el historial. */}
        <Text variant="bodySmall" style={styles.muted}>
          {item.previous_stock} → {item.new_stock} {unit}
        </Text>

        <Text variant="bodySmall" style={styles.muted}>
          {formatDate(item.date)}
          {item.location ? ` · ${item.location.name}` : ""}
          {item.counterpart_location
            ? ` ${isIn ? "←" : "→"} ${item.counterpart_location.name}`
            : ""}
        </Text>

        {(item.user || item.notes) && (
          <Text variant="bodySmall" style={styles.muted}>
            {item.user?.name}
            {item.user && item.notes ? " · " : ""}
            {item.notes}
          </Text>
        )}
      </View>
    </View>
  );
}

function formatDate(value: string) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const useStyles = () =>
  useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    summary: {
      padding: tokens.spacing[4],
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    productName: { fontWeight: "700", color: colors.text },
    stockRow: { marginTop: tokens.spacing[2] },
    stockValue: { fontWeight: "700", color: colors.primary },
    muted: { color: colors.textSecondary },
    filters: {
      paddingVertical: tokens.spacing[2],
      paddingHorizontal: tokens.spacing[2],
      backgroundColor: colors.surface,
    },
    chip: { marginRight: tokens.spacing[1] },
    row: {
      flexDirection: "row",
      gap: tokens.spacing[2],
      padding: tokens.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: { flex: 1, gap: 2 },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    reason: { fontWeight: "600", color: colors.text, flexShrink: 1 },
    delta: { fontWeight: "700" },
    empty: { alignItems: "center", padding: tokens.spacing[7], gap: tokens.spacing[2] },
    emptyText: { color: colors.textSecondary, textAlign: "center" },
    footer: { paddingVertical: tokens.spacing[4] },
  }));
