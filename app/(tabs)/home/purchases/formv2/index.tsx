import { formatMoney, formatQuantity } from "@/utils/format";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import { FormInput } from "@/components/Form/AppInput";
import AppDependency from "@/components/Form/AppDependency";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormProSelect } from "@/components/Form/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { FormSwitch } from "@/components/Form/AppSwitch";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useResponsive } from "@/hooks/useResponsive";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text as RNText, TouchableOpacity, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { usePurchase } from "./PurchaseContext";
import { toLocalDateString } from "@/utils/dates";

interface PurchasesFormProps {
  id?: number;
  readonly?: boolean;
}

function CartHeaderButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={cartBtnStyles.btn}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Ver carrito"
    >
      <MaterialCommunityIcons name="cart-outline" size={24} color={palette.text} />
      {count > 0 && (
        <View style={cartBtnStyles.badge}>
          <RNText style={cartBtnStyles.badgeText}>{count > 99 ? "99+" : count}</RNText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const cartBtnStyles = StyleSheet.create({
  btn: { padding: 8, marginRight: 4 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" as const },
});

export default function PurchaseFormScreen(props: PurchasesFormProps) {
  const router = useRouter();
  const alerts = useAlerts();
  const navigation = useNavigation();
  const { isMobile } = useResponsive();

  const purchaseContext = usePurchase();
  const { selectedLocation } = useSelectedLocation();
  // Los productos se guardan en el borrador al agregarlos; confirmar la
  // compra (POST purchases-v2/{id}/confirm) pide purchases_update.
  const canConfirm = useCan().can("purchases_update");

  const cartItemCount = purchaseContext.cartItems?.length ?? 0;

  // En mobile inyectamos botón del carrito en el AppBar.
  useEffect(() => {
    if (!isMobile) return;
    navigation.setOptions({
      headerRight: () => (
        <CartHeaderButton
          count={cartItemCount}
          onPress={() => router.push("/(tabs)/home/purchases/formv2/carrito" as any)}
        />
      ),
    });
  }, [isMobile, cartItemCount]);

  // La compra que se edita la carga el contexto (la de la ruta o el último
  // borrador) y llena el formulario. Si ya cargó antes de montar el formulario
  // (se entró por productos), se arranca con ella.
  const [initialFormValues] = useState(() => ({
    supplier_id: "",
    purchase_date: toLocalDateString(),
    notes: "",
    document_number: "",
    payment_method: "other",
    paid_from_cash: true,
    ...(purchaseContext.getDraftHeader() ?? {}),
  }));

  const handleSubmit = async (values: FormData) => {
    try {
      console.log("Submitting purchase form with values:", values);

      // Validar que haya productos en el carrito
      if (
        !purchaseContext.cartItems ||
        purchaseContext.cartItems.length === 0
      ) {
        alerts.error("Debes agregar al menos un producto al carrito");
        return false;
      }

      // Validar campos requeridos
      if (!values.has("supplier_id")) {
        alerts.error("Debes seleccionar un proveedor");
        return false;
      }

      if (!values.has("purchase_date")) {
        alerts.error("Debes especificar la fecha de compra");
        return false;
      }

      // Confirmar la compra usando el contexto: primero manda los cambios
      // pendientes y verifica que el servidor tenga lo que muestra el carrito.
      // Solo una compra en efectivo puede salir de la caja; con tarjeta,
      // transferencia u otro medio nunca toca el corte.
      const paymentMethod = values.get("payment_method")?.toString();
      const confirmed = await purchaseContext.confirmPurchase({
        supplier_id: values.get("supplier_id")?.toString(),
        purchase_date: values.get("purchase_date")?.toString(),
        document_number: values.get("document_number")?.toString(),
        payment_method: paymentMethod,
        paid_from_cash:
          paymentMethod === "cash" && values.get("paid_from_cash")?.toString() !== "0",
        notes: values.get("notes")?.toString() ?? "",
      });
      // Ya había una confirmación en curso (doble toque).
      if (!confirmed) return false;

      router.replace(`/(tabs)/home/purchases` as any);
      alerts.success("Compra confirmada exitosamente");

      return true;
    } catch (error: any) {
      console.error("Error confirming purchase:", error);

      // El motivo del servidor (message o error) o el de la verificación del
      // carrito; nunca el texto en inglés de axios.
      const data = error?.response?.data;
      const errorMessage =
        (error?.isAxiosError && !error.response
          ? "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo."
          : null) ||
        (data?.errors ? (Object.values(data.errors).flat()[0] as string) : null) ||
        data?.message ||
        data?.error ||
        (!error?.response ? error?.message : null) ||
        "Error al confirmar la compra";
      alerts.error(errorMessage);
      return false;
    }
  };

  return (
    <AppForm
      // El contexto llena el formulario con el borrador guardado (proveedor,
      // fecha, forma de pago); sin la ref, al reabrir un borrador el carrito
      // tenía productos pero el proveedor quedaba vacío.
      ref={purchaseContext.formRef}
      submitButtonText="Confirmar Compra"
      showSubmitButton={canConfirm}
      initialValues={initialFormValues}
      onSubmit={async (values: any) => {
        const res = await alerts.confirm("¿Deseas confirmar esta compra?", {
          title: "Confirmar Compra",
          okText: "Confirmar",
          cancelText: "Cancelar",
        });

        if (res) {
          await handleSubmit(values);
        }
      }}
      containerStyle={{
        paddingBottom: 24,
      }}
      showResetButton={false}
    >
      <View style={styles.formCard}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="cash-register"
            size={48}
            color={palette.primary}
          />
          <Text variant="headlineMedium" style={styles.title}>
            {purchaseContext.currentPurchaseId
              ? `Compra #${purchaseContext.currentPurchaseId}`
              : "Nueva compra"}
          </Text>
          {/* La compra entra a la sucursal actual (antes había selects de
              compañía y ubicación deshabilitados y vacíos). */}
          {selectedLocation?.name ? (
            <Text variant="bodyMedium" style={styles.subtitle}>
              Se recibe en {selectedLocation.name}
            </Text>
          ) : null}
          {!canConfirm ? (
            <Text variant="bodySmall" style={styles.subtitle}>
              La compra queda guardada como borrador. Confirmarla requiere
              permiso para actualizar compras.
            </Text>
          ) : null}
        </View>

        <FormDatePicker
          name="purchase_date"
          label="Fecha de Compra"
          placeholder="YYYY-MM-DD"
          required
        />

        <FormProSelect
          name="supplier_id"
          label="Proveedor"
          onChange={(value) => {
            purchaseContext.loadData(value);
          }}
          model="suppliers"
          placeholder="Seleccionar proveedor"
        />

        <FormSelectSimple
          name="payment_method"
          label="Método de pago"
          data={[
            { value: "cash",     label: "Efectivo" },
            { value: "card",     label: "Tarjeta" },
            { value: "transfer", label: "Transferencia" },
            { value: "other",    label: "Otro" },
          ]}
        />

        {/* Una compra grande pagada por el dueño o desde el banco no debe
            dejar la caja en negativo: solo se descuenta si salió de ella. */}
        <AppDependency name="payment_method">
          {(value) =>
            value === "cash" ? (
              <FormSwitch
                name="paid_from_cash"
                text="Pagado con dinero de la caja (se descuenta en el corte)"
              />
            ) : null
          }
        </AppDependency>

        <AppDependency name="supplier_id">
          {(value) => {
            if (!value) {
              return (
                <View style={styles.emptyMessage}>
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color={palette.textSecondary}
                  />
                  <Text variant="bodySmall" style={styles.emptyText}>
                    Selecciona un proveedor para agregar productos
                  </Text>
                </View>
              );
            }

            return <PurchasesContent supplier_id={value} />;
          }}
        </AppDependency>

        <FormInput
          name="notes"
          label="Notas (opcional)"
          placeholder="Observaciones de la compra"
          multiline
          numberOfLines={3}
        />
      </View>
    </AppForm>
  );
}

interface PurchasesContentProps {
  supplier_id: number;
}

function PurchasesContent(props: PurchasesContentProps) {
  const router = useRouter();
  const formContext = useFormikContext<any>();

  const purchaseContext = usePurchase();

  const cartItems = purchaseContext.cartItems || [];
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>
            Productos en carrito
          </Text>
          <Text variant="headlineSmall" style={styles.statValue}>
            {cartItems.length}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>
            Total
          </Text>
          <Text
            variant="headlineSmall"
            style={[styles.statValue, { color: palette.primary }]}
          >
            {formatMoney(cartTotal)}
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={() =>
            router.push(
              `/(tabs)/home/purchases/formv2/productos?supplier_id=${props.supplier_id}` as any,
            )
          }
          style={styles.button}
          icon="package-variant"
        >
          {cartItems.length === 0 ? "Agregar productos" : "Editar productos"}
        </Button>
      </View>

      {/* Lista de productos en el carrito - modo solo lectura */}
      {cartItems.length > 0 ? (
        <View style={styles.cartPreview}>
          <View style={styles.cartPreviewHeader}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={16}
              color={palette.textSecondary}
            />
            <Text style={styles.cartPreviewTitle}>
              PRODUCTOS ({cartItems.length})
            </Text>
          </View>

          <View style={styles.cartPreviewList}>
            {cartItems.map((item, index) => (
              <View
                key={item.id ?? `${item.product_id}-${item.unit_id}-${index}`}
                style={[
                  styles.cartPreviewItem,
                  index < cartItems.length - 1 && styles.cartPreviewItemDivider,
                ]}
              >
                <View style={styles.cartPreviewImageWrap}>
                  {item.main_image?.uri ? (
                    <Image
                      source={{ uri: item.main_image.uri }}
                      style={styles.cartPreviewImage}
                    />
                  ) : (
                    <View style={styles.cartPreviewImagePlaceholder}>
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={18}
                        color={palette.textMuted}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.cartPreviewInfo}>
                  <Text
                    style={styles.cartPreviewName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.cartPreviewCode}>
                    {item.code}
                    {item.unit_abbreviation
                      ? ` · ${item.unit_abbreviation}`
                      : ""}
                  </Text>
                </View>

                <View style={styles.cartPreviewNumbers}>
                  <Text style={styles.cartPreviewQty}>
                    {formatQuantity(item.quantity)} × {formatMoney(item.price)}
                  </Text>
                  <Text style={styles.cartPreviewTotal}>
                    {formatMoney(item.total)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyMessage}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color={palette.textSecondary}
          />
          <Text variant="bodySmall" style={styles.emptyText}>
            Agrega productos para comenzar una compra
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },
  // Card que envuelve todo el contenido del formulario de compras.
  // Limita el ancho maximo para mantener legibilidad en pantallas
  // grandes y desactiva la sombra (sombra transparente) para un
  // look mas limpio, dejando que el border sutil defina los limites.
  formCard: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: tokens.spacing[5],
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    gap: tokens.spacing[3],
  },
  card: {
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "bold",
    color: palette.text,
    marginTop: 16,
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    color: palette.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontWeight: "bold",
    color: palette.text,
  },
  actionsContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
  emptyMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: "transparent" as any,
    borderRadius: 8,
  },
  emptyText: {
    color: palette.textSecondary,
  },

  // --- Cart preview (read-only) ---
  cartPreview: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: tokens.spacing[3],
    gap: tokens.spacing[2],
  },
  cartPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: tokens.spacing[2],
  },
  cartPreviewTitle: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  cartPreviewList: {
    gap: 0,
  },
  cartPreviewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    paddingVertical: tokens.spacing[2] + 2,
  },
  cartPreviewItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  cartPreviewImageWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
    backgroundColor: palette.surfaceMuted,
    flexShrink: 0,
  },
  cartPreviewImage: {
    width: "100%",
    height: "100%",
  },
  cartPreviewImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: palette.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  cartPreviewInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cartPreviewName: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  cartPreviewCode: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  cartPreviewNumbers: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  cartPreviewQty: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  cartPreviewTotal: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
