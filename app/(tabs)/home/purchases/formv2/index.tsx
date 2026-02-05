import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppDependency from "@/components/Form/AppDependency";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormProSelect } from "@/components/Form/AppProSelect";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React from "react";
import { StyleSheet, View } from "react-native";
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
      initialValues={{
        supplier_id: "",
        purchase_date: new Date().toISOString().split("T")[0],
        notes: "",
        document_number: "",
      }}
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
        model="suppliers"
        placeholder="Seleccionar proveedor"
      />

      <AppDependency name="supplier_id">
        {(value) => {
          return <PurchasesContent supplier_id={value} />;
        }}
      </AppDependency>
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
          mode="contained"
          onPress={() =>
            router.push(
              `/(tabs)/home/purchases/formv2/productos?supplier_id=${props.supplier_id}` as any,
            )
          }
          style={styles.button}
          icon="package-variant"
          buttonColor={palette.primary}
        >
          Ver Productos
        </Button>

        <Button
          mode="contained"
          onPress={() =>
            router.push("/(tabs)/home/purchases/formv2/carrito" as any)
          }
          style={styles.button}
          icon="cart"
          buttonColor={palette.secondary}
          disabled={cartItems.length === 0}
        >
          Ver Carrito ({cartItems.length})
        </Button>
      </View>

      {cartItems.length === 0 && (
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
    backgroundColor: palette.background,
    padding: 16,
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
    backgroundColor: palette.background,
    borderRadius: 8,
  },
  emptyText: {
    color: palette.textSecondary,
  },
});
