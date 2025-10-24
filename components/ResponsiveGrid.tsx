import { useResponsive } from "@/hooks/useResponsive";
import React, { useState } from "react";
import { LayoutChangeEvent, View, ViewStyle } from "react-native";

interface ResponsiveGridProps {
  children: React.ReactNode[];
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  padding?: number;
  style?: ViewStyle;
  itemStyle?: ViewStyle;
  renderItem?: (
    item: React.ReactNode,
    index: number,
    itemWidth: number
  ) => React.ReactNode;
}

export default function ResponsiveGrid({
  children,
  columns,
  gap = 12,
  padding = 16,
  style,
  itemStyle,
  renderItem,
}: ResponsiveGridProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const responsive = useResponsive({
    columns: {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
      ...columns,
    },
    gap,
    padding,
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const gridStyles =
    containerWidth > 0 ? responsive.getGridStyles(containerWidth) : null;
  const itemWidth =
    containerWidth > 0 ? responsive.getItemWidth(containerWidth) : 0;

  return (
    <View style={[style]} onLayout={handleLayout}>
      {gridStyles && (
        <View style={[gridStyles.container]}>
          {children.map((child, index) => (
            <View key={index} style={[gridStyles.item, itemStyle]}>
              {renderItem ? renderItem(child, index, itemWidth) : child}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Componente especializado para productos
interface ProductGridProps {
  products: App.Entities.Product[];
  onProductPress?: (product: App.Entities.Product) => void;
  renderProduct?: (
    product: App.Entities.Product,
    width: number
  ) => React.ReactNode;
  columns?: ResponsiveGridProps["columns"];
  gap?: number;
  padding?: number;
}

export function ProductGrid({
  products,
  onProductPress,
  renderProduct,
  columns = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
  },
  gap = 12,
  padding = 16,
}: ProductGridProps) {
  return (
    <ResponsiveGrid
      columns={columns}
      gap={gap}
      padding={padding}
      renderItem={(_, index, width) => {
        const product = products[index];
        if (renderProduct) {
          return renderProduct(product, width);
        }

        // Default product card
        return (
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              padding: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {/* Your product card content */}
          </View>
        );
      }}
    >
      {products}
    </ResponsiveGrid>
  );
}
