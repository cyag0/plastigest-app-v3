/**
 * Catálogo: categorías y cuadrícula, con sus estados. Un error de carga
 * nunca se muestra como "Sin productos": dice que no se pudo cargar y ofrece
 * "Reintentar".
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { KioskCategory, KioskProduct } from "@/utils/services/kiosk";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import KioskButton from "./KioskButton";
import KioskCategoryBar from "./KioskCategoryBar";
import KioskProductGrid from "./KioskProductGrid";

interface Props {
  status: "loading" | "error" | "ready";
  /** Productos del catálogo completo (para distinguir "no hay" de "no se encontró"). */
  totalProducts: number;
  products: KioskProduct[];
  categories: KioskCategory[];
  categoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  query: string;
  onClearQuery: () => void;
  onRetry: () => void;
  retrying: boolean;
  columns: number;
  gridWidth: number;
  quantityByProduct: ReadonlyMap<number, number>;
  onPressProduct: (product: KioskProduct) => void;
  onScroll?: () => void;
  bottomInset: number;
}

function StateView({
  icon,
  title,
  text,
  action,
  testID,
}: {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text?: string;
  action?: React.ReactNode;
  testID: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "700", color: c.text, textAlign: "center", maxWidth: 560 },
    text: { fontSize: 18, lineHeight: 26, color: c.textSecondary, textAlign: "center", maxWidth: 520 },
    action: { marginTop: 8, minWidth: 260 },
  }));
  return (
    <View style={styles.wrap} testID={testID}>
      {icon ? <MaterialCommunityIcons name={icon} size={56} color={colors.textMuted} /> : null}
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export default function KioskCatalogView({
  status,
  totalProducts,
  products,
  categories,
  categoryId,
  onSelectCategory,
  query,
  onClearQuery,
  onRetry,
  retrying,
  columns,
  gridWidth,
  quantityByProduct,
  onPressProduct,
  onScroll,
  bottomInset,
}: Props) {
  const { colors } = useTheme();

  if (status === "loading") {
    return (
      <StateView
        title="Cargando productos…"
        testID="kiosk-catalog-loading"
        action={<ActivityIndicator size="large" color={colors.primary} />}
      />
    );
  }

  if (status === "error") {
    return (
      <StateView
        icon="wifi-off"
        title="No se pudo cargar el catálogo"
        text="Revisa la conexión e intenta de nuevo. Si sigue igual, pide ayuda en caja."
        testID="kiosk-catalog-error"
        action={
          <KioskButton
            label="Reintentar"
            icon="refresh"
            size="lg"
            onPress={onRetry}
            loading={retrying}
            testID="kiosk-catalog-retry"
          />
        }
      />
    );
  }

  if (totalProducts === 0) {
    return (
      <StateView
        icon="storefront-outline"
        title="Por ahora no hay productos disponibles"
        text="Pide ayuda en caja."
        testID="kiosk-catalog-empty"
        action={
          <KioskButton
            label="Volver a cargar"
            icon="refresh"
            variant="secondary"
            onPress={onRetry}
            loading={retrying}
            testID="kiosk-catalog-retry"
          />
        }
      />
    );
  }

  const showCategories = !query.trim() && categories.length > 0;

  return (
    <View style={{ flex: 1 }}>
      {showCategories ? (
        <KioskCategoryBar categories={categories} selectedId={categoryId} onSelect={onSelectCategory} />
      ) : null}
      {products.length === 0 ? (
        query.trim() ? (
          <StateView
            icon="magnify"
            title={`No encontramos «${query.trim()}»`}
            text="Revisa cómo lo escribiste o mira todos los productos."
            testID="kiosk-search-empty"
            action={
              <KioskButton label="Ver todos" icon="view-grid-outline" onPress={onClearQuery} testID="kiosk-search-show-all" />
            }
          />
        ) : (
          <StateView
            title="No hay productos en esta categoría"
            testID="kiosk-category-empty"
            action={
              <KioskButton label="Ver todos" icon="view-grid-outline" onPress={() => onSelectCategory(null)} />
            }
          />
        )
      ) : (
        <KioskProductGrid
          products={products}
          columns={columns}
          width={gridWidth}
          quantityByProduct={quantityByProduct}
          onPressProduct={onPressProduct}
          onScroll={onScroll}
          bottomInset={bottomInset}
        />
      )}
    </View>
  );
}
