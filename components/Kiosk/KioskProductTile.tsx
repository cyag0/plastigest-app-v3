/**
 * Mosaico de producto: superficie del tema con borde de 1 y radio 16, sin
 * sombra. Foto 4:3 (o la inicial grande si no hay), nombre, precio y, si ya
 * está en el pedido, una pastilla con la cantidad. Sin existencias numéricas.
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { KioskProduct } from "@/utils/services/kiosk";
import { Image } from "expo-image";
import React, { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { displayPrice, formatCents, isSoldOut } from "./model";

interface Props {
  product: KioskProduct;
  /** Cuántos lleva ya en el pedido (todas sus opciones). */
  quantity: number;
  width: number;
  onPress: (product: KioskProduct) => void;
}

function KioskProductTile({ product, quantity, width, onPress }: Props) {
  const styles = useThemedStyles((c) => ({
    tile: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      gap: 8,
    },
    pressed: { backgroundColor: c.surfaceMuted, borderColor: c.borderStrong },
    soldOut: { opacity: 0.5 },
    media: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 12,
      backgroundColor: c.surfaceMuted,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    initial: { fontSize: 56, lineHeight: 64, fontWeight: "700", color: c.textMuted },
    badge: {
      position: "absolute",
      top: 8,
      right: 8,
      minWidth: 40,
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { fontSize: 18, fontWeight: "800", color: c.primaryForeground, fontVariant: ["tabular-nums"] },
    name: { fontSize: 18, lineHeight: 24, minHeight: 48, fontWeight: "600", color: c.text },
    price: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] },
    from: { fontSize: 16, fontWeight: "400", color: c.textSecondary },
    soldOutText: { fontSize: 16, lineHeight: 26, color: c.textSecondary },
  }));

  // Si la foto no carga se muestra la inicial (y se reintenta si cambia la URL).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const soldOut = isSoldOut(product);
  const price = displayPrice(product);
  const priceText = formatCents(price.cents);
  const showImage = !!product.image_url && failedUrl !== product.image_url;
  const initial = product.name.trim().charAt(0).toLocaleUpperCase("es-MX") || "?";

  const label = [
    product.name,
    soldOut ? "agotado" : `${price.from ? "desde " : ""}${priceText}`,
    quantity > 0 ? `${quantity} en tu pedido` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPress={soldOut ? undefined : () => onPress(product)}
      disabled={soldOut}
      style={({ pressed }) => [styles.tile, { width }, pressed && !soldOut && styles.pressed, soldOut && styles.soldOut]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: soldOut }}
      testID={`kiosk-product-${product.id}`}
    >
      <View style={styles.media}>
        {showImage ? (
          <Image
            source={{ uri: product.image_url as string }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy="memory-disk"
            recyclingKey={String(product.id)}
            transition={120}
            onError={() => setFailedUrl(product.image_url)}
            accessible={false}
          />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
        {quantity > 0 ? (
          <View style={styles.badge} testID={`kiosk-product-qty-${product.id}`}>
            <Text style={styles.badgeText}>{quantity}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      {soldOut ? (
        <Text style={styles.soldOutText}>Agotado</Text>
      ) : (
        <Text style={styles.price} numberOfLines={1}>
          {price.from ? <Text style={styles.from}>desde </Text> : null}
          {priceText}
        </Text>
      )}
    </Pressable>
  );
}

export default memo(KioskProductTile);
