import {
  CartEventData,
  POSProvider,
  usePOS,
} from "@/components/Views/POSV2/Context";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";

function StackContent() {
  const { onCartEvent } = usePOS();
  const params = useLocalSearchParams();
  const alerts = useAlerts();

  const purchaseId: number = React.useMemo(() => {
    if (params.id) {
      return parseInt(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    // Suscribirse a eventos del carrito
    const unsubscribe = onCartEvent(async (event: CartEventData) => {
      console.log("Cart event:", event.type, event);

      try {
        // Mapear tipo de evento a acción del backend
        const action = event.type; // 'add', 'update', 'remove', 'clear', 'change_unit'

        if (action === "clear") {
          // Para clear, solo enviar la acción
          await Services.purchases.updateDetails(purchaseId, { action });
        } else {
          // Para las demás acciones, enviar el item afectado
          const item = event.item;
          if (!item) {
            console.error("No item in event for action:", action);
            return;
          }

          await Services.purchases.updateDetails(purchaseId, {
            action,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_id: item.unit_id,
            unit_price: item.unit_price,
            subtotal: item.total,
          });
        }

        console.log("Detail synced successfully:", action);
      } catch (error) {
        console.error("Error syncing purchase detail:", error);
        alerts.error("Error al sincronizar con el servidor");
      }
    });

    // Cleanup al desmontar
    return () => {
      unsubscribe();
    };
  }, [purchaseId, onCartEvent]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "POS - Nueva Compra",
        }}
      />
      <Stack.Screen
        name="productos"
        options={{
          title: "Productos",
        }}
      />
      <Stack.Screen
        name="carrito"
        options={{
          title: "Carrito de Compras",
        }}
      />
    </Stack>
  );
}

export default function _layout() {
  return (
    <POSProvider type="purchases">
      <StackContent />
    </POSProvider>
  );
}
