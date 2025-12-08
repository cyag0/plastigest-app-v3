import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppDependency from "@/components/Form/AppDependency";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormProSelect } from "@/components/Form/AppProSelect";
import { CartItem, usePOS } from "@/components/Views/POSV2/Context";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface PurchasesFormProps {
  id?: number;
  readonly?: boolean;
}

export default function PurchaseFormScreen(props: PurchasesFormProps) {
  const router = useRouter();
  const { cartItems = { current: [] } } = usePOS();
  const alerts = useAlerts();

  const id = useLocalSearchParams().id
    ? parseInt(useLocalSearchParams().id as string)
    : undefined;

  const handleSubmit = async (values: FormData) => {
    try {
      console.log("Submitting purchase form with values:", values);
      const _cartItems = cartItems.current || [];

      // Validar que tengamos el ID de la compra
      if (!id) {
        alerts.error("No se encontró el ID de la compra");
        return false;
      }

      // Validar que haya productos en el carrito
      if (!_cartItems || _cartItems.length === 0) {
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

      // Llamar al endpoint para iniciar el pedido
      const response = await Services.purchases.startOrder(id);

      router.replace(`/(tabs)/home/purchases` as any);

      if (response.success) {
        alerts.success("Pedido iniciado exitosamente");
      } else {
        alerts.error(response.message || "Error al iniciar el pedido");
      }

      return true; // No guardar el formulario, solo cambiar estado
    } catch (error: any) {
      console.error("Error starting order:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error al iniciar el pedido";
      alerts.error(errorMessage);
      return true;
    }
  };

  return (
    <AppForm
      api={Services.purchases}
      id={id}
      submitButtonText="Iniciar Pedido"
      initialValues={{
        //company_id: company?.id.toString() || "",
        status: "draft",
        //location_origin_id: selectedLocation?.id?.toString(),
        purchase_date: new Date().toISOString().split("T")[0],
      }}
      onSubmit={async (values: any) => {
        const res = await alerts.confirm(
          "¿Deseas iniciar el pedido de compra?",
          {
            title: "Iniciar Pedido",
            okText: "Iniciar",
            cancelText: "Cancelar",
          }
        );

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
          Compras {id}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sistema de compras rápidas
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
        name="location_origin_id"
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
  const posContext = usePOS();
  const formContext = useFormikContext<any>();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [initialized, setInitialized] = React.useState(false);

  // Inicializar carrito desde formContext solo la primera vez
  React.useEffect(() => {
    if (!initialized && formContext.values.cart_items) {
      console.log(
        "Initializing cart from form data:",
        formContext.values.cart_items
      );
      posContext.initializeCart(formContext.values.cart_items);
      setCartItems(formContext.values.cart_items);
      setInitialized(true);
    }
  }, [formContext.values.cart_items, initialized, posContext]);

  // Sincronizar UI con el carrito en cada focus
  useFocusEffect(
    React.useCallback(() => {
      setCartItems([...posContext.cartItems.current]);
    }, [posContext])
  );

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
            ${posContext.getCartTotal().toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={() =>
            router.push(
              `/(tabs)/home/purchases/formv2/productos?supplier_id=${props.supplier_id}` as any
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
