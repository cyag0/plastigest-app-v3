import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Chip, Text } from "react-native-paper";

export default function SalesIndex() {
  const navigation = router;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "#6c757d";
      case "processed":
        return "#0dcaf0";
      case "completed":
        return "#198754";
      case "cancelled":
        return "#dc3545";
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
      case "completed":
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
      case "completed":
        return "Completada";
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
        title: sale.sale_number || `Venta #${sale.id}`,
        description: (
          <View style={{ gap: 8, marginTop: 8 }}>
            {/* Fecha */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={palette.textSecondary}
              />
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary }}
              >
                {new Date(sale.sale_date).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>

            {/* Ubicación */}
            {sale.location?.name && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={14}
                  color={palette.primary}
                />
                <Text variant="bodySmall">{sale.location.name}</Text>
              </View>
            )}

            {/* Método de pago */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialCommunityIcons
                name={getPaymentMethodIcon(sale.payment_method)}
                size={14}
                color={palette.primary}
              />
              <Text variant="bodySmall">
                {sale.payment_method === "efectivo"
                  ? "Efectivo"
                  : sale.payment_method === "tarjeta"
                  ? "Tarjeta"
                  : "Transferencia"}
              </Text>
            </View>

            {/* Cliente */}
            {sale.content?.customer_name && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={14}
                  color={palette.primary}
                />
                <Text variant="bodySmall">{sale.content.customer_name}</Text>
              </View>
            )}

            {/* Productos y Total */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: "#e9ecef",
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
          <Chip
            icon={getStatusIcon(sale.status)}
            style={{
              backgroundColor: getStatusColor(sale.status),
            }}
            textStyle={{ color: "white", fontWeight: "600", fontSize: 10 }}
            compact
          >
            {getStatusLabel(sale.status)}
          </Chip>
        ),
      })}
      searchPlaceholder="Buscar ventas..."
    />
  );
}
