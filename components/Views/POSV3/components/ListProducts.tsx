import palette from "@/constants/palette";
import { useDebounce } from "@/hooks/useDebounce";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  Menu,
  Searchbar,
  Text,
} from "react-native-paper";

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  unit_type?: string;
  is_base_unit?: boolean;
  factor_to_base?: number;
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
    onAddProduct,
    onRemoveProduct,
    onItemChange,
  }: ProductCardProps) => {
    const [showUnitMenu, setShowUnitMenu] = useState(false);

    console.log("Renderring ProductCard for:", item.name);

    // Estado local para la unidad seleccionada, usa unit_id si existe en selectedProduct
    const [selectedUnitId, setSelectedUnitId] = useState<number>(
      selectedProduct?.unit_id || item.available_units?.[0]?.id || 0,
    );

    // Sincronizar con selectedProduct cuando cambie
    React.useEffect(() => {
      if (selectedProduct?.unit_id) {
        setSelectedUnitId(selectedProduct.unit_id);
      }
    }, [selectedProduct?.unit_id]);

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

      // Si la unidad tiene un factor de conversión, multiplicar el precio base
      const factor = selectedUnit.factor_to_base || 1;
      return basePrice * factor;
    }, [item.price, selectedUnit]);

    const displayPrice = calculatePrice();

    const stockColor =
      item.current_stock && item.current_stock > 0
        ? palette.success
        : palette.red;

    // Obtener la unidad base para mostrar con el stock
    const baseUnit = item.available_units?.find((u) => u.id === item.unit_id);
    const stockValue = parseFloat(String(item.current_stock || 0));
    const formattedStock = parseFloat(stockValue.toFixed(2));
    const stockText = `${formattedStock}${baseUnit?.abbreviation ? ` ${baseUnit.abbreviation}` : ""}`;

    return (
      <Card style={styles.card}>
        {/* Imagen del producto */}
        <View style={styles.imageContainer}>
          {item.main_image?.uri ? (
            <Image
              source={{ uri: item.main_image.uri }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons
                name="package-variant"
                size={40}
                color={palette.textSecondary}
              />
            </View>
          )}

          {/* Badge de stock */}
          <Badge
            style={[styles.stockBadge, { backgroundColor: stockColor }]}
            size={20}
          >
            {stockText}
          </Badge>
        </View>

        {/* Información del producto */}
        <Card.Content style={styles.content}>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={styles.code} numberOfLines={1}>
              {item.code}
            </Text>
            <Text variant="titleSmall" style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="titleMedium" style={styles.price}>
              ${displayPrice.toFixed(2)}
            </Text>
          </View>

          {/* Selector de unidades (solo para productos, no paquetes) */}
          {!item.is_package &&
            item.available_units &&
            item.available_units.length > 0 && (
              <View style={styles.unitSelectorContainer}>
                <Menu
                  visible={showUnitMenu}
                  onDismiss={() => setShowUnitMenu(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.unitSelector}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowUnitMenu(true);
                      }}
                    >
                      <Text style={styles.unitSelectorText}>
                        {selectedUnit?.abbreviation ||
                          item.available_units[0]?.abbreviation ||
                          "Unidad"}
                      </Text>
                      <MaterialCommunityIcons
                        name={showUnitMenu ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={palette.primary}
                      />
                    </TouchableOpacity>
                  }
                >
                  {item.available_units.map((unit, index) => (
                    <React.Fragment key={unit.id}>
                      <Menu.Item
                        onPress={(e) => {
                          setSelectedUnitId(unit.id);
                          onItemChange(item.id, "unit", unit.id);
                          setShowUnitMenu(false);
                        }}
                        title={`${unit.name} (${unit.abbreviation})`}
                        style={
                          selectedUnitId === unit.id
                            ? styles.unitMenuItemSelected
                            : undefined
                        }
                        titleStyle={
                          selectedUnitId === unit.id
                            ? styles.unitMenuItemTextSelected
                            : undefined
                        }
                      />
                      {index < (item.available_units?.length || 0) - 1 && (
                        <Divider />
                      )}
                    </React.Fragment>
                  ))}
                </Menu>
              </View>
            )}
        </Card.Content>

        {/* Botón de agregar o controles de cantidad */}
        <View style={styles.footer}>
          {selectedProduct ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onItemChange(item.id, "decrement");
                }}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>
                {selectedProduct.quantity}
              </Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onItemChange(item.id, "increment");
                }}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              icon="cart-plus"
              mode="contained"
              onPress={() => onAddProduct(item, selectedUnitId)}
              style={styles.addButton}
            >
              Agregar
            </Button>
          )}
        </View>
      </Card>
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
  numColumns?: number;
  autoAdjustColumns?: boolean;
}

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
  numColumns: initialNumColumns = 2,
  autoAdjustColumns = true,
}: ListProductsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [numColumns, setNumColumns] = useState(initialNumColumns);

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
      .replace(/[\u0300-\u036f]/g, "");
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

    return matchesSearch && matchesCategory;
  });

  const renderProductCard = ({ item }: { item: ProductListItem }) => {
    return (
      <View style={{ flex: 1 / numColumns }}>
        <ProductCard
          item={item}
          selectedProduct={selectedProducts[item.id]}
          onAddProduct={onAddProduct}
          onRemoveProduct={onRemoveProduct}
          onItemChange={onItemChange}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Buscador */}
      {showSearch && (
        <Searchbar
          placeholder="Buscar productos..."
          onChangeText={(text) => {
            setSearchQuery(text);
            runSearchDebounce(text);
          }}
          value={searchQuery}
          style={styles.searchbar}
          mode="bar"
        />
      )}

      {/* Categorías */}
      {showCategories && categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <Chip
            mode={selectedCategory === null ? "flat" : "outlined"}
            selected={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.categoryChip,
              selectedCategory === null && styles.categoryChipSelected,
            ]}
            textStyle={[
              styles.categoryChipText,
              selectedCategory === null && styles.categoryChipTextSelected,
            ]}
          >
            Todas
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              mode={selectedCategory === category.id ? "flat" : "outlined"}
              selected={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipSelected,
              ]}
              textStyle={[
                styles.categoryChipText,
                selectedCategory === category.id &&
                  styles.categoryChipTextSelected,
              ]}
            >
              {category.name}
            </Chip>
          ))}
        </ScrollView>
      )}

      {/* Grid de productos */}
      <View style={styles.productsContainer}>
        {loading ? (
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons
              name="loading"
              size={64}
              color={palette.primary}
            />
            <Text style={styles.emptyStateTitle}>Cargando productos...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIconContainer}>
              <MaterialCommunityIcons
                name={
                  searchQuery || debouncedSearchQuery
                    ? "magnify-close"
                    : "package-variant-closed"
                }
                size={80}
                color={palette.primary}
              />
            </View>
            <Text style={styles.emptyStateTitle}>
              {searchQuery || debouncedSearchQuery
                ? "No se encontraron productos"
                : "No hay productos disponibles"}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery || debouncedSearchQuery
                ? "Intenta con otros términos de búsqueda"
                : "Agrega productos para empezar a vender"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            key={numColumns}
            numColumns={numColumns}
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
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  categoriesContainer: {
    marginBottom: 8,
    maxHeight: 36,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  categoryChip: {
    borderColor: palette.primary,
  },
  categoryChipSelected: {
    backgroundColor: palette.primary,
  },
  categoryChipText: {
    color: palette.primary,
  },
  categoryChipTextSelected: {
    color: "#fff",
  },
  productsContainer: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: palette.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    //overflow: "hidden",
    elevation: 2,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  stockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  content: {
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  code: {
    color: palette.textSecondary,
  },
  name: {
    fontWeight: "600",
    minHeight: 20,
  },
  price: {
    color: palette.primary,
    fontWeight: "bold",
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
  },
  addButton: {
    margin: 0,
    flex: 1,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    flex: 1,
  },
  quantityButton: {
    backgroundColor: palette.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "bold",
    color: palette.text,
    minWidth: 30,
    textAlign: "center",
  },
  unitSelectorContainer: {},
  unitSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  unitSelectorText: {
    color: palette.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  unitMenuItemSelected: {
    backgroundColor: palette.primary || "#e3f2fd",
  },
  unitMenuItemTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});
