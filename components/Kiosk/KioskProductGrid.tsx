/**
 * Cuadrícula de productos: 2 columnas en teléfono, 3 en tableta vertical y 4
 * en pantallas anchas. El ancho de cada mosaico sale del ancho disponible.
 */
import type { KioskProduct } from "@/utils/services/kiosk";
import React, { useCallback } from "react";
import { FlatList, Platform } from "react-native";
import KioskProductTile from "./KioskProductTile";

const PADDING = 16;
const GAP = 16;

interface Props {
  products: KioskProduct[];
  columns: number;
  /** Ancho del área de la cuadrícula. */
  width: number;
  quantityByProduct: ReadonlyMap<number, number>;
  onPressProduct: (product: KioskProduct) => void;
  /** Desplazarse también es actividad (rueda del ratón en web). */
  onScroll?: () => void;
  /** Espacio libre abajo (barra del pedido). */
  bottomInset?: number;
}

export default function KioskProductGrid({
  products,
  columns,
  width,
  quantityByProduct,
  onPressProduct,
  onScroll,
  bottomInset = 0,
}: Props) {
  const tileWidth = Math.max(120, Math.floor((width - PADDING * 2 - GAP * (columns - 1)) / columns));

  const renderItem = useCallback(
    ({ item }: { item: KioskProduct }) => (
      <KioskProductTile
        product={item}
        quantity={quantityByProduct.get(item.id) ?? 0}
        width={tileWidth}
        onPress={onPressProduct}
      />
    ),
    [quantityByProduct, tileWidth, onPressProduct],
  );

  return (
    <FlatList
      // Cambiar de columnas exige montar la lista de nuevo.
      key={`kiosk-grid-${columns}`}
      testID="kiosk-product-grid"
      data={products}
      numColumns={columns}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ padding: PADDING, gap: GAP, paddingBottom: PADDING + bottomInset }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={onScroll}
      scrollEventThrottle={500}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews={Platform.OS === "android"}
    />
  );
}
