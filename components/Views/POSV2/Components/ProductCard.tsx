import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Badge, Card, IconButton, Text } from "react-native-paper";

interface ProductCardProps {
  product: App.Entities.Product;
  onAddToCart: (product: App.Entities.Product) => void;
  type?: "sales" | "purchases";
}

export default function ProductCard({
  product,
  onAddToCart,
  type = "sales",
}: ProductCardProps) {
  const stockColor =
    product.current_stock && product.current_stock > 0
      ? palette.success
      : palette.red;

  const stockText = product.current_stock || 0;

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        onPress={() => onAddToCart(product)}
        activeOpacity={0.7}
      >
        {/* Imagen del producto */}
        <View style={styles.imageContainer}>
          {product.main_image?.uri ? (
            <Image
              source={{ uri: product.main_image.uri }}
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
          <Text variant="bodySmall" style={styles.code} numberOfLines={1}>
            {product.code}
          </Text>
          <Text variant="titleSmall" style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text variant="titleMedium" style={styles.price}>
            $
            {parseFloat(
              type === "purchases"
                ? product.purchase_price?.toString() || "0"
                : product.sale_price?.toString() || "0"
            ).toFixed(2)}
          </Text>
        </Card.Content>

        {/* Botón de agregar */}
        <View style={styles.footer}>
          <IconButton
            icon="cart-plus"
            mode="contained"
            containerColor={palette.primary}
            iconColor="#fff"
            size={20}
            onPress={() => onAddToCart(product)}
            style={styles.addButton}
          />
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: palette.skeleton,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.skeleton,
  },
  stockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 80,
  },
  code: {
    color: palette.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  name: {
    fontWeight: "600",
    color: palette.text,
    marginBottom: 4,
    minHeight: 32,
  },
  price: {
    fontWeight: "bold",
    color: palette.primary,
  },
  footer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    alignItems: "flex-end",
  },
  addButton: {
    margin: 0,
  },
});
