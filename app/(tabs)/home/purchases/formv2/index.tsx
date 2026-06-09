import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppDependency from "@/components/Form/AppDependency";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormProSelect } from "@/components/Form/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { usePurchase } from "./PurchaseContext";

interface PurchasesFormProps {
  id?: number;
  readonly?: boolean;
}

export default function PurchaseFormScreen(props: PurchasesFormProps) {
  const router = useRouter();
  const alerts = useAlerts();

  const purchaseContext = usePurchase();

  const id = useLocalSearchParams().id
    ? parseInt(useLocalSearchParams().id as string)
    : undefined;

  const initialFormValues = useMemo(() => ({
    supplier_id: "",
    purchase_date: new Date().toISOString().split("T")[0],
    notes: "",
    document_number: "",
    payment_method: "other",
  }), []);

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

      // Confirmar la compra usando el contexto
      await purchaseContext.confirmPurchase({
        document_number: values.get("document_number")?.toString(),
        payment_method: values.get("payment_method")?.toString(),
      });

      router.replace(`/(tabs)/home/purchases` as any);
      alerts.success("Compra confirmada exitosamente");

      return true;
    } catch (error: any) {
      console.error("Error confirming purchase:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error al confirmar la compra";
      alerts.error(errorMessage);
      return false;
    }
  };

  return (
    <AppForm
      api={Services.purchasesV2}
      id={id}
      submitButtonText="Confirmar Compra"
      initialValues={initialFormValues}
      onSubmit={async (values: any) => {
        const res = await alerts.confirm("¿Deseas confirmar esta compra?", {
          title: "Confirmar Compra",
          okText: "Confirmar",
          cancelText: "Cancelar",
        });

        if (res) {
          await handleSubmit(values);
          return true;
        }

        return false;
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
            Compra #{purchaseContext.currentPurchaseId || "Nueva"}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sistema de compras
          </Text>
        </View>

        <FormProSelect
          name="company_id"
          label="Compañía"
          model="admin.companies"
          placeholder="Seleccionar compañía"
          disabled
        />

        <FormProSelect
          name="location_id"
          label="Ubicación"
          model="admin.locations"
          placeholder="Seleccionar ubicación"
          disabled
        />

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
            {cartTotal.toFixed(2)} MXN
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
                    {item.quantity} × ${item.price.toFixed(2)}
                  </Text>
                  <Text style={styles.cartPreviewTotal}>
                    ${item.total.toFixed(2)}
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
