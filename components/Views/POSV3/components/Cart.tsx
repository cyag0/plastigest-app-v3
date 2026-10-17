import EmptyState from "@/components/App/EmptyState";
import palette, { type Palette } from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatUnitPrice, parseMoney, parseQuantity } from "@/utils/format";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Image, Keyboard, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Divider, Menu } from "react-native-paper";

export interface CartItemData {
  id: number | string;
  product_id: number;
  code: string;
  name: string;
  price: number; // Precio unitario
  quantity: number;
  total: number; // price * quantity
  unit_id?: number;
  unit_name?: string;
  unit_abbreviation?: string;
  unit?: string;
  /** Tipo de la unidad ("quantity", "mass", "volume"…); decide si admite decimales. */
  unit_type?: string;
  is_package?: boolean;
  main_image?: {
    uri: string;
  };
  available_units?: {
    id: number;
    name: string;
    abbreviation: string;
    price?: number;
    unit_type?: string;
  }[];
}

interface CartProps {
  items: CartItemData[];
  onRemoveItem?: (itemId: number | string) => void;
  onItemChange?: (
    itemId: number | string,
    action: "increment" | "decrement" | "unit" | "set",
    data?: any,
  ) => void;
  onClearCart?: () => void;
  onFinish?: () => void;
  isScreen?: boolean;
  showFooter?: boolean;
  /**
   * Todo el carrito (productos, contenido extra y total) se desplaza junto.
   * Para celular: con la lista en su propio ScrollView flex:1, el contenido
   * extra (forma de pago, origen de la transferencia) se quedaba con el
   * espacio y la lista se aplastaba a una franja donde no se veían las
   * cantidades ni los botones.
   */
  scrollAll?: boolean;
  /**
   * ¿Se pueden cambiar cantidad y unidad de los renglones? Sin permiso (p. ej.
   * una compra sin purchases_update) no se muestran +/−, el campo de cantidad
   * ni el selector de unidad. Por defecto sí.
   */
  canEditItems?: boolean;
  /** ¿Se pueden quitar renglones? Sin permiso no se muestra el bote. Por defecto sí. */
  canRemoveItems?: boolean;
  /**
   * ¿Se escribe el precio unitario de cada renglón? (compras: lo que de verdad
   * se pagó). Necesita onPriceChange. Por defecto no: el precio solo se ve.
   */
  canEditPrice?: boolean;
  /** Precio nuevo de un renglón, ya leído (sin negativos). */
  onPriceChange?: (itemId: number | string, price: number) => void;
  /** Título del encabezado. Por defecto "Carrito". */
  title?: string;
  /** Número junto al título. Por defecto, la suma de las cantidades. */
  count?: number;
  /**
   * Colores del tema (modo oscuro) en lugar de la paleta clara fija. Por
   * defecto no: Ventas y Transferencias le meten contenido (forma de pago,
   * notas) con la paleta fija y sin fondo propio, que en un carrito oscuro
   * no se leería.
   */
  themed?: boolean;
  children?: React.ReactNode;
}

/** Estilos y colores con que se pinta el carrito (tema o paleta fija). */
interface CartLook {
  styles: ReturnType<typeof makeStyles>;
  colors: Palette;
}

interface CartItemComponentProps {
  item: CartItemData;
  look: CartLook;
  canEdit: boolean;
  canRemove: boolean;
  onRemove: (itemId: number | string) => void;
  onItemChange: (
    itemId: number | string,
    action: "increment" | "decrement" | "unit" | "set",
    data?: any,
  ) => void;
  /** Con él, el precio unitario se escribe en el renglón. */
  onPriceChange?: (itemId: number | string, price: number) => void;
}

/**
 * Peso, volumen y longitud admiten decimales (2.5 kg); las piezas (unidad de
 * tipo "quantity") y los paquetes se manejan enteros.
 */
const cartItemAllowsDecimal = (item: CartItemData): boolean => {
  const unitType =
    item.unit_type ??
    item.available_units?.find((u) => u.id === item.unit_id)?.unit_type;
  const isPackage =
    item.is_package === true || String(item.id).startsWith("package_");
  return !isPackage && !!unitType && unitType !== "quantity";
};

const formatQuantity = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * Lo escrito en un campo con el foco se aplica aunque no llegue onBlur, como
 * al salir de él:
 * - al desmontarse: en Android el Modal deja de pintar su contenido en cuanto
 *   se cierra y el campo se iba sin onBlur ni onEndEditing (cerrar la compra
 *   con la X, o salir con la flecha atrás, con el teclado abierto);
 * - al ocultarse el teclado: en Android «atrás» lo oculta y el campo se queda
 *   con el foco; el total seguía con lo de antes y eso se confirmaba.
 * Antes el precio o la cantidad a medio escribir se perdía.
 */
function useCommitOnLeave(focused: boolean, commit: () => void) {
  const pendingRef = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    pendingRef.current = focused ? commit : null;
  });
  useEffect(() => {
    if (!focused) return;
    const subscription = Keyboard.addListener("keyboardDidHide", () => pendingRef.current?.());
    return () => subscription.remove();
  }, [focused]);
  useEffect(() => () => pendingRef.current?.(), []);
}

/**
 * Precio unitario editable. Acepta coma o punto ("12,50", "1,500.50"), sin
 * negativos; se guarda al salir del campo o con Enter. Fuera del campo se ve
 * el precio que tiene el carrito: si el valor no sirve, se descarta y vuelve
 * a verse ese. Al entrar el texto no cambia ("$12.50", que parseMoney también
 * lee): así queda seleccionado y lo que se escribe lo reemplaza.
 */
function CartPriceField({
  item,
  look,
  onPriceChange,
}: {
  item: CartItemData;
  look: CartLook;
  onPriceChange: (itemId: number | string, price: number) => void;
}) {
  // Los colores del renglón donde va: antes eran siempre los del tema y, en
  // un carrito con la paleta fija, en modo oscuro el «/kg» quedaba crema
  // sobre blanco.
  const { styles } = look;
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  // Lo que tenía el campo al entrar: si no se cambió, no se manda nada (un
  // precio de $0.025/g no se vuelve $0.03 solo por tocar el campo).
  const initialRef = useRef("");
  // onEndEditing, onSubmitEditing y onBlur pueden llegar juntos: aplicar una vez.
  const committedRef = useRef<string | null>(null);

  const commit = () => {
    if (committedRef.current === text) return;
    committedRef.current = text;
    if (text.trim() === initialRef.current) return;

    const parsed = parseMoney(text);
    if (parsed === null || parsed < 0) return;
    // Se puede seguir escribiendo sin salir del campo (se aplicó al ocultar
    // el teclado): lo que se compara después es lo último que se aplicó.
    initialRef.current = text.trim();
    onPriceChange(item.id, parsed);
  };
  useCommitOnLeave(focused, commit);

  return (
    <View style={styles.priceField}>
      <TextInput
        style={styles.priceInput}
        value={focused ? text : formatUnitPrice(item.price)}
        onChangeText={(value) => setText(value.replace(/-/g, ""))}
        onFocus={() => {
          const initial = formatUnitPrice(item.price);
          initialRef.current = initial;
          committedRef.current = null;
          setText(initial);
          setFocused(true);
        }}
        onSubmitEditing={commit}
        onEndEditing={commit}
        onBlur={() => {
          commit();
          setFocused(false);
        }}
        keyboardType="decimal-pad"
        selectTextOnFocus
        maxLength={14}
        returnKeyType="done"
        accessibilityLabel={`Precio por ${item.unit_name || item.unit_abbreviation || "unidad"} de ${item.name}`}
      />
      {!!item.unit_abbreviation && <Text style={styles.priceUnit}>/{item.unit_abbreviation}</Text>}
    </View>
  );
}

function CartItemComponent({
  item,
  look,
  canEdit,
  canRemove,
  onRemove,
  onItemChange,
  onPriceChange,
}: CartItemComponentProps) {
  const { styles, colors } = look;
  const [unitMenuVisible, setUnitMenuVisible] = useState(false);
  const allowDecimal = cartItemAllowsDecimal(item);
  // Mientras el campo tiene el foco se muestra lo que se escribe; fuera de él,
  // siempre la cantidad real del carrito (si el contexto rechaza el valor,
  // el campo no se queda mostrando una cantidad que no se va a cobrar).
  const [focused, setFocused] = useState(false);
  const [qtyText, setQtyText] = useState(formatQuantity(item.quantity));
  // onEndEditing y onBlur llegan juntos al salir del campo: aplicar una vez.
  const committedRef = useRef<string | null>(null);

  const handleQuantityChange = (delta: number) => {
    if (delta > 0) {
      onItemChange(item.id, "increment");
    } else {
      onItemChange(item.id, "decrement");
    }
  };

  const commitQuantity = () => {
    if (committedRef.current === qtyText) return;
    committedRef.current = qtyText;

    // "1,500" ya no se lee como 1.5: parseQuantity lo rechaza por ambiguo
    // (igual puede ser 1.5 kg que 1500 piezas) y "2,5" sigue siendo 2.5.
    const parsed = parseQuantity(qtyText);
    // Valor inválido: se descarta y vuelve a mostrarse la cantidad actual.
    if (parsed === null || parsed <= 0) return;
    if (!allowDecimal && !Number.isInteger(parsed)) return;

    const next = allowDecimal ? Math.round(parsed * 1000) / 1000 : parsed;
    if (next !== item.quantity) {
      onItemChange(item.id, "set", next);
    }
  };
  useCommitOnLeave(focused, commitQuantity);

  const handleUnitChange = (unitId: number) => {
    onItemChange(item.id, "unit", unitId);
    setUnitMenuVisible(false);
  };

  return (
    <View style={styles.itemContainer}>
      {/* Imagen y datos */}
      <View style={styles.itemRow}>
        <View style={styles.imageWrap}>
          {item.main_image?.uri ? (
            <Image
              source={{ uri: item.main_image.uri }}
              style={styles.productImage}
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

        <View style={styles.itemInfo}>
          <View style={styles.itemHeaderRow}>
            <View style={styles.itemTitleWrap}>
              <Text
                style={styles.itemName}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text style={styles.itemCode}>{item.code}</Text>
            </View>

            {/* Selector de unidad */}
            {canEdit && item.available_units && item.available_units.length > 1 && (
              <Menu
                visible={unitMenuVisible}
                onDismiss={() => setUnitMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.unitChip}
                    onPress={() => setUnitMenuVisible(true)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Unidad de ${item.name}: ${item.unit_name || item.unit_abbreviation || item.unit || "sin unidad"}`}
                  >
                    <Text style={styles.unitChipText} numberOfLines={1}>
                      {item.unit_abbreviation ||
                        item.unit_name ||
                        item.unit ||
                        "Unidad"}
                    </Text>
                    <MaterialCommunityIcons
                      name={unitMenuVisible ? "chevron-up" : "chevron-down"}
                      size={12}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                }
                contentStyle={styles.unitMenu}
              >
                {item.available_units.map((unit) => (
                  <Menu.Item
                    key={unit.id}
                    onPress={() => handleUnitChange(unit.id)}
                    title={`${unit.name} (${unit.abbreviation})`}
                    leadingIcon={
                      unit.id === item.unit_id ? "check" : undefined
                    }
                    titleStyle={
                      unit.id === item.unit_id
                        ? styles.unitMenuItemTextSelected
                        : undefined
                    }
                  />
                ))}
              </Menu>
            )}
          </View>

          <View style={styles.priceRow}>
            {onPriceChange ? (
              <CartPriceField item={item} look={look} onPriceChange={onPriceChange} />
            ) : (
              <Text style={styles.itemPrice}>
                {/* Con 4 decimales debajo de $1: $0.025/g se veía "$0.03 /g". */}
                {formatUnitPrice(item.price)}
                {item.unit_abbreviation && (
                  <Text style={styles.unitLabel}>
                    {" "}
                    /{item.unit_abbreviation}
                  </Text>
                )}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Controles de cantidad */}
      <View style={styles.quantityRow}>
        {canEdit ? (
          <View style={styles.quantityControls}>
            {/* Bajar de 1 quita el renglón: sin permiso para quitar no se ofrece. */}
            {(canRemove || item.quantity > 1) && (
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => handleQuantityChange(-1)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  item.quantity <= 1 ? `Quitar ${item.name}` : `Restar uno a ${item.name}`
                }
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={14}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.quantityInput}
              accessibilityLabel={`Cantidad de ${item.name}`}
              value={focused ? qtyText : formatQuantity(item.quantity)}
              onChangeText={setQtyText}
              onFocus={() => {
                committedRef.current = null;
                setQtyText(formatQuantity(item.quantity));
                setFocused(true);
              }}
              onEndEditing={commitQuantity}
              onBlur={() => {
                commitQuantity();
                setFocused(false);
              }}
              keyboardType={allowDecimal ? "decimal-pad" : "number-pad"}
              selectTextOnFocus
              maxLength={allowDecimal ? 9 : 6}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.qtyButton, styles.qtyButtonPrimary]}
              onPress={() => handleQuantityChange(1)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Sumar uno a ${item.name}`}
            >
              <MaterialCommunityIcons name="plus" size={14} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.quantityReadOnly}>
            {formatQuantity(item.quantity)}
            {item.unit_abbreviation ? ` ${item.unit_abbreviation}` : ""}
          </Text>
        )}

        <View style={styles.itemRight}>
          <Text style={styles.itemTotal}>${item.total.toFixed(2)}</Text>
          {canRemove && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(item.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${item.name}`}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color={colors.error}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function Cart({
  items,
  onRemoveItem = () => {},
  onItemChange = () => {},
  onClearCart,
  onFinish,
  isScreen = false,
  showFooter = true,
  scrollAll = false,
  canEditItems = true,
  canRemoveItems = true,
  canEditPrice = false,
  onPriceChange,
  title = "Carrito",
  count,
  themed = false,
  children,
}: CartProps) {
  // Con `themed` el carrito sigue el modo oscuro, como lo que la compra le
  // mete adentro (datos y botones del tema). Antes era siempre la paleta
  // clara fija y eso quedaba crema sobre blanco.
  const { colors: themeColors } = useTheme();
  const themedSheet = useThemedStyles(makeStyles);
  const look = useMemo<CartLook>(
    () => (themed ? { styles: themedSheet, colors: themeColors } : fixedLook),
    [themed, themedSheet, themeColors],
  );
  const { styles, colors } = look;
  const cartTotal = items.reduce((sum, item) => sum + item.total, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const priceChange = canEditPrice ? onPriceChange : undefined;

  const itemsContent =
    items.length === 0 ? (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon="cart-outline"
          title="El carrito está vacío"
          description="Agrega productos para comenzar"
          compact
        />
      </View>
    ) : (
      items.map((item, index) => (
        <View key={item.id}>
          <CartItemComponent
            item={item}
            look={look}
            canEdit={canEditItems}
            canRemove={canRemoveItems}
            onRemove={onRemoveItem}
            onItemChange={onItemChange}
            onPriceChange={priceChange}
          />
          {index < items.length - 1 && <View style={styles.itemDivider} />}
        </View>
      ))
    );

  // Total y botón de finalizar
  const footer =
    showFooter && items.length > 0 ? (
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Items</Text>
            <Text style={styles.totalValue}>{itemCount}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabelStrong}>Total</Text>
            <Text style={styles.totalAmount}>${cartTotal.toFixed(2)}</Text>
          </View>
        </View>

        {onFinish && (
          <TouchableOpacity
            onPress={onFinish}
            style={styles.finishButton}
            activeOpacity={0.7}
          >
            <Text style={styles.finishButtonText}>Finalizar</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>
    ) : null;

  return (
    <View style={[styles.container, isScreen && styles.screenContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          {items.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count ?? itemCount}</Text>
            </View>
          )}
        </View>
        {items.length > 0 && onClearCart && (
          <TouchableOpacity
            onPress={onClearCart}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="broom"
              size={14}
              color={colors.error}
            />
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <Divider style={styles.headerDivider} />

      {scrollAll ? (
        <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
          {itemsContent}
          {children}
          {footer}
        </ScrollView>
      ) : (
        <>
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {itemsContent}
          </ScrollView>
          {children}
          {footer}
        </>
      )}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.surface,
  },
  screenContainer: {
    // Estilos específicos cuando se muestra como pantalla
  },

  // --- Header ---
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing[4],
    paddingTop: tokens.spacing[4],
    paddingBottom: tokens.spacing[3],
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...tokens.typography.h3,
    color: c.text,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: tokens.radius.full,
    paddingHorizontal: 6,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    ...tokens.typography.micro,
    color: c.primary,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.md,
  },
  clearButtonText: {
    ...tokens.typography.micro,
    color: c.error,
    fontWeight: "600",
  },
  headerDivider: {
    backgroundColor: c.border,
  },

  // --- Items list ---
  itemsList: {
    flex: 1,
  },
  emptyWrap: {
    paddingTop: tokens.spacing[7],
  },
  itemContainer: {
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    gap: tokens.spacing[3],
  },
  itemRow: {
    flexDirection: "row",
    gap: tokens.spacing[3],
  },
  imageWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    backgroundColor: c.surfaceMuted,
  },
  productImage: {
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
  itemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing[2],
  },
  itemTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...tokens.typography.bodyMd,
    color: c.text,
    fontWeight: "600",
  },
  itemCode: {
    ...tokens.typography.micro,
    color: c.textMuted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemPrice: {
    ...tokens.typography.bodyMd,
    color: c.text,
    fontWeight: "600",
  },
  unitLabel: {
    ...tokens.typography.micro,
    color: c.textSecondary,
    fontWeight: "400",
  },
  priceField: { flexDirection: "row", alignItems: "center", gap: 4 },
  priceInput: {
    minWidth: 92,
    height: 30,
    paddingVertical: 0,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    color: c.text,
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },
  priceUnit: { fontSize: 12, color: c.textSecondary },

  // --- Unit chip in cart ---
  unitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: c.surfaceMuted,
  },
  unitChipText: {
    ...tokens.typography.micro,
    color: c.text,
    fontWeight: "600",
  },
  unitMenu: {
    marginTop: 4,
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    ...tokens.shadow.md,
    borderWidth: 1,
    borderColor: c.border,
    // Z-index alto para superponerse a las cards del carrito
    // sin verse transparente. Paper renderiza el Menu en un
    // portal, por lo que el zIndex va en el contentStyle.
    zIndex: 1000,
    elevation: 8,
  },
  unitMenuItemTextSelected: {
    color: c.primary,
    fontWeight: "600",
  },

  // --- Quantity row ---
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    backgroundColor: c.surfaceMuted,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.surface,
  },
  qtyButtonPrimary: {
    backgroundColor: c.primary,
  },
  quantityInput: {
    ...tokens.typography.bodyMd,
    minWidth: 48,
    height: 28,
    paddingVertical: 0,
    paddingHorizontal: 4,
    textAlign: "center",
    fontWeight: "700",
    color: c.text,
    fontVariant: ["tabular-nums"],
    backgroundColor: c.surface,
    borderRadius: tokens.radius.sm,
  },
  quantityReadOnly: {
    ...tokens.typography.bodyMd,
    fontWeight: "700",
    color: c.text,
    fontVariant: ["tabular-nums"],
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  itemTotal: {
    ...tokens.typography.bodyMd,
    fontWeight: "700",
    color: c.text,
    fontVariant: ["tabular-nums"],
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  itemDivider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: tokens.spacing[4],
  },

  // --- Footer ---
  footer: {
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  totalContainer: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[2],
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    ...tokens.typography.body,
    color: c.textSecondary,
  },
  totalLabelStrong: {
    ...tokens.typography.bodyMd,
    color: c.text,
    fontWeight: "600",
  },
  totalValue: {
    ...tokens.typography.body,
    color: c.text,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  totalAmount: {
    ...tokens.typography.h2,
    color: c.text,
    fontVariant: ["tabular-nums"],
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: c.primary,
    marginHorizontal: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    paddingVertical: 12,
    borderRadius: tokens.radius.md,
  },
  finishButtonText: {
    ...tokens.typography.bodyMd,
    color: c.primaryForeground,
    fontWeight: "700",
  },
}));

// Ventas y Transferencias: la paleta clara fija, como siempre. Sin
// StyleSheet.create, que devuelve el mismo objeto y no acepta el tipo de
// themedStyles.
const fixedLook: CartLook = {
  styles: makeStyles(palette),
  colors: palette,
};
