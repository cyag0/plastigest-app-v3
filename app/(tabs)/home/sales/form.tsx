import AppForm from "@/components/Form/AppForm/AppForm";
import AppInput from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { SalesProvider, useSales } from "./salesContext";

export default function SalesForm() {
  return (
    <SalesProvider>
      <App />
    </SalesProvider>
  );
}

function App() {
  return (
    <AppForm
      disableScroll
      showButtons={false}
      style={[{ backgroundColor: palette.background, padding: 0 }]}
      containerStyle={{ flexDirection: "row", gap: 16, height: "100%" }}
    >
      <View style={{ flex: 1, padding: 16 }}>
        <SelectCategories />
        <ArticlesList />
      </View>
      <View style={{ width: 300, flexBasis: 400 }}>
        <SideCart />
      </View>
    </AppForm>
  );
}

function SelectCategories() {
  const { categories, selectedCategories, setSelectedCategories } = useSales();

  function Category({
    category,
    onPress,
  }: {
    category: App.Entities.Category;
    onPress?: () => void;
  }) {
    return (
      <TouchableRipple
        onPress={() => {
          if (onPress) {
            onPress();
            return;
          }

          if (selectedCategories.includes(category.id)) {
            setSelectedCategories(
              selectedCategories.filter((value) => value !== category.id)
            );
          } else {
            setSelectedCategories([...selectedCategories, category.id]);
          }
        }}
      >
        <Card
          style={[
            {
              backgroundColor: "#fff",
              borderWidth: 0,
              outlineWidth: 0,
              elevation: 0,
              width: 120,
              height: 120,
            },
            selectedCategories.includes(category.id) && styles.selected,
          ]}
          elevation={0}
        >
          <Card.Content style={{ alignItems: "center", gap: 8 }}>
            <Avatar.Image
              source={{
                uri: "https://plastigest.com.mx/storage/categories/",
              }}
              style={{
                borderRadius: 8,
                width: 40,
                backgroundColor: "#f0f0f0",
                height: 40,
              }}
            />
            <Text
              style={{
                textAlign: "center",
              }}
            >
              {category.name}
            </Text>
          </Card.Content>
        </Card>
      </TouchableRipple>
    );
  }

  return (
    <View>
      <View style={styles.titleContainer}>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
            Selecciona la Categoría
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <AppInput mode="flat" label={"Ej. Aceite de coco, Agua de coco"} />
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        contentContainerStyle={{ gap: 16, marginVertical: 16 }}
      >
        {/* <Category
          category={{ id: 0, name: "Todas" } as App.Entities.Category}
          onPress={() => {
            if (selectedCategories.length === categories.length) {
              setSelectedCategories([]);
            } else {
              setSelectedCategories(categories.map((cat) => cat.id));
            }
          }}
        /> */}
        {categories.map((category) => (
          <Category key={category.id} category={category} />
        ))}
      </ScrollView>
    </View>
  );
}

function Article({ product }: { product: App.Entities.Product }) {
  const imageUri =
    (product as any).image ??
    (product as any).images?.[0]?.url ??
    "https://via.placeholder.com/80";

  return (
    <TouchableRipple
      onPress={() => {
        // si el contexto provee una acción para añadir al carrito, la llamamos
        /* if (typeof addToCart === "function") addToCart(product); */
      }}
    >
      <Card
        elevation={0}
        style={{
          borderRadius: 8,
          backgroundColor: "#fff",
          elevation: 0, // 🔹 quita sombra en Android
          shadowColor: "transparent", // 🔹 quita sombra en iOS
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        }}
      >
        <Card.Content>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Avatar.Image
              source={{ uri: imageUri }}
              size={100}
              style={{ backgroundColor: "#f0f0f0", borderRadius: 6 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                {(product as any).name}
              </Text>
              <Text variant="bodySmall" numberOfLines={2} ellipsizeMode="tail">
                {(product as any).description}
              </Text>

              <Text
                variant="bodyMedium"
                style={{
                  marginTop: 4,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                {(() => {
                  const price =
                    (product as any).sale_price ?? (product as any).price;
                  if (price === null || price === undefined || price === "")
                    return "N/A";
                  try {
                    const num = Number(price);
                    return new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(isNaN(num) ? 0 : num);
                  } catch {
                    return `MXN ${price}`;
                  }
                })()}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text>
                {(product as any).price ? `$${(product as any).price}` : ""}
              </Text>
            </View>
          </View>

          <Button
            mode="contained"
            onPress={() => {
              // Acción para añadir al carrito
            }}
          >
            Añadir al carrito
          </Button>
        </Card.Content>
      </Card>
    </TouchableRipple>
  );
}

function ArticlesList() {
  const {
    selectedCategories,
    products = [],
    categoriesIds,
    productsByCategory,
    categories,
  } = useSales();

  const [layoutDimensions, setLayoutDimensions] = React.useState<{
    width: number;
    columns: number;
    itemWidth: number;
  }>({ width: 0, columns: 1, itemWidth: 0 });

  const scrollRef = React.useRef<ScrollView>(null);

  const allCategories =
    selectedCategories.length > 0 ? selectedCategories : categoriesIds;

  // Breakpoints mejorados con configuración más granular
  const getResponsiveConfig = (containerWidth: number) => {
    const breakpoints = {
      xs: { min: 0, columns: 1 }, // Mobile portrait
      sm: { min: 480, columns: 2 }, // Mobile landscape / Small tablet
      md: { min: 768, columns: 3 }, // Tablet portrait
      /*       lg: { min: 1024, columns: 4 }, // Tablet landscape / Small desktop
      xl: { min: 1440, columns: 5 }, // Large desktop
      xxl: { min: 1920, columns: 6 }, // Ultra-wide */
    };

    const currentBreakpoint =
      Object.values(breakpoints)
        .reverse()
        .find((bp) => containerWidth >= bp.min) || breakpoints.xs;

    const gap = 12;
    const padding = 0; // No padding since parent has it
    const totalGaps = gap * (currentBreakpoint.columns - 1);
    const availableWidth = Math.max(0, containerWidth - padding - totalGaps);
    const itemWidth = Math.floor(availableWidth / currentBreakpoint.columns);

    return {
      columns: currentBreakpoint.columns,
      itemWidth: Math.max(itemWidth, 200), // Minimum width for readability
      gap,
      containerWidth,
    };
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ gap: 12 }}
        ref={scrollRef}
        onLayout={(e) => {
          const config = getResponsiveConfig(e.nativeEvent.layout.width);
          setLayoutDimensions({
            width: config.containerWidth,
            columns: config.columns,
            itemWidth: config.itemWidth,
          });
        }}
      >
        {products.length === 0 ? (
          <Text>No hay productos</Text>
        ) : (
          allCategories.map((categoryId: number) => {
            const products = productsByCategory[categoryId] || [];
            const category =
              categories.find((cat) => cat.id === categoryId)?.name ||
              categoryId;

            if (products.length === 0) {
              return null;
            }

            return (
              <>
                <Text
                  key={categoryId}
                  variant="titleMedium"
                  style={[styles.fontBold, { marginTop: 16, marginBottom: 8 }]}
                >
                  {`Categoría ${category}`}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  {products.map((product: App.Entities.Product) => {
                    return (
                      <View
                        key={product.id}
                        style={{
                          flexBasis: layoutDimensions.itemWidth,
                          minWidth: layoutDimensions.itemWidth,
                          maxWidth: layoutDimensions.itemWidth,
                        }}
                      >
                        <Article product={product} />
                      </View>
                    );
                  })}
                </View>
              </>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function SideCart() {
  return (
    <View
      style={{
        height: "100%",
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
      }}
    >
      <Text variant="titleMedium" style={[styles.fontBold]}>
        Pedido
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fontBold: {
    fontWeight: "bold",
  },
  selected: {
    borderColor: palette.error,
    borderWidth: 2,
    backgroundColor: palette.info,
  },
});
