import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import AppInput, { FormInput } from "@/components/Form/AppInput";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { SalesProvider, useSales } from "@/contexts/SalesContext";
import { AlertsProvider, useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React, { useRef } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  IconButton,
  MD3LightTheme,
  PaperProvider,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";

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
  const { cartItemsCount } = useSales();

  const theme = {
    ...MD3LightTheme,
    roundness: 2,
    colors: {
      ...MD3LightTheme.colors,
      primary: palette.primary,
      secondary: palette.secondary,
      surface: palette.surface,
      background: palette.background,
      onBackground: palette.text,
      onSurface: palette.textSecondary,
      surfaceVariant: palette.card,
      error: palette.error,
      outline: palette.border,
    },
  };

  // Detección de móvil
  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;

  // Estado para modal del carrito en móviles
  const [showCartModal, setShowCartModal] = React.useState(false);

  return (
    <AppForm
      disableScroll
      showButtons={false}
      initialValues={{
        method: "efectivo",
      }}
      style={[{ backgroundColor: palette.background, padding: 0 }]}
      containerStyle={{
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 0 : 16,
        height: "100%",
      }}
    >
      <View
        style={{
          flex: 1,
          padding: 16,
          //paddingTop: onBack || type === "purchases" ? 80 : 16,
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
          style={{
            zIndex: 2,
          }}
        >
          <PaperProvider theme={theme}>
            <AlertsProvider>
              <View style={{ flex: 1, backgroundColor: palette.background }}>
                {/* Header del modal */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    backgroundColor: palette.surface,
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
                  <IconButton
                    onPress={() => setShowCartModal(false)}
                    icon="close"
                  />
                </View>

                {/* Contenido del carrito */}
                <View style={{ flex: 1, padding: 16 }}>
                  <SideCart
                    type={type}
                    readonly={readonly}
                    onCloseCartModal={() => setShowCartModal(false)}
                  />
                </View>
              </View>
            </AlertsProvider>
          </PaperProvider>
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
      <Chip
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
        style={[
          {
            backgroundColor: "#fff",
            borderColor: palette.error,
          },
          selectedCategories.includes(category.id) && styles.selected,
        ]}
        elevation={0}
      >
        <Text
          style={{
            textAlign: "center",
          }}
        >
          {category.name}
        </Text>
      </Chip>
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

// Componente para campos adicionales según el método de pago
function PaymentMethodFields({ cartTotal }: { cartTotal: number }) {
  const form = useFormikContext<any>();
  const paymentMethod = form.values.payment_method;

  return (
    <>
      {/* Monto recibido solo para efectivo */}
      {paymentMethod === "efectivo" && (
        <FormInput
          name="received_amount"
          label="Monto Recibido"
          keyboardType="numeric"
          placeholder={`Mínimo: ${new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
          }).format(cartTotal)}`}
          left={
            <TextInput.Icon
              icon={() => (
                <MaterialCommunityIcons
                  name="cash"
                  size={20}
                  color={palette.primary}
                />
              )}
            />
          }
        />
      )}
    </>
  );
}

interface SideCartProps {
  name?: string;
  type?: "sales" | "purchases";
  readonly?: boolean;
  onClose?: () => void;
  onCloseCartModal?: () => void;
}

export function SideCart(props: SideCartProps) {
  const form = useFormikContext<any>();
  const formRef = useRef<AppFormRef>(null);
  const params = useLocalSearchParams();
  const returnTo = params.returnTo as string;
  const auth = useAuth();
  const {
    cart,
    cartTotal,
    cartItemsCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    onConfirm,
    reloadProducts,
  } = useSales();

  const [showTicket, setShowTicket] = React.useState(false);
  const [saleData, setSaleData] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);
  const alerts = useAlerts();

  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();

  const handleConfirmSale = async () => {
    const values = formRef.current?.getValues();

    // Validar que el monto recibido sea suficiente para efectivo
    if (
      values.payment_method === "efectivo" &&
      parseFloat(values.received_amount) < cartTotal
    ) {
      alerts.error("El monto recibido debe ser mayor o igual al total");
      return;
    }
    // Confirmar la venta
    const confirmed = await alerts.confirm(
      `¿Confirmas la venta por ${new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(cartTotal)}?`,
      {
        title: "Confirmar Venta",
        okText: "Confirmar",
        cancelText: "Cancelar",
      }
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      // Validar que haya una ubicación seleccionada
      if (!auth.location?.id) {
        alerts.error("No se ha seleccionado una ubicación");
        return;
      }

      // Preparar datos para el backend
      const payload = {
        location_id: auth.location.id,
        movement_date: new Date(
          new Date().getTime() - new Date().getTimezoneOffset() * 60000
        )
          .toISOString()
          .split("T")[0],
        payment_method: values.payment_method,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email,
        received_amount:
          values.payment_method === "efectivo"
            ? parseFloat(values.received_amount)
            : undefined,
        notes: values.notes,
        company_id: auth.selectedCompany?.id,
        details: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };

      // Guardar venta en el backend
      const response = await Services.sales.store(payload as any);

      // Guardar datos de la venta para mostrar en el ticket
      setSaleData({
        ...response.data,
        cart,
        cartTotal,
      });

      // Mostrar ticket
      setShowTicket(true);

      // Limpiar carrito
      clearCart();

      alerts.success("Venta guardada exitosamente");
    } catch (error: any) {
      console.error("Error al guardar la venta:", error);
      alerts.error(
        error.response?.data?.message ||
          error.message ||
          "Error al guardar la venta"
      );
    } finally {
      setSaving(false);
    }
  };

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
          paddingBottom: 12,
          borderBottomWidth: 2,
          borderBottomColor: palette.primary,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons
            name={props.type === "purchases" ? "package-variant" : "cart"}
            size={28}
            color={palette.primary}
          />
          <View>
            <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
              {props.type === "purchases" ? "Compras" : "Carrito"}
            </Text>
            <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
              {cartItemsCount} {cartItemsCount === 1 ? "producto" : "productos"}
            </Text>
          </View>
        </View>
        {cart.length > 0 && (
          <Button
            mode="text"
            onPress={clearCart}
            textColor={palette.error}
            icon="delete-outline"
            compact
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
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: palette.background,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <MaterialCommunityIcons
                name="cart-outline"
                size={60}
                color={palette.textSecondary}
              />
            </View>
            <Text
              variant="titleMedium"
              style={{
                textAlign: "center",
                color: palette.text,
                fontWeight: "bold",
                marginBottom: 8,
              }}
            >
              Carrito vacío
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                textAlign: "center",
                color: palette.textSecondary,
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
                      alignItems: "flex-start",
                      marginBottom: 12,
                      gap: 12,
                    }}
                  >
                    {/* Imagen del producto */}
                    <Image
                      source={{ uri: item.main_image?.uri }}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        backgroundColor: "#f0f0f0",
                      }}
                    />

                    {/* Información del producto */}
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 15,
                          marginBottom: 4,
                          color: palette.text,
                        }}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="barcode"
                          size={14}
                          color={palette.textSecondary}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: palette.textSecondary,
                          }}
                        >
                          {item.code}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="cash"
                          size={14}
                          color={palette.primary}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            color: palette.primary,
                            fontWeight: "600",
                          }}
                        >
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          }).format(item.price)}{" "}
                          c/u
                        </Text>
                      </View>
                    </View>

                    {/* Botón de eliminar */}
                    <IconButton
                      icon="close-circle"
                      iconColor={palette.error}
                      size={20}
                      onPress={() => removeFromCart(item.id)}
                      style={{ margin: 0 }}
                    />
                  </View>

                  {/* Controles de cantidad */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "white",
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: palette.border,
                      }}
                    >
                      <IconButton
                        icon="minus"
                        iconColor={palette.primary}
                        size={20}
                        onPress={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        style={{ margin: 0 }}
                      />
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 16,
                          marginHorizontal: 8,
                          minWidth: 30,
                          textAlign: "center",
                          color: palette.text,
                        }}
                      >
                        {item.quantity}
                      </Text>
                      <IconButton
                        icon="plus"
                        iconColor={palette.primary}
                        size={20}
                        onPress={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        style={{ margin: 0 }}
                      />
                    </View>

                    <View
                      style={{
                        backgroundColor: palette.primary,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 16,
                          color: "white",
                        }}
                      >
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(item.total)}
                      </Text>
                    </View>
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
            borderTopWidth: 2,
            borderTopColor: palette.border,
          }}
        >
          {/* Resumen de items */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={18}
                color={palette.textSecondary}
              />
              <Text style={{ color: palette.textSecondary }}>
                Total de productos:
              </Text>
            </View>
            <Text style={{ fontWeight: "bold", color: palette.text }}>
              {cartItemsCount}
            </Text>
          </View>
          {/* Formulario de Pago dentro del carrito */}
          {props.type === "sales" ? (
            <AppForm
              showButtons={false}
              initialValues={{
                payment_method: "efectivo",
                received_amount: cartTotal,
              }}
              style={{ padding: 0 }}
              ref={formRef}
            >
              <FormSelectSimple
                name="payment_method"
                label="Método de Pago"
                data={[
                  {
                    label: "Efectivo",
                    value: "efectivo",
                  },
                  {
                    label: "Tarjeta de Crédito/Débito",
                    value: "tarjeta",
                  },
                  {
                    label: "Transferencia Bancaria",
                    value: "transferencia",
                  },
                ]}
              />

              {/* Mostrar campo de monto recibido solo para efectivo */}
              <PaymentMethodFields cartTotal={cartTotal} />

              {/* Total */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: palette.background,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={24}
                    color={palette.primary}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: palette.text,
                    }}
                  >
                    Total:
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 22,
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
                  onPress={handleConfirmSale}
                  disabled={saving || cartItemsCount === 0}
                  loading={saving}
                  style={{
                    backgroundColor: palette.primary,
                    borderRadius: 8,
                  }}
                  contentStyle={{
                    paddingVertical: 8,
                  }}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name="check"
                      size={size}
                      color={color}
                    />
                  )}
                >
                  {saving ? "Guardando..." : "Procesar Pago"}
                </Button>
              )}
            </AppForm>
          ) : props.type === "purchases" ? (
            <>
              {/* Total para compras */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  backgroundColor: palette.background,
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={24}
                    color={palette.primary}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: palette.text,
                    }}
                  >
                    Total:
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 22,
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
                    onConfirm && onConfirm(cart, cartTotal);
                  }}
                  style={{
                    backgroundColor: palette.primary,
                    borderRadius: 8,
                  }}
                  contentStyle={{
                    paddingVertical: 8,
                  }}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name="checkbox-marked-circle"
                      size={size}
                      color={color}
                    />
                  )}
                >
                  {returnTo === "purchases"
                    ? "Confirmar y Regresar"
                    : "Confirmar Selección"}
                </Button>
              )}
            </>
          ) : null}
        </View>
      )}

      {/* Modal de Ticket */}
      <SaleTicketModal
        visible={showTicket}
        onClose={async () => {
          setShowTicket(false);
          onConfirm && onConfirm(cart, cartTotal);

          // Cerrar modal del carrito en móviles
          if (props.onCloseCartModal) {
            props.onCloseCartModal();
          }

          // Recargar productos para actualizar el stock
          await reloadProducts();
        }}
        saleData={saleData}
      />
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

// Componente Modal del Ticket
interface SaleTicketModalProps {
  visible: boolean;
  onClose: () => void;
  saleData: any;
}

function SaleTicketModal({ visible, onClose, saleData }: SaleTicketModalProps) {
  const ticketRef = React.useRef<View>(null);
  const alerts = useAlerts();

  if (!saleData) return null;

  const handlePrint = async () => {
    // Mostrar información sobre la impresión
    alerts.info(
      "Conecta una impresora térmica para imprimir el ticket automáticamente"
    );

    // Aquí iría la lógica de impresión real
    // Por ejemplo, usando una librería como react-native-thermal-printer
    // o enviando a un servicio de impresión
  };

  const handleClose = async () => {
    const confirmed = await alerts.confirm(
      "¿Deseas finalizar esta venta? El ticket se cerrará.",
      {
        title: "Finalizar Venta",
        okText: "Finalizar",
        cancelText: "Ver más",
      }
    );

    if (confirmed) {
      onClose();
    }
  };

  const theme = {
    ...MD3LightTheme,
    roundness: 2,
    colors: {
      ...MD3LightTheme.colors,
      primary: palette.primary,
      secondary: palette.secondary,
      surface: palette.surface,
      background: palette.background,
      onBackground: palette.text,
      onSurface: palette.textSecondary,
      surfaceVariant: palette.card,
      error: palette.error,
      outline: palette.border,
    },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        {/* Header */}
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
            <MaterialCommunityIcons name="receipt" size={24} /> Ticket de Venta
          </Text>
          <Button mode="text" onPress={handleClose} icon="close">
            Cerrar
          </Button>
        </View>

        {/* Contenido del Ticket */}
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View
            ref={ticketRef}
            style={{ backgroundColor: "white", padding: 24 }}
          >
            {/* Encabezado del Ticket */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 24,
                paddingBottom: 20,
                borderBottomWidth: 2,
                borderBottomColor: palette.primary,
              }}
            >
              <MaterialCommunityIcons
                name="receipt"
                size={48}
                color={palette.primary}
                style={{ marginBottom: 12 }}
              />
              <Text
                variant="headlineMedium"
                style={{
                  fontWeight: "bold",
                  color: palette.primary,
                  marginBottom: 4,
                }}
              >
                PlastiGest
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary, marginBottom: 12 }}
              >
                Sistema de Gestión Integral
              </Text>
              {saleData.sale_number && (
                <Text
                  variant="titleMedium"
                  style={{
                    fontWeight: "bold",
                    color: palette.primary,
                    marginBottom: 8,
                  }}
                >
                  Venta #{saleData.sale_number}
                </Text>
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#f0f0f0",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={palette.textSecondary}
                />
                <Text variant="bodySmall" style={{ color: "#666" }}>
                  {new Date(
                    saleData.movement_date || saleData.saleDate
                  ).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Text>
              </View>
            </View>

            {/* Información del Cliente */}
            {(saleData.customer_name ||
              saleData.customer_phone ||
              saleData.customer_email) && (
              <View
                style={{
                  marginBottom: 16,
                  backgroundColor: "#f8f9fa",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontWeight: "bold",
                    marginBottom: 12,
                    fontSize: 15,
                  }}
                >
                  Datos del Cliente
                </Text>
                {saleData.customer_name && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={18}
                      color={palette.primary}
                    />
                    <Text style={{ flex: 1 }}>{saleData.customer_name}</Text>
                  </View>
                )}
                {saleData.customer_phone && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="phone"
                      size={18}
                      color={palette.primary}
                    />
                    <Text style={{ flex: 1 }}>{saleData.customer_phone}</Text>
                  </View>
                )}
                {saleData.customer_email && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="email"
                      size={18}
                      color={palette.primary}
                    />
                    <Text style={{ flex: 1 }}>{saleData.customer_email}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Productos */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontWeight: "bold",
                  marginBottom: 12,
                  fontSize: 15,
                }}
              >
                Productos
              </Text>

              {saleData.cart.map((item: any, index: number) => (
                <View
                  key={item.id}
                  style={{
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottomWidth: index < saleData.cart.length - 1 ? 1 : 0,
                    borderBottomColor: "#eee",
                    backgroundColor: "#f8f9fa",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    {/* Imagen del producto en el ticket */}
                    <Image
                      source={{ uri: item.main_image?.uri }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 6,
                        backgroundColor: "#e0e0e0",
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                        {item.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="barcode"
                          size={14}
                          color="#666"
                        />
                        <Text variant="bodySmall" style={{ color: "#666" }}>
                          {item.code}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <MaterialCommunityIcons
                        name="cart"
                        size={16}
                        color={palette.textSecondary}
                      />
                      <Text style={{ color: "#666" }}>
                        {item.quantity} x{" "}
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(item.price)}
                      </Text>
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
                </View>
              ))}
            </View>

            {/* Totales */}
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: "#000",
                paddingTop: 16,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>TOTAL:</Text>
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
                  }).format(saleData.cartTotal)}
                </Text>
              </View>

              {/* Información de Pago */}
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
                  Método de Pago:
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: "#f8f9fa",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      saleData.payment_method === "efectivo"
                        ? "cash"
                        : saleData.payment_method === "tarjeta"
                        ? "credit-card"
                        : "bank-transfer"
                    }
                    size={24}
                    color={palette.primary}
                  />
                  <Text style={{ fontSize: 15 }}>
                    {saleData.payment_method === "efectivo"
                      ? "Efectivo"
                      : saleData.payment_method === "tarjeta"
                      ? "Tarjeta"
                      : "Transferencia"}
                  </Text>
                </View>

                {saleData.payment_method === "efectivo" && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: "#666" }}>Monto Recibido:</Text>
                      <Text style={{ fontWeight: "600" }}>
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(saleData.received_amount)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        backgroundColor: palette.success + "20",
                        padding: 12,
                        borderRadius: 8,
                        borderLeftWidth: 4,
                        borderLeftColor: palette.success,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="cash-refund"
                          size={20}
                          color={palette.success}
                        />
                        <Text
                          style={{
                            fontWeight: "bold",
                            color: palette.success,
                          }}
                        >
                          Cambio:
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 16,
                          color: palette.success,
                        }}
                      >
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(
                          saleData.received_amount - saleData.cartTotal
                        )}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Pie del Ticket */}
            <View
              style={{
                alignItems: "center",
                borderTopWidth: 2,
                borderTopColor: palette.primary,
                paddingTop: 20,
                marginTop: 8,
              }}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color={palette.success}
                style={{ marginBottom: 12 }}
              />
              <Text
                variant="titleMedium"
                style={{
                  textAlign: "center",
                  fontWeight: "bold",
                  color: palette.primary,
                  marginBottom: 4,
                }}
              >
                ¡Gracias por su compra!
              </Text>
              <Text
                variant="bodySmall"
                style={{ textAlign: "center", color: "#666" }}
              >
                Conserve este ticket para cualquier aclaración
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Botones de Acción */}
        <View style={{ padding: 16, backgroundColor: "white", gap: 8 }}>
          <Button
            mode="contained"
            onPress={handlePrint}
            icon="printer"
            style={{ backgroundColor: palette.primary }}
          >
            Imprimir Ticket
          </Button>
          <Button mode="outlined" onPress={onClose} icon="check">
            Finalizar Venta
          </Button>
        </View>
      </View>
    </Modal>
  );
}
