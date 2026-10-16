import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate, formatTime } from "@/utils/dates";
import { routeForDocument } from "@/utils/documentRoutes";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, TextInput, View } from "react-native";
import { Chip, Text } from "react-native-paper";

type Entry = App.Entities.ActivityEntry;

const MODULE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  ventas: "cash-register",
  caja: "cash-multiple",
  compras: "cart-arrow-down",
  inventario: "clipboard-list-outline",
  transferencias: "truck-delivery-outline",
  produccion: "factory",
  catalogo: "tag-outline",
  administracion: "shield-account-outline",
  tareas: "checkbox-marked-circle-outline",
  sesion: "login",
};

interface Props {
  /** "me" (default): lo propio; un id: la de ese usuario; "all": toda la empresa. */
  userId?: number | "me" | "all";
  /** Encabezado visible ("Mi actividad", "Actividad de Ana", "Bitácora"). */
  title?: string;
  /** "location": solo lo ocurrido en la sucursal actual. */
  scope?: "location";
}

/** Clave de día local (YYYY-MM-DD) para agrupar. */
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayTitle(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Hoy";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Ayer";
  return formatDate(d, "long");
}

/**
 * Bitácora como línea de tiempo agrupada por día: qué hizo el usuario (o la
 * empresa), con filtro por módulo. Tocar un renglón abre el documento.
 */
export default function ActivityTimeline({ userId = "me", title, scope }: Props) {
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useStyles();
  const showUser = userId === "all";

  const [items, setItems] = useState<Entry[]>([]);
  const [modules, setModules] = useState<{ value: string; label: string }[]>([]);
  const [module, setModule] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // La búsqueda se aplica cuando se deja de escribir.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (target: number) => {
      const res = await Services.activity.index({
        user_id: userId,
        page: target,
        per_page: 30,
        ...(scope ? { scope } : {}),
        ...(module ? { module } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setItems((prev) => (target === 1 ? res.data : [...prev, ...res.data]));
      setModules(res.filters.modules);
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
      setTotal(res.meta.total);
    },
    [userId, scope, module, debouncedSearch],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load(1)
      .catch((e: any) => !cancelled && alerts.error(e?.response?.data?.message || "No se pudo cargar la actividad"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(1);
    } catch {
      alerts.error("No se pudo actualizar");
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (loadingMore || loading || page >= lastPage) return;
    setLoadingMore(true);
    try {
      await load(page + 1);
    } catch {
      alerts.error("No se pudo cargar más actividad");
    } finally {
      setLoadingMore(false);
    }
  };

  const sections = useMemo(() => {
    const groups: { title: string; key: string; data: Entry[] }[] = [];
    for (const item of items) {
      const key = dayKey(item.date);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.data.push(item);
      else groups.push({ key, title: dayTitle(item.date), data: [item] });
    }
    return groups;
  }, [items]);

  const header = (
    <View style={styles.header}>
      {!!title && (
        <Text variant="titleLarge" style={styles.title}>
          {title}
        </Text>
      )}
      {showUser && (
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por usuario o acción..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ value: "", label: "Todo" }, ...modules].map((m) => (
          <Chip
            key={m.value || "all"}
            compact
            selected={(module ?? "") === m.value}
            onPress={() => setModule(m.value || null)}
            style={styles.chip}
          >
            {m.label}
          </Chip>
        ))}
      </ScrollView>
      {!loading && (
        <Text variant="bodySmall" style={styles.count}>
          {total} {total === 1 ? "acción registrada" : "acciones registradas"}
        </Text>
      )}
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.flex}>
        {header}
        <ActivityIndicator style={{ marginTop: tokens.spacing[7] }} color={colors.primary} />
      </View>
    );
  }

  return (
    <SectionList
      style={styles.flex}
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      renderSectionHeader={({ section }) => (
        <Text variant="labelLarge" style={styles.dayTitle}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => {
        // Lo borrado ya no se puede abrir; un inicio de sesión no tiene documento.
        const route =
          item.event === "deleted" || item.event === "login"
            ? null
            : routeForDocument(item.subject?.type, item.subject?.id);
        const deleted = item.event === "deleted";
        const tint = deleted ? colors.error : colors.primary;
        return (
          <Pressable
            disabled={!route}
            onPress={() => route && router.push(route as any)}
            style={({ pressed }) => [styles.row, pressed && route ? { opacity: 0.7 } : null]}
          >
            <View style={[styles.icon, { backgroundColor: tint + "1A" }]}>
              <MaterialCommunityIcons
                name={deleted ? "delete-outline" : MODULE_ICONS[item.module] ?? "history"}
                size={18}
                color={tint}
              />
            </View>
            <View style={styles.body}>
              <Text variant="bodyMedium" style={styles.description}>
                {item.description}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                {formatTime(item.date)}
                {showUser && item.user?.name ? ` · ${item.user.name}` : ""}
                {/* En la bitácora de la sucursal todas son de ella. */}
                {item.location && !scope ? ` · ${item.location.name}` : ""}
                {` · ${item.module_label}`}
              </Text>
            </View>
            {!!route && <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialCommunityIcons name="history" size={40} color={colors.textMuted} />
          <Text variant="bodyMedium" style={styles.emptyText}>
            {module || debouncedSearch ? "No hay actividad con estos filtros." : "Todavía no hay actividad registrada."}
          </Text>
        </View>
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: tokens.spacing[4] }} color={colors.primary} /> : undefined}
    />
  );
}

const useStyles = () =>
  useThemedStyles((colors) => ({
    flex: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: tokens.spacing[3], gap: tokens.spacing[2] },
    title: { color: colors.text, fontWeight: "700", paddingHorizontal: tokens.spacing[4] } as any,
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      marginHorizontal: tokens.spacing[4],
      paddingHorizontal: tokens.spacing[3],
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchInput: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 } as any,
    chips: { paddingHorizontal: tokens.spacing[4], gap: tokens.spacing[1] },
    chip: { marginRight: 2 },
    count: { color: colors.textSecondary, paddingHorizontal: tokens.spacing[4] },
    dayTitle: {
      color: colors.textSecondary,
      paddingHorizontal: tokens.spacing[4],
      paddingTop: tokens.spacing[4],
      paddingBottom: tokens.spacing[1],
      textTransform: "capitalize",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      paddingHorizontal: tokens.spacing[4],
      paddingVertical: tokens.spacing[3],
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    body: { flex: 1, gap: 2 },
    description: { color: colors.text },
    meta: { color: colors.textSecondary },
    empty: { alignItems: "center", padding: tokens.spacing[7], gap: tokens.spacing[2] },
    emptyText: { color: colors.textSecondary, textAlign: "center" },
  }));
