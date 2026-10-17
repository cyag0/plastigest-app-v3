/**
 * Producción: lo que se hizo, día por día.
 *
 * Cada renglón dice qué proceso se corrió, qué entró y qué salió
 * ("257 pz Coco Entero → 150 L Agua de coco · 38 kg Pulpa") y el rendimiento
 * del producto principal. Arriba, las dos cosas que se hacen en la planta:
 * registrar una producción y envasar granel guardado. Los procesos (qué entra
 * y qué sale de cada uno) se configuran desde "Procesos".
 */

import EmptyState from "@/components/App/EmptyState";
import AppListFilterBar, { type FilterConfig } from "@/components/App/AppList/AppListFilter";
import AppBar from "@/components/App/AppBar";
import { ListGroup, ListGroupSkeleton, ListRow, ListSection } from "@/components/App/ListGroup";
import ListSearchbar from "@/components/App/ListSearchbar";
import { dayTitle, meaningfulYields, orderSummary, piecesYield, yieldShort } from "@/components/Production/productionFormat";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Button } from "react-native-paper";

const FILTERS: FilterConfig[] = [
  {
    type: "simple",
    name: "status",
    label: "Estado",
    options: [
      { label: "Todos", value: "all" },
      { label: "Pendientes", value: "draft" },
      { label: "Registradas", value: "completed" },
      { label: "Canceladas", value: "cancelled" },
    ],
  },
  {
    type: "simple",
    name: "kind",
    label: "Tipo",
    options: [
      { label: "Todo", value: "all" },
      { label: "Producción", value: "process" },
      { label: "Envasado", value: "packaging" },
    ],
  },
];

const PER_PAGE = 20;

export default function ProductionIndex() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { can } = useCan();
  const { selectedLocation } = useSelectedLocation();
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const narrow = width < 480;
  const canCreate = can("production_orders_create");
  const canSeeProcesses = can("formulas_list");

  const [orders, setOrders] = useState<App.Entities.ProductionOrder[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const requestId = useRef(0);

  // La búsqueda espera a que se termine de escribir.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (nextPage = 1) => {
      const id = ++requestId.current;
      try {
        if (nextPage > 1) setLoadingMore(true);
        const response: any = await Services.productionOrders.index({
          paginated: true,
          per_page: PER_PAGE,
          page: nextPage,
          search: query || undefined,
          status: status !== "all" ? status : undefined,
          kind: kind !== "all" ? kind : undefined,
          location_id: selectedLocation?.id,
          sort_by: "production_date",
          sort_direction: "desc",
        });
        if (id !== requestId.current) return;
        const rows: App.Entities.ProductionOrder[] = response?.data?.data ?? [];
        setOrders((current) => (nextPage > 1 ? [...current, ...rows] : rows));
        setPage(nextPage);
        setLastPage(response?.data?.meta?.last_page ?? 1);
      } catch {
        // El aviso global ya dijo qué pasó.
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [query, status, kind, selectedLocation?.id],
  );

  // Al volver de registrar o de un detalle, la lista ya lo refleja.
  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerRight: () =>
          canCreate ? (
            <AppBar.Action icon="plus" iconColor={colors.primary} onPress={() => router.push("/(tabs)/home/production/form" as any)} />
          ) : null,
      });
    }, [navigation, canCreate, colors.primary, router]),
  );

  // Por día, en el orden en que llegan (más reciente primero).
  const sections = useMemo(() => {
    const byDay = new Map<string, App.Entities.ProductionOrder[]>();
    for (const order of orders) {
      const key = order.production_date;
      byDay.set(key, [...(byDay.get(key) ?? []), order]);
    }
    return Array.from(byDay.entries()).map(([day, rows]) => ({ day, rows: [...rows].sort((a, b) => b.id - a.id) }));
  }, [orders]);

  const filtered = !!query || status !== "all" || kind !== "all";

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    contentWide: { padding: 28, maxWidth: 880, width: "100%", alignSelf: "center" },
    actions: { flexDirection: "row", gap: 10 },
    actionsNarrow: { flexDirection: "column", gap: 8 },
    action: { flexGrow: 1, flexBasis: 0 },
    actionNarrow: { alignSelf: "stretch" },
    processesLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
    processesText: { fontSize: 14, fontWeight: "600", color: c.primary },
    filters: { marginLeft: -16, marginRight: -16, marginTop: -6 },
    sections: { gap: 22 },
    more: { alignSelf: "center", marginTop: 4 },
  }));

  const rowFor = (order: App.Entities.ProductionOrder) => {
    const main = meaningfulYields(order.yields)[0];
    const meta = [
      order.status === "completed" ? null : order.status_label,
      order.status === "cancelled" ? null : main ? yieldShort(main) : piecesYield(order.yields),
      order.folio,
      order.responsible_name,
    ]
      .filter(Boolean)
      .join(" · ");
    const muted = order.status === "cancelled";
    return (
      <ListRow
        key={order.id}
        icon={order.kind === "packaging" ? "package-variant" : "pot-steam-outline"}
        iconColor={order.status === "draft" ? colors.warning : muted ? colors.textMuted : colors.primary}
        title={order.title}
        subtitle={orderSummary(order)}
        subtitleLines={2}
        meta={meta}
        alignTop
        onPress={() => router.push(`/(tabs)/home/production/${order.id}` as any)}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(1);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {canCreate && (
          <View style={narrow ? styles.actionsNarrow : styles.actions}>
            <Button
              mode="contained"
              icon="plus"
              style={narrow ? styles.actionNarrow : styles.action}
              onPress={() => router.push("/(tabs)/home/production/form" as any)}
            >
              Registrar producción
            </Button>
            <Button
              mode="outlined"
              icon="package-variant"
              style={narrow ? styles.actionNarrow : styles.action}
              onPress={() => router.push("/(tabs)/home/production/pack" as any)}
            >
              Envasar granel
            </Button>
          </View>
        )}
        {canSeeProcesses && (
          <Pressable
            onPress={() => router.push("/(tabs)/home/production/formulas" as any)}
            style={styles.processesLink}
            accessibilityRole="link"
          >
            <MaterialCommunityIcons name="cog-outline" size={16} color={colors.primary} />
            <Text style={styles.processesText}>Procesos: qué entra y qué sale</Text>
          </Pressable>
        )}

        <ListSearchbar value={search} onChangeText={setSearch} placeholder="Buscar por proceso, producto o folio" />
        <View style={styles.filters}>
          <AppListFilterBar
            filters={FILTERS}
            values={{ status, kind }}
            onChange={(values) => {
              setStatus(values.status || "all");
              setKind(values.kind || "all");
            }}
          />
        </View>

        <View style={styles.sections}>
          {loading ? (
            <ListGroupSkeleton rows={4} />
          ) : sections.length === 0 ? (
            <EmptyState
              icon={filtered ? "magnify" : "pot-steam-outline"}
              title={filtered ? "No hay producciones con estos filtros" : "Todavía no hay producción registrada"}
              description={
                filtered
                  ? "Cambia la búsqueda o los filtros."
                  : "Cuando abras cocos o hagas dulces, regístralo aquí: qué usaste, qué salió y cómo lo envasaste."
              }
              actionLabel={filtered ? "Limpiar filtros" : canCreate ? "Registrar producción" : undefined}
              onAction={
                filtered
                  ? () => {
                      setSearch("");
                      setStatus("all");
                      setKind("all");
                    }
                  : canCreate
                    ? () => router.push("/(tabs)/home/production/form" as any)
                    : undefined
              }
            />
          ) : (
            sections.map((section) => (
              <ListSection key={section.day} title={dayTitle(section.day)} count={section.rows.length}>
                <ListGroup>{section.rows.map(rowFor)}</ListGroup>
              </ListSection>
            ))
          )}
          {page < lastPage && !loading && (
            <Button mode="text" onPress={() => load(page + 1)} loading={loadingMore} disabled={loadingMore} style={styles.more}>
              Ver más
            </Button>
          )}
          {loadingMore && page >= lastPage && <ActivityIndicator color={colors.primary} />}
        </View>
      </ScrollView>
    </View>
  );
}
