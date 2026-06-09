import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import SearchInput from "@/components/App/SearchInput";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useDebounce } from "@/hooks/useDebounce";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Menu } from "react-native-paper";

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  unit_type?: string;
  is_base_unit?: boolean;
  /**
   * Factor de conversion a la unidad base. La API lo devuelve
   * como string (e.g. "10.000000") por lo que se acepta number
   * o string. Usar `Number()` o `parseFloat()` al operar.
   */
  factor_to_base?: number | string;
}

interface SelectedProduct {
  product_id: number;
  quantity: number;
  unit_id: number;
  price: number;
}

interface ProductCardProps {
  item: ProductListItem;
  selectedProduct?: SelectedProduct;
  compact?: boolean;
  onAddProduct: (product: ProductListItem, unitId: number) => void;
  onRemoveProduct: (productId: number | string) => void;
  onItemChange: (
    productId: number | string,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => void;
}

const ProductCard = React.memo(
  ({
    item,
    selectedProduct,
    compact = false,
    onAddProduct,
    onRemoveProduct,
    onItemChange,
  }: ProductCardProps) => {
    const [showUnitMenu, setShowUnitMenu] = useState(false);

    // Estado local para la unidad seleccionada, usa unit_id si existe en selectedProduct
    const [selectedUnitId, setSelectedUnitId] = useState<number>(
      selectedProduct?.unit_id || item.available_units?.[0]?.id || 0,
    );

    // Sincronizar con selectedProduct cuando cambie
    React.useEffect(() => {
      if (selectedProduct?.unit_id) {
        setSelectedUnitId(selectedProduct.unit_id);
        return;
      }

      const availableUnitIds =
        item.available_units?.map((unit) => unit.id) || [];
      const hasCurrentUnit = availableUnitIds.includes(selectedUnitId);
      const fallbackUnitId = item.available_units?.[0]?.id || 0;

      if (!hasCurrentUnit && fallbackUnitId !== selectedUnitId) {
        setSelectedUnitId(fallbackUnitId);
      }
    }, [
      selectedProduct?.unit_id,
      item.id,
      item.available_units,
      selectedUnitId,
    ]);

    const selectedUnit = item.available_units?.find(
      (u) => u.id === selectedUnitId,
    );

    // Calcular precio según la unidad seleccionada
    const calculatePrice = useCallback(() => {
      const basePrice =
        typeof item.price === "string" ? parseFloat(item.price) : item.price;

      if (!selectedUnit || selectedUnit.is_base_unit) {
        return basePrice;
      }

      // Si la unidad tiene un factor de conversión, multiplicar el precio base.
      // El factor viene como string en la API (e.g. "10.000000"), se parsea
      // de forma segura con fallback a 1.
      const rawFactor = selectedUnit.factor_to_base;
      const factor =
        rawFactor === undefined || rawFactor === null
          ? 1
          : typeof rawFactor === "string"
            ? parseFloat(rawFactor) || 1
            : rawFactor || 1;
      return basePrice * factor;
    }, [item.price, selectedUnit]);

    const displayPrice = calculatePrice();

    const inStock = item.current_stock && item.current_stock > 0;
    const stockVariant: "success" | "error" = inStock ? "success" : "error";
    const stockColor = inStock ? palette.success : palette.error;

    // Obtener la unidad base para mostrar con el stock
    const baseUnit = item.available_units?.find((u) => u.id === item.unit_id);
    const stockValue = parseFloat(String(item.current_stock || 0));
    const formattedStock = parseFloat(stockValue.toFixed(2));
    const stockText = `${formattedStock}${
      baseUnit?.abbreviation ? ` ${baseUnit.abbreviation}` : ""
    }`;

    const unitSelector =
      !item.is_package &&
      item.available_units &&
      item.available_units.length > 0 && (
        <Menu
          visible={showUnitMenu}
          onDismiss={() => setShowUnitMenu(false)}
          anchor={
            <TouchableOpacity
              style={styles.unitSelector}
              onPress={(event) => {
                event.stopPropagation();
                setShowUnitMenu(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.unitSelectorText} numberOfLines={1}>
                {selectedUnit?.abbreviation ||
                  item.available_units[0]?.abbreviation ||
                  "Unidad"}
              </Text>
              <MaterialCommunityIcons
                name={showUnitMenu ? "chevron-up" : "chevron-down"}
                size={16}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          }
          contentStyle={styles.unitMenu}
        >
          {item.available_units.map((unit) => (
            <Menu.Item
              key={unit.id}
              onPress={() => {
                setSelectedUnitId(unit.id);
                onItemChange(item.id, "unit", unit.id);
                setShowUnitMenu(false);
              }}
              title={`${unit.name} (${unit.abbreviation})`}
              leadingIcon={selectedUnitId === unit.id ? "check" : undefined}
              titleStyle={
                selectedUnitId === unit.id
                  ? styles.unitMenuItemTextSelected
                  : undefined
              }
            />
          ))}
        </Menu>
      );

    const quantityActions = selectedProduct ? (
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={(event) => {
            event.stopPropagation();
            onItemChange(item.id, "decrement");
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="minus"
            size={16}
            color={palette.textSecondary}
          />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{selectedProduct.quantity}</Text>
        <TouchableOpacity
          style={[styles.quantityButton, styles.quantityButtonPrimary]}
          onPress={(event) => {
            event.stopPropagation();
            onItemChange(item.id, "increment");
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity
        style={styles.addButton}
        onPress={(event) => {
          event.stopPropagation();
          onAddProduct(
            item,
            selectedUnit?.id || item.available_units?.[0]?.id || 0,
          );
        }}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="cart-plus" size={16} color="#fff" />
        <Text style={styles.addButtonText}>Agregar</Text>
      </TouchableOpacity>
    );

    if (compact) {
      return (
        <View style={styles.compactCard}>
          <View style={styles.compactRow}>
            <View style={styles.compactImageContainer}>
              {item.main_image?.uri ? (
                <Image
                  source={{ uri: item.main_image.uri }}
                  style={styles.compactImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={20}
                    color={palette.textMuted}
                  />
                </View>
              )}
            </View>

            <View style={styles.compactInfo}>
              <Text
                style={styles.code}
                numberOfLines={1}
              >
                {item.code || "Sin codigo"}
              </Text>
              <Text
                style={styles.name}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <View style={styles.compactMetaRow}>
                <Text style={styles.price}>${displayPrice.toFixed(2)}</Text>
                <View
                  style={[
                    styles.stockDot,
                    { backgroundColor: stockColor },
                  ]}
                />
                <Text
                  style={[
                    styles.stockTextInline,
                    { color: stockColor },
                  ]}
                >
                  {stockText}
                </Text>
              </View>
            </View>

            <View style={styles.compactControls}>
              {unitSelector}
              {quantityActions}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        {/* Imagen del producto */}
        <View style={styles.imageContainer}>
          {item.main_image?.uri ? (
            <Image
              source={{ uri: item.main_image.uri }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholderLarge}>
              <MaterialCommunityIcons
                name="package-variant"
                size={36}
                color={palette.textMuted}
              />
            </View>
          )}

          {/* Badge de stock */}
          <View style={styles.stockBadgeWrap}>
            <AppChip
              variant={stockVariant}
              size="sm"
              icon={inStock ? "package-check" : "package-variant-remove"}
            >
              {stockText}
            </AppChip>
          </View>
        </View>

        {/* Información del producto */}
        <View style={styles.content}>
          <View style={styles.contentBody}>
            <Text style={styles.code} numberOfLines={1}>
              {item.code}
            </Text>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.price}>${displayPrice.toFixed(2)}</Text>
          </View>

          {/* Selector de unidades (solo para productos, no paquetes) */}
          {unitSelector}
        </View>

        {/* Botón de agregar o controles de cantidad */}
        <View style={styles.footer}>{quantityActions}</View>
      </View>
    );
  },
  // Función de comparación para evitar re-renders innecesarios
  (prevProps, nextProps) => {
    // Solo re-renderizar si cambia el producto o su estado de selección
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.selectedProduct?.quantity ===
        nextProps.selectedProduct?.quantity &&
      prevProps.selectedProduct?.unit_id ===
        nextProps.selectedProduct?.unit_id &&
      prevProps.selectedProduct?.price === nextProps.selectedProduct?.price
    );
  },
);

ProductCard.displayName = "ProductCard";

export interface ProductListItem {
  id: number | string;
  code: string;
  name: string;
  price: number | string; // Precio base del producto en su unidad base
  unit_id: number; // ID de la unidad base del producto
  current_stock?: number;
  category_id?: number;
  main_image?: {
    uri: string;
  };
  unit_type?: string | null;
  available_units?: Unit[];
  is_package?: boolean;
}

export interface ProductCategory {
  id: number;
  name: string;
}

interface ListProductsProps {
  products: ProductListItem[];
  categories?: ProductCategory[];
  selectedProducts?: Record<number | string, SelectedProduct>;
  onAddProduct?: (product: ProductListItem, unitId: number) => void;
  onRemoveProduct?: (productId: number | string) => void;
  onItemChange?: (
    productId: number | string,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => void;
  loading?: boolean;
  showSearch?: boolean;
  showCategories?: boolean;
  showOutOfStockFilter?: boolean;
  numColumns?: number;
  autoAdjustColumns?: boolean;
}

type StockFilter = "available" | "out_of_stock" | "all";
type ViewMode = "grid" | "compact";

export default function ListProducts({
  products,
  categories = [],
  selectedProducts = {},
  onAddProduct = () => {},
  onRemoveProduct = () => {},
  onItemChange = () => {},
  loading = false,
  showSearch = true,
  showCategories = true,
  showOutOfStockFilter = false,
  numColumns: initialNumColumns = 2,
  autoAdjustColumns = true,
}: ListProductsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("available");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [numColumns, setNumColumns] = useState(initialNumColumns);
  const isCompactMode = viewMode === "compact";

  // Debounce para la búsqueda
  const { run: runSearchDebounce } = useDebounce(
    (value: string) => setDebouncedSearchQuery(value),
    { time: 300 },
  );

  useEffect(() => {
    if (autoAdjustColumns) {
      updateColumns();
      const subscription = Dimensions.addEventListener("change", updateColumns);
      return () => subscription?.remove();
    }
  }, [autoAdjustColumns]);

  const updateColumns = () => {
    const width = Dimensions.get("window").width;
    if (width >= 1200) {
      setNumColumns(4);
    } else if (width >= 768) {
      setNumColumns(3);
    } else {
      setNumColumns(2);
    }
  };

  // Función para normalizar texto (sin acentos, minúsculas)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  };

  const filteredProducts = products.filter((product) => {
    const normalizedQuery = normalizeText(debouncedSearchQuery);
    const normalizedName = normalizeText(product.name);
    const normalizedCode = normalizeText(product.code || "");

    const matchesSearch =
      normalizedName.includes(normalizedQuery) ||
      normalizedCode.includes(normalizedQuery);

    const matchesCategory =
      selectedCategory === null || product.category_id === selectedCategory;

    const stockValue = Number(product.current_stock || 0);
    const matchesStockFilter =
      !showOutOfStockFilter || stockFilter === "all"
        ? true
        : stockFilter === "out_of_stock"
          ? stockValue <= 0
          : stockValue > 0;

    return matchesSearch && matchesCategory && matchesStockFilter;
  });

  const availableCount = products.filter(
    (product) => Number(product.current_stock || 0) > 0,
  ).length;

  const outOfStockCount = products.filter(
    (product) => Number(product.current_stock || 0) <= 0,
  ).length;

  const selectedCount = Object.keys(selectedProducts).length;

  const hasSearchQuery = Boolean(searchQuery || debouncedSearchQuery);
  const isHidingOutOfStock =
    showOutOfStockFilter && stockFilter === "available";

  const handleSubmitSearch = () => {
    const normalizedQuery = normalizeText(searchQuery.trim());

    if (!normalizedQuery) {
      return;
    }

    const exactCodeMatch = products.find(
      (product) => normalizeText(product.code || "") === normalizedQuery,
    );

    if (!exactCodeMatch || Number(exactCodeMatch.current_stock || 0) <= 0) {
      return;
    }

    onAddProduct(
      exactCodeMatch,
      exactCodeMatch.available_units?.[0]?.id || exactCodeMatch.unit_id || 0,
    );
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  const renderProductCard = ({ item }: { item: ProductListItem }) => {
    return (
      <View style={{ flex: isCompactMode ? 1 : 1 / numColumns }}>
        <ProductCard
          item={item}
          selectedProduct={selectedProducts[item.id]}
          compact={isCompactMode}
          onAddProduct={onAddProduct}
          onRemoveProduct={onRemoveProduct}
          onItemChange={onItemChange}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        {/* Search */}
        {showSearch && (
          <View style={styles.searchWrap}>
            <SearchInput
              placeholder="Buscar productos o escanear codigo"
              value={searchQuery}
              onChangeText={(text: string) => {
                setSearchQuery(text);
                runSearchDebounce(text);
              }}
              onSubmitEditing={handleSubmitSearch}
              showShortcut={false}
              containerStyle={styles.searchInput}
            />
          </View>
        )}

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {filteredProducts.length} visibles · {availableCount} con stock ·{" "}
            {outOfStockCount} sin stock
          </Text>
          {selectedCount > 0 && (
            <View style={styles.selectedBadge}>
              <MaterialCommunityIcons
                name="check-circle"
                size={12}
                color={palette.primary}
              />
              <Text style={styles.selectedSummaryText}>
                {selectedCount} seleccionados
              </Text>
            </View>
          )}
        </View>

        {/* Controls row */}
        <View style={styles.controlsRow}>
          {showOutOfStockFilter && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <AppChip
                icon="package-check"
                variant={
                  stockFilter === "available" ? "success" : "default"
                }
                onPress={() => setStockFilter("available")}
              >
                Disponibles ({availableCount})
              </AppChip>
              <AppChip
                icon="package-variant-remove"
                variant={
                  stockFilter === "out_of_stock" ? "error" : "default"
                }
                onPress={() => setStockFilter("out_of_stock")}
              >
                Sin stock ({outOfStockCount})
              </AppChip>
              <AppChip
                icon="package-variant"
                variant={stockFilter === "all" ? "primary" : "default"}
                onPress={() => setStockFilter("all")}
              >
                Todos ({products.length})
              </AppChip>
            </ScrollView>
          )}

          <TouchableOpacity
            style={[
              styles.viewModeButton,
              isCompactMode && styles.viewModeButtonActive,
            ]}
            onPress={() =>
              setViewMode((current) =>
                current === "grid" ? "compact" : "grid",
              )
            }
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={isCompactMode ? "view-agenda" : "view-grid-outline"}
              size={14}
              color={isCompactMode ? "#fff" : palette.textSecondary}
            />
            <Text
              style={[
                styles.viewModeButtonText,
                isCompactMode && styles.viewModeButtonTextActive,
              ]}
            >
              {isCompactMode ? "Compacto" : "Tarjetas"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        {showCategories && categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.categoriesScroll}
          >
            <AppChip
              variant={selectedCategory === null ? "primary" : "default"}
              onPress={() => setSelectedCategory(null)}
            >
              Todas
            </AppChip>
            {categories.map((category) => (
              <AppChip
                key={category.id}
                variant={
                  selectedCategory === category.id ? "primary" : "default"
                }
                onPress={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </AppChip>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Grid de productos */}
      <View style={styles.productsContainer}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <MaterialCommunityIcons
              name="loading"
              size={32}
              color={palette.textMuted}
            />
            <Text style={styles.loadingText}>Cargando productos...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={
              stockFilter === "out_of_stock"
                ? "package-variant-remove"
                : hasSearchQuery
                  ? "magnify-close"
                  : "package-variant-closed"
            }
            title={
              stockFilter === "out_of_stock"
                ? "No hay productos sin stock"
                : hasSearchQuery
                  ? "No se encontraron productos"
                  : isHidingOutOfStock
                    ? "No hay productos con stock"
                    : "No hay productos disponibles"
            }
            description={
              stockFilter === "out_of_stock"
                ? "Todos los productos visibles tienen stock disponible"
                : hasSearchQuery
                  ? "Intenta con otros términos de búsqueda"
                  : isHidingOutOfStock
                    ? "Los productos sin stock están ocultos por defecto"
                    : "Agrega productos para empezar a vender"
            }
          />
        ) : (
          <FlatList
            data={filteredProducts}
            key={`${viewMode}-${numColumns}`}
            numColumns={isCompactMode ? 1 : numColumns}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },

  // --- Toolbar ---
  toolbar: {
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: tokens.spacing[3],
  },
  searchWrap: {
    paddingHorizontal: tokens.spacing[5],
    paddingTop: tokens.spacing[3],
  },
  searchInput: {
    width: "100%",
    height: 40,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[5],
    paddingTop: tokens.spacing[3],
  },
  summaryText: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    flex: 1,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: palette.primarySoft,
    borderRadius: tokens.radius.full,
  },
  selectedSummaryText: {
    ...tokens.typography.micro,
    color: palette.primary,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[5],
    paddingTop: tokens.spacing[3],
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    paddingRight: 4,
  },
  categoriesScroll: {
    marginTop: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[5],
  },
  viewModeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    flexShrink: 0,
  },
  viewModeButtonActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  viewModeButtonText: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
  },
  viewModeButtonTextActive: {
    color: "#fff",
  },

  // --- Products container ---
  productsContainer: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  loadingText: {
    ...tokens.typography.body,
    color: palette.textSecondary,
  },
  gridContent: {
    padding: tokens.spacing[3],
    paddingBottom: tokens.spacing[5],
  },

  // --- Grid Card ---
  card: {
    flex: 1,
    margin: tokens.spacing[2],
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
    ...tokens.shadow.sm,
  },
  imageContainer: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: palette.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholderLarge: {
    width: "100%",
    height: "100%",
    backgroundColor: palette.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  stockBadgeWrap: {
    position: "absolute",
    top: tokens.spacing[2],
    right: tokens.spacing[2],
  },

  // --- Compact card ---
  compactCard: {
    marginHorizontal: tokens.spacing[2],
    marginVertical: tokens.spacing[1],
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...tokens.shadow.xs,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    padding: tokens.spacing[3],
  },
  compactImageContainer: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    backgroundColor: palette.surfaceMuted,
  },
  compactImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: palette.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  compactInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  compactControls: {
    width: 130,
    gap: tokens.spacing[2],
  },

  // --- Common card content ---
  content: {
    padding: tokens.spacing[3],
    gap: tokens.spacing[2],
  },
  contentBody: {
    gap: 2,
  },
  code: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  name: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    minHeight: 20,
  },
  price: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockTextInline: {
    ...tokens.typography.micro,
    fontWeight: "600",
  },

  // --- Footer (action) ---
  footer: {
    paddingHorizontal: tokens.spacing[3],
    paddingBottom: tokens.spacing[3],
    paddingTop: 0,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: palette.primary,
    paddingVertical: 8,
    borderRadius: tokens.radius.md,
  },
  addButtonText: {
    ...tokens.typography.bodyMd,
    color: "#fff",
    fontWeight: "600",
  },

  // --- Quantity controls ---
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  quantityButton: {
    backgroundColor: palette.surfaceMuted,
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonPrimary: {
    backgroundColor: palette.primary,
  },
  quantityText: {
    ...tokens.typography.bodyMd,
    fontWeight: "700",
    color: palette.text,
    minWidth: 28,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  // --- Unit selector ---
  unitSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing[2] + 2,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.surface,
    gap: 4,
  },
  unitSelectorText: {
    ...tokens.typography.micro,
    color: palette.text,
    fontWeight: "600",
    flex: 1,
  },
  unitMenu: {
    marginTop: 4,
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    ...tokens.shadow.md,
    borderWidth: 1,
    borderColor: palette.border,
    // Z-index alto para superponerse a las cards de productos
    // sin verse transparente. Importante: el Menu de Paper se
    // renderiza en un portal, por lo que el zIndex debe estar
    // en el contentStyle (no en un ancestor).
    zIndex: 1000,
    elevation: 8,
  },
  unitMenuItemTextSelected: {
    color: palette.primary,
    fontWeight: "600",
  },
});
