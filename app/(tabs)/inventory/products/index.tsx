import Skeleton from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import useInventoryTypes, {
  ALL_INVENTORY_TYPES,
} from "@/hooks/useInventoryTypes";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type InventoryType = App.Entities.InventoryType;

/**
 * Paso previo al listado de productos: se elige el tipo de inventario.
 * El tipo elegido queda en la ruta como slug (/inventory/products/type/materia-prima).
 *
 * Lista sobria: ícono neutro, nombre y cuántos productos tiene. Antes cada
 * tipo llevaba su color, un ícono grande en recuadro, una descripción de dos
 * renglones y un contador de color: mucho ruido para elegir una opción.
 */
export default function ProductsIndex() {
  const router = useRouter();
  const { types, loading, error, reload } = useInventoryTypes({
    withCounts: true,
  });
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const openType = (slug: string) => {
    router.push(`/(tabs)/inventory/products/type/${slug}` as any);
  };

  const totalProducts = types.reduce(
    (total, type) => total + (type.products_count || 0),
    0,
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <TypesSkeleton />
      ) : (
        <>
          <View style={styles.group}>
            <Row
              icon="format-list-bulleted"
              title="Todos los productos"
              count={totalProducts}
              onPress={() => openType(ALL_INVENTORY_TYPES)}
            />
          </View>

          <Text style={styles.groupTitle}>Por tipo</Text>
          <View style={styles.group}>
            {types.map((type: InventoryType, index: number) => (
              <Row
                key={type.id}
                icon={(type.icon || "shape-outline") as any}
                title={type.name}
                count={type.products_count ?? 0}
                divider={index > 0}
                onPress={() => openType(type.slug)}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Row({
  icon,
  title,
  count,
  divider,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  count: number;
  divider?: boolean;
  onPress: () => void;
}) {
  const empty = count === 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.rowDivider,
        pressed && { backgroundColor: palette.surfaceMuted },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={empty ? palette.textMuted : palette.textSecondary} />
      <Text style={[styles.rowTitle, empty && styles.muted]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.count}>{count}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textMuted} />
    </Pressable>
  );
}

function TypesSkeleton() {
  return (
    <View style={{ gap: 18 }}>
      <View style={[styles.group, styles.skeletonGroup]}>
        <Skeleton width="55%" height={14} borderRadius={6} />
      </View>
      <View style={[styles.group, styles.skeletonGroup, { gap: 22 }]}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} width={`${45 + ((i * 13) % 30)}%`} height={14} borderRadius={6} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  error: {
    color: palette.error,
    fontSize: 13,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.textSecondary,
    marginTop: 14,
  },
  group: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
  },
  skeletonGroup: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: palette.text,
  },
  muted: {
    color: palette.textMuted,
  },
  count: {
    fontSize: 14,
    color: palette.textMuted,
    fontVariant: ["tabular-nums"],
  },
});
