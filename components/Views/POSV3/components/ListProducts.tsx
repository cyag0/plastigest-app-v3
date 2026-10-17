import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import SearchInput from "@/components/App/SearchInput";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useDebounce } from "@/hooks/useDebounce";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatUnitPrice } from "@/utils/format";
import { unitDisplayPrice, unitRatio } from "@/utils/saleUnits";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  ScrollView,
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
  /**
   * Lugar para la foto. Sin fotos en el catálogo la tarjeta es solo de texto:
   * el cuadro de 160 px con el ícono de paquete dejaba ver una sola fila de
   * productos en la tableta.
   */
  showImage?: boolean;
  /** ¿Puede cambiar cantidad/unidad de lo que ya está en el carrito? */
  canEdit?: boolean;
  /** ¿Puede quitarlo? (bajar de 1 lo quita) */
  canRemove?: boolean;
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
    showImage = true,
    canEdit = true,
    canRemove = true,
    onAddProduct,
    onRemoveProduct,
    onItemChange,
  }: ProductCardProps) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [showUnitMenu, setShowUnitMenu] = useState(false);

    // Unidad por defecto: la del producto. Antes era available_units[0], que
    // viene en orden alfabético: para productos por pieza caía en "Decena" y
    // agregar 1 al carrito eran 10 piezas (ventas, compras y transferencias).
    const defaultUnitId =
      item.available_units?.find((u) => u.id === item.unit_id)?.id ||
      item.available_units?.[0]?.id ||
      0;

    // Estado local para la unidad seleccionada, usa unit_id si existe en selectedProduct
    const [selectedUnitId, setSelectedUnitId] = useState<number>(
      selectedProduct?.unit_id || defaultUnitId,
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
      const fallbackUnitId = defaultUnitId;

      if (!hasCurrentUnit && fallbackUnitId !== selectedUnitId) {
        setSelectedUnitId(fallbackUnitId);
      }
    }, [
      selectedProduct?.unit_id,
      item.id,
      item.available_units,
      selectedUnitId,
      defaultUnitId,
    ]);

    const selectedUnit = item.available_units?.find(
      (u) => u.id === selectedUnitId,
    );

    // Precio en la unidad elegida: el del producto (por su unidad) × factor de
    // la elegida ÷ factor de la del producto, como el inventario y el servidor
    // (utils/saleUnits). Antes era precio × factor de la elegida, que solo
    // sirve si la unidad del producto es la base de su tipo (no con Gramo o
    // Docena). Un paquete tiene su propio precio.
    const calculatePrice = useCallback(() => {
      const basePrice =
        typeof item.price === "string" ? parseFloat(item.price) : item.price;
      if (item.is_package || !selectedUnit) return basePrice;

      const productUnit = item.available_units?.find((u) => u.id === item.unit_id) ?? {
        id: item.unit_id,
        factor_to_base: 1,
      };
      const ratio = unitRatio(selectedUnit, productUnit);
      return Number.isFinite(ratio) ? unitDisplayPrice(basePrice, ratio) : basePrice;
    }, [item.price, item.is_package, item.unit_id, item.available_units, selectedUnit]);

    const displayPrice = calculatePrice();

    const inStock = item.current_stock && item.current_stock > 0;
    const stockVariant: "success" | "error" = inStock ? "success" : "error";
    const stockColor = inStock ? colors.success : colors.error;

    // Obtener la unidad base para mostrar con el stock
    const baseUnit = item.available_units?.find((u) => u.id === item.unit_id);
    const stockValue = parseFloat(String(item.current_stock || 0));
    const formattedStock = parseFloat(stockValue.toFixed(2));
    const stockText = `${formattedStock}${
      baseUnit?.abbreviation ? ` ${baseUnit.abbreviation}` : ""
    }`;

    // Ya en el carrito y sin permiso para cambiarlo: sin selector de unidad.
    const unitSelector =
      (!selectedProduct || canEdit) &&
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
                color={colors.textSecondary}
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
        {/* Sin permiso para cambiar el renglón solo se ve la cantidad; bajar
            de 1 lo quita, así que sin permiso para quitar no se ofrece. */}
        {canEdit && (canRemove || selectedProduct.quantity > 1) && (
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
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        <Text style={styles.quantityText}>{selectedProduct.quantity}</Text>
        {canEdit && (
          <TouchableOpacity
            style={[styles.quantityButton, styles.quantityButtonPrimary]}
            onPress={(event) => {
              event.stopPropagation();
              onItemChange(item.id, "increment");
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
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
        <MaterialCommunityIcons name="cart-plus" size={16} color={colors.primaryForeground} />
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
                    color={colors.textMuted}
                  />
                </View>
              )}
            </View>

            <View style={styles.compactInfo}>
              <Text
                style={styles.code}
                numberOfLines={1}
              >
                {item.code || "Sin código"}
              </Text>
              <Text
                style={styles.name}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <View style={styles.compactMetaRow}>
                <Text style={styles.price}>{formatUnitPrice(displayPrice)}</Text>
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

    const stockChip = (
      <AppChip
        variant={stockVariant}
        size="sm"
        icon={inStock ? "package-check" : "package-variant-remove"}
      >
        {stockText}
      </AppChip>
    );

    return (
      <View style={styles.card}>
        {/* Imagen del producto (solo si el catálogo tiene fotos) */}
        {showImage && (
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
                  size={32}
                  color={colors.textMuted}
                />
              </View>
            )}

            {/* Badge de stock */}
            <View style={styles.stockBadgeWrap}>{stockChip}</View>
          </View>
        )}

        {/* Información del producto */}
        <View style={styles.content}>
          <View style={styles.contentBody}>
            {/* Sin foto, las existencias van junto al código. */}
            <View style={styles.codeRow}>
              <Text style={[styles.code, styles.codeText]} numberOfLines={1}>
                {item.code}
              </Text>
              {!showImage && stockChip}
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.price}>{formatUnitPrice(displayPrice)}</Text>
          </View>

          {/* Unidad y botón en un renglón; si no caben, el botón baja. */}
          <View style={styles.actionsRow}>
            {unitSelector ? <View style={styles.actionsUnit}>{unitSelector}</View> : null}
            <View style={styles.actionsMain}>{quantityActions}</View>
          </View>
        </View>
      </View>
    );
  },
  // Función de comparación para evitar re-renders innecesarios
  (prevProps, nextProps) => {
    // Solo re-renderizar si cambia el producto o su estado de selección
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.showImage === nextProps.showImage &&
      prevProps.canEdit === nextProps.canEdit &&
      prevProps.canRemove === nextProps.canRemove &&
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
  // Campos presentes cuando el item representa un paquete (is_package).
  package_id?: number;
  base_product_id?: number;
  quantity_per_package?: number;
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
  /**
   * Se invoca cuando se confirma una búsqueda/escaneo (Enter) y NO hay
   * ningún producto que coincida con el código. Útil para dar feedback
   * cuando se usa un lector de código de barras tipo teclado (USB/BT).
   */
  onScanNotFound?: (code: string) => void;
  /**
   * Búsqueda controlada desde afuera (p. ej. un buscador en la barra de
   * arriba): con ella no se pinta el buscador propio. El escáner (Enter) se
   * dispara con la ref: submitSearch().
   */
  searchQuery?: string;
  onSearchQueryChange?: (text: string) => void;
  loading?: boolean;
  showSearch?: boolean;
  showCategories?: boolean;
  showOutOfStockFilter?: boolean;
  numColumns?: number;
  autoAdjustColumns?: boolean;
  /**
   * ¿Se puede cambiar cantidad/unidad de lo que ya está en el carrito? Sin
   * permiso solo se ve la cantidad. Por defecto sí.
   */
  canEditItems?: boolean;
  /** ¿Se puede quitar del carrito (bajar de 1)? Por defecto sí. */
  canRemoveItems?: boolean;
}

type StockFilter = "available" | "out_of_stock" | "all";
type ViewMode = "grid" | "compact";

export interface ListProductsHandle {
  /** Lo mismo que Enter en el buscador: agrega el producto del código escrito. */
  submitSearch: () => void;
}

/** Ancho mínimo de cada columna del catálogo (tarjeta + márgenes). */
const MIN_CARD_WIDTH = 184;
/** Relleno a los lados de la cuadrícula (gridContent). */
const GRID_PADDING = tokens.spacing[3] * 2;

const ListProducts = React.forwardRef<ListProductsHandle, ListProductsProps>(function ListProducts({
  products,
  categories = [],
  selectedProducts = {},
  onAddProduct = () => {},
  onRemoveProduct = () => {},
  onItemChange = () => {},
  onScanNotFound,
  searchQuery: controlledQuery,
  onSearchQueryChange,
  loading = false,
  showSearch = true,
  showCategories = true,
  showOutOfStockFilter = false,
  numColumns: initialNumColumns = 2,
  autoAdjustColumns = true,
  canEditItems = true,
  canRemoveItems = true,
}: ListProductsProps, ref) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [ownQuery, setOwnQuery] = useState("");
  const isControlledSearch = controlledQuery !== undefined;
  const searchQuery = isControlledSearch ? controlledQuery : ownQuery;
  const setSearchQuery = (text: string) => {
    if (isControlledSearch) onSearchQueryChange?.(text);
    else setOwnQuery(text);
  };
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("available");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const numColumns = initialNumColumns;
  const isCompactMode = viewMode === "compact";

  // Las tarjetas están memoizadas y sólo se vuelven a pintar cuando cambia su
  // producto o su cantidad, así que se quedaban con los handlers del render en
  // que se pintaron: un +/- calculaba sobre un carrito viejo (en compras
  // borraba del carrito otros productos que el servidor sí tenía). Reciben
  // funciones estables que siempre llaman a los handlers actuales.
  const handlersRef = useRef({ onAddProduct, onRemoveProduct, onItemChange });
  useLayoutEffect(() => {
    handlersRef.current = { onAddProduct, onRemoveProduct, onItemChange };
  });
  const handleAddProduct = useCallback(
    (product: ProductListItem, unitId: number) =>
      handlersRef.current.onAddProduct(product, unitId),
    [],
  );
  const handleRemoveProduct = useCallback(
    (productId: number | string) =>
      handlersRef.current.onRemoveProduct(productId),
    [],
  );
  const handleItemChange = useCallback(
    (
      productId: number | string,
      action: "increment" | "decrement" | "unit",
      data?: any,
    ) => handlersRef.current.onItemChange(productId, action, data),
    [],
  );

  // Debounce para la búsqueda
  const { run: runSearchDebounce } = useDebounce(
    (value: string) => setDebouncedSearchQuery(value),
    { time: 300 },
  );
  useEffect(() => {
    if (isControlledSearch) runSearchDebounce(controlledQuery ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledQuery]);

  // Columnas según el ancho que de verdad tiene el catálogo. Antes salían del
  // ancho de la ventana: al lado del carrito (Compras, Transferencias) en la
  // tableta vertical eran 3 columnas en 400 px y las tarjetas no cabían.
  const [listWidth, setListWidth] = useState(0);
  const handleListLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    setListWidth((current) => (current === width ? current : width));
  };
  const gridColumns =
    autoAdjustColumns && listWidth > 0
      ? Math.min(6, Math.max(2, Math.floor((listWidth - GRID_PADDING) / MIN_CARD_WIDTH)))
      : numColumns;
  // En compacto, dos columnas de renglones si hay espacio (tableta, escritorio).
  const columns = isCompactMode ? (listWidth >= 720 ? 2 : 1) : gridColumns;

  // Sin ninguna foto en el catálogo, tarjetas solo de texto.
  const showImages = products.some((product) => !!product.main_image?.uri);

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

  const hasSearchQuery = Boolean(searchQuery || debouncedSearchQuery);
  const isHidingOutOfStock =
    showOutOfStockFilter && stockFilter === "available";

  // Se ejecuta al presionar Enter en el buscador. Hace las veces de
  // "scanner" para lectores de código de barras tipo teclado (USB/BT):
  // el lector escribe el código y envía Enter, lo que agrega el producto
  // al carrito sin tocar la pantalla.
  const handleSubmitSearch = () => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = normalizeText(rawQuery);

    if (!normalizedQuery) {
      return;
    }

    // 1) Coincidencia exacta por código (cubre productos y paquetes, que
    //    tienen su propio código de barras).
    let match = products.find(
      (product) => normalizeText(product.code || "") === normalizedQuery,
    );

    // 2) Si no hay match exacto pero el filtro dejó un único producto,
    //    asumimos que es ese.
    if (!match && filteredProducts.length === 1) {
      match = filteredProducts[0];
    }

    if (!match) {
      onScanNotFound?.(rawQuery);
      return;
    }

    // onAddProduct (handleAddProduct) valida stock y muestra su propia
    // alerta de éxito o de stock insuficiente. En la unidad del producto,
    // como la tarjeta: antes era available_units[0], que viene en orden
    // alfabético, y un producto por pieza entraba como 1 caja o decena.
    onAddProduct(
      match,
      match.available_units?.find((u) => u.id === match.unit_id)?.id ||
        match.available_units?.[0]?.id ||
        match.unit_id ||
        0,
    );
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };
  const submitRef = useRef(handleSubmitSearch);
  submitRef.current = handleSubmitSearch;
  useImperativeHandle(ref, () => ({ submitSearch: () => submitRef.current() }), []);

  const viewModeButton = (
    <TouchableOpacity
      style={[
        styles.viewModeButton,
        isCompactMode && styles.viewModeButtonActive,
      ]}
      onPress={() =>
        setViewMode((current) => (current === "grid" ? "compact" : "grid"))
      }
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isCompactMode ? "Ver como tarjetas" : "Ver compacto"}
    >
      <MaterialCommunityIcons
        name={isCompactMode ? "view-agenda" : "view-grid-outline"}
        size={14}
        color={isCompactMode ? colors.primaryForeground : colors.textSecondary}
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
  );

  const renderProductCard = ({ item }: { item: ProductListItem }) => {
    return (
      <View style={{ flex: 1 / columns }}>
        <ProductCard
          item={item}
          selectedProduct={selectedProducts[item.id]}
          compact={isCompactMode}
          showImage={showImages}
          canEdit={canEditItems}
          canRemove={canRemoveItems}
          onAddProduct={handleAddProduct}
          onRemoveProduct={handleRemoveProduct}
          onItemChange={handleItemChange}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra: el buscador (si la pantalla no lo pone en otro lado, como la
          barra de arriba) y un renglón con categorías, cuántos hay y la
          vista. Antes eran hasta cuatro renglones (buscador, resumen, vista y
          categorías) y en la tableta solo quedaba una fila de productos. */}
      <View style={styles.toolbar}>
        {showSearch && !isControlledSearch && (
          <View style={styles.searchWrap}>
            <SearchInput
              placeholder="Buscar productos o escanear código"
              value={searchQuery}
              onChangeText={(text: string) => {
                setSearchQuery(text);
                runSearchDebounce(text);
              }}
              onSubmitEditing={handleSubmitSearch}
              // Mantener el foco para permitir escanear varios códigos
              // seguidos con un lector tipo teclado (USB/Bluetooth).
              blurOnSubmit={false}
              returnKeyType="search"
              showShortcut={false}
              containerStyle={styles.searchInput}
            />
          </View>
        )}

        {showOutOfStockFilter && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.stockFilterScroll}
          >
            <AppChip
              icon="package-check"
              variant={stockFilter === "available" ? "success" : "default"}
              onPress={() => setStockFilter("available")}
            >
              Disponibles ({availableCount})
            </AppChip>
            <AppChip
              icon="package-variant-remove"
              variant={stockFilter === "out_of_stock" ? "error" : "default"}
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

        <View style={styles.filtersRow}>
          {showCategories && categories.length > 0 ? (
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
          ) : (
            <View style={styles.categoriesScroll} />
          )}
          <Text style={styles.countText} numberOfLines={1}>
            {filteredProducts.length === products.length
              ? `${products.length} ${products.length === 1 ? "producto" : "productos"}`
              : `${filteredProducts.length} de ${products.length}`}
          </Text>
          {viewModeButton}
        </View>
      </View>

      {/* Grid de productos */}
      <View style={styles.productsContainer} onLayout={handleListLayout}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <MaterialCommunityIcons
              name="loading"
              size={32}
              color={colors.textMuted}
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
                    : "Da de alta productos en Inventario para verlos aquí"
            }
          />
        ) : (
          <FlatList
            data={filteredProducts}
            key={`${viewMode}-${columns}`}
            numColumns={columns}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
          />
        )}
      </View>
    </View>
  );
});

export default ListProducts;

const makeStyles = themedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  // --- Toolbar ---
  toolbar: {
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: tokens.spacing[2],
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    paddingLeft: tokens.spacing[5],
    paddingRight: tokens.spacing[3],
    paddingTop: tokens.spacing[2],
  },
  countText: {
    ...tokens.typography.caption,
    color: c.textSecondary,
    flexShrink: 0,
  },
  stockFilterScroll: {
    marginTop: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[5],
  },
  searchWrap: {
    paddingHorizontal: tokens.spacing[5],
    paddingTop: tokens.spacing[3],
  },
  searchInput: {
    width: "100%",
    height: 40,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    paddingRight: 4,
  },
  categoriesScroll: {
    flex: 1,
    minWidth: 0,
  },
  viewModeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    flexShrink: 0,
  },
  viewModeButtonActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  viewModeButtonText: {
    ...tokens.typography.micro,
    color: c.textSecondary,
  },
  viewModeButtonTextActive: {
    color: c.primaryForeground,
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
    color: c.textSecondary,
  },
  gridContent: {
    padding: tokens.spacing[3],
    paddingBottom: tokens.spacing[5],
  },

  // --- Grid Card ---
  card: {
    flex: 1,
    margin: tokens.spacing[2],
    backgroundColor: c.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
    ...tokens.shadow.sm,
  },
  imageContainer: {
    width: "100%",
    height: 128,
    position: "relative",
    backgroundColor: c.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholderLarge: {
    width: "100%",
    height: "100%",
    backgroundColor: c.surfaceMuted,
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
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
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
    backgroundColor: c.surfaceMuted,
  },
  compactImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: c.surfaceMuted,
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
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    minHeight: 22,
  },
  codeText: {
    flex: 1,
    minWidth: 0,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  // Unidad (≈60) y botón o cantidad (≈96-100): en un renglón desde ~170 de
  // ancho útil (4 columnas en la tableta horizontal); si no, el botón baja.
  actionsUnit: {
    flexGrow: 1,
    flexBasis: 60,
  },
  actionsMain: {
    flexGrow: 2,
    flexBasis: 96,
  },
  code: {
    ...tokens.typography.micro,
    color: c.textMuted,
  },
  name: {
    ...tokens.typography.bodyMd,
    color: c.text,
    minHeight: 20,
  },
  price: {
    ...tokens.typography.bodyMd,
    color: c.text,
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

  // --- Agregar (botón) ---
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: c.primary,
    paddingVertical: 8,
    borderRadius: tokens.radius.md,
  },
  addButtonText: {
    ...tokens.typography.bodyMd,
    color: c.primaryForeground,
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
    backgroundColor: c.surfaceMuted,
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonPrimary: {
    backgroundColor: c.primary,
  },
  quantityText: {
    ...tokens.typography.bodyMd,
    fontWeight: "700",
    color: c.text,
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
    borderColor: c.border,
    borderRadius: tokens.radius.md,
    backgroundColor: c.surface,
    gap: 4,
  },
  unitSelectorText: {
    ...tokens.typography.micro,
    color: c.text,
    fontWeight: "600",
    flex: 1,
  },
  unitMenu: {
    marginTop: 4,
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    ...tokens.shadow.md,
    borderWidth: 1,
    borderColor: c.border,
    // Z-index alto para superponerse a las cards de productos
    // sin verse transparente. Importante: el Menu de Paper se
    // renderiza en un portal, por lo que el zIndex debe estar
    // en el contentStyle (no en un ancestor).
    zIndex: 1000,
    elevation: 8,
  },
  unitMenuItemTextSelected: {
    color: c.primary,
    fontWeight: "600",
  },
}));
