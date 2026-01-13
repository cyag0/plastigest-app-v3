import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Chip, Searchbar, Text } from "react-native-paper";
import { usePOS } from "../Context";
import CartSidebar from "./CartSidebar";
import ProductCard from "./ProductCard";

export default function POSV2() {
  const {
    products,
    setProducts,
    categories,
    setCategories,
    setUnitsByType,
    addToCart,
    type,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [numColumns, setNumColumns] = useState(2);

  const params = useLocalSearchParams();

  useEffect(() => {
    loadData();
    updateColumns();
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", updateColumns);
    return () => subscription?.remove();
  }, []);

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

  const loadData = async () => {
    try {
      setLoading(true);

      const [productsRes, categoriesRes, unitsRes] = await Promise.all([
        Services.products.index({
          //location_id: selectedLocation?.id,
          /*           for_sale: "1",
          supplier_id: params.supplier_id, */
          with_packages: "1",
        }),
        Services.categories.index({ all: true }),
        Services.home.unidades.getGroupedByType(),
      ]);

      // Los datos del nuevo endpoint ya vienen en el formato correcto
      const productsData = productsRes?.data?.data || [];
      const unitsByType = unitsRes?.data || {};

      const categoriesData = Array.isArray(categoriesRes)
        ? categoriesRes
        : (categoriesRes as any).data?.data ||
          (categoriesRes as any).data ||
          [];

      console.log("unitsByType", unitsByType);

      setProducts(productsData);
      setCategories(categoriesData);
      setUnitsByType(unitsByType);
    } catch (error) {
      console.error("Error loading POS data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === null || product.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: App.Entities.Product) => {
    addToCart(product, 1);
  };

  // Layout principal con sidebar en desktop
  const renderContent = () => (
    <View style={styles.mainContent}>
      {/* Buscador */}
      <Searchbar
        placeholder="Buscar productos..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        mode="bar"
      />

      {/* Categorías */}
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

      {/* Grid de productos */}
      <View style={styles.productsContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Cargando productos...</Text>
        ) : filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>No hay productos disponibles</Text>
        ) : (
          <FlatList
            data={filteredProducts}
            key={numColumns}
            numColumns={numColumns}
            renderItem={({ item }) => (
              <View style={{ flex: 1 / numColumns }}>
                <ProductCard
                  product={item}
                  onAddToCart={handleAddToCart}
                  type={type}
                />
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* {isMobile ? (
        // Vista móvil: productos con FAB
        <>
          {renderContent()}
          <CartSidebar />
        </>
      ) : (
        // Vista desktop: productos + sidebar
        <View style={styles.desktopContainer}>
          {renderContent()}
          <View style={styles.sidebarContainer}>
            <CartSidebar />
          </View>
        </View>
      )} */}

      {renderContent()}
      <CartSidebar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: "row",
  },
  mainContent: {
    flex: 1,
  },
  sidebarContainer: {
    width: 350,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  categoriesContainer: {
    maxHeight: 42,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  categoriesContent: {
    gap: 8,
    alignItems: "center",
  },
  categoryChip: {
    backgroundColor: "#fff",
    borderColor: palette.border,
  },
  categoryChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  categoryChipText: {
    color: palette.text,
  },
  categoryChipTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  productsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  gridContent: {
    paddingBottom: 100,
  },
  loadingText: {
    textAlign: "center",
    color: palette.textSecondary,
    marginTop: 32,
  },
  emptyText: {
    textAlign: "center",
    color: palette.textSecondary,
    marginTop: 32,
  },
});
