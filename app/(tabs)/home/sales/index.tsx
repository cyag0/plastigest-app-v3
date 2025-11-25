import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function SalesIndex() {
  const navigation = router;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return palette.warning;
      case "processed":
        return palette.info;
      case "closed":
        return palette.primary;
      case "cancelled":
        return palette.red;
      default:
        return "#6c757d";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return "file-document-edit-outline";
      case "processed":
        return "progress-clock";
      case "closed":
        return "check-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Borrador";
      case "processed":
        return "Procesada";
      case "closed":
        return "Cerrada";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "efectivo":
        return "cash";
      case "tarjeta":
        return "credit-card";
      case "transferencia":
        return "bank-transfer";
      default:
        return "cash";
    }
  };

  return (
    <AppList
      title="Ventas"
      service={Services.sales}
      onItemPress={(entity) => {
        navigation.push(`/(tabs)/home/sales/${entity.id}` as any);
      }}
      onPressCreate={() => {
        navigation.push("/(tabs)/home/sales/form");
      }}
      renderCard={({ item: sale }) => ({
        title: (
          <>
            <AppList.Title>
              {sale.sale_number || `Venta #${sale.id}`}
            </AppList.Title>
          </>
        ),
        bottom: [
          {
            label: "Fecha",
            value: new Date(sale.sale_date).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          },
          {
            label: "Método de pago",
            value:
              sale.payment_method === "efectivo"
                ? "Efectivo"
                : sale.payment_method === "tarjeta"
                ? "Tarjeta"
                : "Transferencia",
          },
        ],
        description: (
          <View style={{ gap: 8, marginTop: 8 }}>
            {/* Productos y Total */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialCommunityIcons
                  name="package-variant"
                  size={14}
                  color={palette.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  {sale.details?.length || 0}{" "}
                  {sale.details?.length === 1 ? "producto" : "productos"}
                </Text>
              </View>

              <Text
                variant="titleSmall"
                style={{ fontWeight: "bold", color: palette.primary }}
              >
                {new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(sale.total_cost)}
              </Text>
            </View>
          </View>
        ),
        right: (
          <AppList.Description
            style={{
              color: getStatusColor(sale.status),
              fontWeight: "bold",
            }}
          >
            {getStatusLabel(sale.status)}
          </AppList.Description>
        ),
      })}
      searchPlaceholder="Buscar ventas..."
    />
  );
}
