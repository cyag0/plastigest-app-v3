import palette from "@/constants/palette";
import useInventoryTypes, {
  ALL_INVENTORY_TYPES,
} from "@/hooks/useInventoryTypes";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Divider, IconButton, Text, TouchableRipple } from "react-native-paper";

type InventoryType = App.Entities.InventoryType;

/**
 * Paso previo al listado de productos: se elige primero el tipo de inventario.
 * El tipo elegido queda en la ruta como slug (/inventory/products/type/materia-prima).
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.headerTitle}>
            Tipos de inventario
          </Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>
            Elige un tipo para ver sólo esos productos
          </Text>
        </View>

        {error && (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.list}>
          <Option
            icon="format-list-bulleted"
            color={palette.primary}
            title="Todos los productos"
            description="El catálogo completo, sin filtrar"
            badge={totalProducts}
            onPress={() => openType(ALL_INVENTORY_TYPES)}
          />

          <Divider style={styles.divider} />

          {types.map((type: InventoryType, index: number) => (
            <React.Fragment key={type.id}>
              <Option
                icon={type.icon || "shape-outline"}
                color={type.color || palette.primary}
                title={type.name}
                description={type.description || ""}
                badge={type.products_count}
                onPress={() => openType(type.slug)}
              />

              {index < types.length - 1 && <Divider style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

interface OptionProps {
  icon: string;
  color: string;
  title: string;
  description: string;
  badge?: number;
  onPress: () => void;
}

function Option({
  icon,
  color,
  title,
  description,
  badge,
  onPress,
}: OptionProps) {
  return (
    <TouchableRipple onPress={onPress} style={styles.optionItem}>
      <View style={styles.optionContent}>
        <View style={[styles.optionIcon, { backgroundColor: color + "20" }]}>
          <IconButton
            icon={icon}
            size={28}
            iconColor={color}
            style={{ margin: 0 }}
          />
        </View>

        <View style={styles.optionText}>
          <Text variant="titleMedium" style={styles.optionTitle}>
            {title}
          </Text>
          {!!description && (
            <Text
              variant="bodySmall"
              style={styles.optionDescription}
              numberOfLines={2}
            >
              {description}
            </Text>
          )}
        </View>

        {badge !== undefined && (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text variant="labelSmall" style={styles.badgeText}>
              {badge}
            </Text>
          </View>
        )}

        <IconButton
          icon="chevron-right"
          size={24}
          iconColor={palette.textSecondary}
          style={{ margin: 0 }}
        />
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 32,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: "700",
    color: palette.text,
  },
  headerSubtitle: {
    color: palette.textSecondary,
  },
  error: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: palette.error,
  },
  list: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  divider: {
    marginLeft: 80,
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    borderRadius: 12,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: "600",
    color: palette.text,
  },
  optionDescription: {
    color: palette.textSecondary,
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
  },
});
