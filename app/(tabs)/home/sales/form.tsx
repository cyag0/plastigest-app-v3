import AppForm from "@/components/Form/AppForm/AppForm";
import AppInput from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { SalesProvider, useSales } from "./salesContext";

interface POSFormProps {
  type?: "sales" | "purchases";
  supplier_id?: number;
  initialCart?: any[];
  onCartChange?: (cart: any[], total: number) => void;
  onConfirm?: (cart: any[], total: number) => void;
  onBack?: () => void;
  onClose?: () => void;
  readonly?: boolean;
}

export default function SalesForm(props: POSFormProps = {}) {
  const params = useLocalSearchParams();

  // Extraer parámetros de la URL si no se pasan como props
  const type = props.type || (params.type as "sales" | "purchases") || "sales";
  const supplier_id =
    props.supplier_id ||
    (params.supplier_id ? parseInt(params.supplier_id as string) : undefined);
  const initialCart =
    props.initialCart || (params.cart ? JSON.parse(params.cart as string) : []);
  const returnTo = params.returnTo as string;

  const handleBack =
    props.onBack ||
    props.onClose ||
    (() => {
      if (returnTo === "purchases") {
        router.back();
      } else {
        router.back();
      }
    });

  return (
    <SalesProvider
      type={type}
      //supplierId={supplier_id}
      initialCart={initialCart}
      onConfirm={props.onConfirm}
    >
      <App
        type={type}
        onBack={handleBack}
        readonly={props.readonly}
        onClose={props.onClose}
      />
    </SalesProvider>
  );
}

interface AppProps {
  type: "sales" | "purchases";
  onBack?: () => void;
  readonly?: boolean;
  onClose?: () => void;
}

function App({ type, onBack, readonly, onClose }: AppProps) {
  const title = type === "sales" ? "Punto de Venta" : "Gestión de Compras";
  const params = useLocalSearchParams();
  const { cart, cartTotal, cartItemsCount } = useSales();

  // Detección de móvil
  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;

  // Estado para modal del carrito en móviles
  const [showCartModal, setShowCartModal] = React.useState(false);

  // Función mejorada de regreso que incluye el carrito
  const handleBackWithCart = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <AppForm
      disableScroll
      showButtons={false}
      style={[{ backgroundColor: palette.background, padding: 0 }]}
      containerStyle={{
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 0 : 16,
        height: "100%",
      }}
    >
      {/* Header con título y botón de regreso */}
      {(onBack || type === "purchases") && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "white",
            padding: 16,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          {(onBack || params.returnTo) && (
            <Button mode="text" onPress={handleBackWithCart} icon="arrow-left">
              Regresar
            </Button>
          )}
        </View>
      )}

      <View
        style={{
          flex: 1,
          padding: 16,
          paddingTop: onBack || type === "purchases" ? 80 : 16,
        }}
      >
        <SelectCategories type={type} />
        <ArticlesList type={type} readonly={readonly} />
      </View>

      {/* SideCart solo en desktop */}
      {!isMobile && (
        <View style={{ width: 300, flexBasis: 400 }}>
          <SideCart type={type} readonly={readonly} onClose={onClose} />
        </View>
      )}

      {/* Botón flotante del carrito en móviles */}
      {isMobile && cartItemsCount > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            zIndex: 100,
          }}
        >
          <Button
            mode="contained"
            onPress={() => setShowCartModal(true)}
            style={{
              backgroundColor: "#333",
              borderRadius: 30,
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
            contentStyle={{
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
            labelStyle={{
              fontSize: 16,
              fontWeight: "bold",
            }}
            icon={"cart"}
          >
            Carrito • {cartItemsCount}
          </Button>
        </View>
      )}

      {/* Modal del carrito para móviles */}
      {isMobile && (
        <Modal
          visible={showCartModal}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowCartModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: palette.background }}>
            {/* Header del modal */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                backgroundColor: "white",
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <Text
                variant="titleLarge"
                style={{
                  fontWeight: "bold",
                  color: palette.primary,
                }}
              >
                {type === "purchases" ? "Compras" : "Carrito"}
              </Text>
              <Button
                mode="text"
                onPress={() => setShowCartModal(false)}
                icon="close"
              >
                Cerrar
              </Button>
            </View>

            {/* Contenido del carrito */}
            <View style={{ flex: 1, padding: 16 }}>
              <SideCart type={type} readonly={readonly} />
            </View>
          </View>
        </Modal>
      )}
    </AppForm>
  );
}

interface SelectCategoriesProps {
  type: "sales" | "purchases";
}

function SelectCategories({ type }: SelectCategoriesProps) {
  const {
    categories,
    selectedCategories,
    setSelectedCategories,
    searchText,
    setSearchText,
  } = useSales();

  const title =
    type === "sales" ? "Selecciona la Categoría" : "Filtrar por Categoría";
  const placeholder =
    type === "sales"
      ? "Ej. Aceite de coco, Agua de coco"
      : "Buscar materias primas...";

  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;

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
        {!isMobile && (
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
              {title}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View
            style={{
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <AppInput
              mode="flat"
              label={"Buscar productos..."}
              value={searchText}
              onChange={setSearchText}
              placeholder={placeholder}
              left={<TextInput.Icon icon="magnify" />}
            />
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
  const { addToCart, getCartQuantity, updateQuantity, type } = useSales();
  const imageUri = product.main_image?.uri;

  const cartQuantity = getCartQuantity(product.id);

  return (
    <TouchableRipple
      onPress={() => {
        if (cartQuantity === 0) {
          addToCart(product, 1);
        }
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
            <View style={{ position: "relative" }}>
              <Image
                source={{ uri: imageUri }}
                style={{
                  backgroundColor: "#f0f0f0",
                  borderRadius: 6,
                  width: 100,
                  height: 100,
                }}
              />
              {cartQuantity > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    backgroundColor: palette.primary,
                    borderRadius: 12,
                    minWidth: 24,
                    height: 24,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {cartQuantity}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                {(product as any).name}
              </Text>
              <Text variant="bodySmall" numberOfLines={2} ellipsizeMode="tail">
                {(product as any).description}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: "bold",
                    fontSize: 16,
                    color: palette.primary,
                  }}
                >
                  {(() => {
                    const isPurchase = type === "purchases";

                    const price = (product as any)[
                      isPurchase ? "purchase_price" : "sale_price"
                    ];
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

                <View style={{ alignItems: "flex-end" }}>
                  {(product as any).current_stock !== undefined && (
                    <Text
                      style={{
                        fontSize: 12,
                        color:
                          (product as any).current_stock > 0
                            ? palette.primary
                            : palette.red,
                        fontWeight: "500",
                      }}
                    >
                      Stock: {(product as any).current_stock}
                    </Text>
                  )}
                  {(product as any).current_stock <=
                    ((product as any).minimum_stock || 0) &&
                    (product as any).minimum_stock > 0 && (
                      <Chip
                        style={{
                          backgroundColor: palette.background,
                        }}
                        textStyle={{
                          fontSize: 10,
                          color: palette.error,
                        }}
                      >
                        Stock Bajo
                      </Chip>
                    )}
                </View>
              </View>
            </View>
          </View>

          {cartQuantity > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f0f0f0",
                borderRadius: 8,
                padding: 4,
              }}
            >
              <Button
                mode="outlined"
                onPress={() => updateQuantity(product.id, cartQuantity - 1)}
                style={{ minWidth: 40 }}
                contentStyle={{ paddingHorizontal: 8 }}
              >
                -
              </Button>
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 16,
                  marginHorizontal: 16,
                }}
              >
                {cartQuantity}
              </Text>
              <Button
                mode="outlined"
                onPress={() => addToCart(product, 1)}
                style={{ minWidth: 40 }}
                contentStyle={{ paddingHorizontal: 8 }}
              >
                +
              </Button>
            </View>
          ) : (
            <Button mode="contained" onPress={() => addToCart(product, 1)}>
              Añadir al carrito
            </Button>
          )}
        </Card.Content>
      </Card>
    </TouchableRipple>
  );
}

interface ArticlesListProps {
  type: "sales" | "purchases";
  readonly?: boolean;
}

function ArticlesList({ type, readonly }: ArticlesListProps) {
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

interface SideCartProps {
  name?: string;
  type?: "sales" | "purchases";
  readonly?: boolean;
  onClose?: () => void;
}

export function SideCart(props: SideCartProps) {
  const form = useFormikContext<any>();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo as string;
  const {
    cart,
    cartTotal,
    cartItemsCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    onConfirm,
  } = useSales();

  return (
    <View
      style={{
        height: "100%",
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header del carrito */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text variant="titleMedium" style={[styles.fontBold]}>
          <MaterialCommunityIcons
            name={props.type === "purchases" ? "package" : "cart"}
            size={24}
            color="#000"
          />
          {props.type === "purchases" ? "Compras" : "Carrito"} ({cartItemsCount}
          )
        </Text>
        {cart.length > 0 && (
          <Button
            mode="text"
            onPress={clearCart}
            textColor={palette.error}
            contentStyle={{ paddingHorizontal: 8 }}
          >
            Limpiar
          </Button>
        )}
      </View>

      {/* Lista de productos en el carrito */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {cart.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 32,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: "#666",
                fontSize: 16,
              }}
            >
              Carrito vacío
            </Text>
            <Text
              style={{
                textAlign: "center",
                color: "#999",
                fontSize: 14,
                marginTop: 8,
              }}
            >
              Agrega productos para comenzar
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {cart.map((item) => (
              <Card
                key={item.id}
                style={{
                  backgroundColor: "#f8f9fa",
                  elevation: 1,
                }}
              >
                <Card.Content style={{ padding: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#666",
                          marginBottom: 4,
                        }}
                      >
                        {item.code}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#666",
                        }}
                      >
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(item.price)}{" "}
                        c/u
                      </Text>
                    </View>

                    <Button
                      mode="text"
                      onPress={() => removeFromCart(item.id)}
                      textColor={palette.error}
                      contentStyle={{ padding: 4 }}
                    >
                      ✕
                    </Button>
                  </View>

                  {/* Controles de cantidad */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#e9ecef",
                        borderRadius: 6,
                        padding: 2,
                      }}
                    >
                      <Button
                        mode="text"
                        onPress={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        contentStyle={{ padding: 4 }}
                        style={{ minWidth: 32 }}
                      >
                        -
                      </Button>
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 16,
                          marginHorizontal: 12,
                          minWidth: 20,
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </Text>
                      <Button
                        mode="text"
                        onPress={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        contentStyle={{ padding: 4 }}
                        style={{ minWidth: 32 }}
                      >
                        +
                      </Button>
                    </View>

                    <Text
                      style={{
                        fontWeight: "bold",
                        fontSize: 16,
                        color: palette.primary,
                      }}
                    >
                      {new Intl.NumberFormat("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      }).format(item.total)}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer con total y botones */}
      {cart.length > 0 && (
        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "#e0e0e0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Total:
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: palette.primary,
              }}
            >
              {new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
              }).format(cartTotal)}
            </Text>
          </View>

          {!props.readonly && (
            <Button
              mode="contained"
              onPress={() => {
                const action = props.type === "purchases" ? "compra" : "venta";
                onConfirm && onConfirm(cart, cartTotal);
              }}
              style={{
                backgroundColor: palette.primary,
              }}
            >
              {props.type === "purchases"
                ? returnTo === "purchases"
                  ? "✅ Confirmar y Regresar"
                  : "📦 Confirmar Selección"
                : "💳 Proceder con la Venta"}
            </Button>
          )}
        </View>
      )}
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
