import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Dimensions, Image, ScrollView, View } from "react-native";
import { Button, Card, Chip, Divider, Surface, Text } from "react-native-paper";

export default function SaleDetail() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const [sale, setSale] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const alerts = useAlerts();

  React.useEffect(() => {
    loadSale();
  }, [id]);

  const loadSale = async () => {
    try {
      setLoading(true);
      const response = await Services.sales.show(id);
      setSale(response.data.data);
    } catch (error: any) {
      console.error("Error al cargar la venta:", error);
      alerts.error(
        error.response?.data?.message ||
          error.message ||
          "Error al cargar la venta"
      );
    } finally {
      setLoading(false);
    }
  };

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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "efectivo":
        return "Efectivo";
      case "tarjeta":
        return "Tarjeta";
      case "transferencia":
        return "Transferencia";
      default:
        return method;
    }
  };

  const handleAdvanceStatus = async () => {
    const confirmed = await alerts.confirm(
      "¿Deseas avanzar el estado de esta venta?",
      {
        title: "Avanzar Estado",
        okText: "Avanzar",
        cancelText: "Cancelar",
      }
    );

    if (!confirmed) return;

    try {
      await (Services.sales as any).advanceStatus(id);
      alerts.success("Estado avanzado correctamente");
      loadSale();
    } catch (error: any) {
      alerts.error(
        error.response?.data?.message || "Error al avanzar el estado"
      );
    }
  };

  const handleRevertStatus = async () => {
    const confirmed = await alerts.confirm(
      "¿Deseas retroceder el estado de esta venta?",
      {
        title: "Retroceder Estado",
        okText: "Retroceder",
        cancelText: "Cancelar",
      }
    );

    if (!confirmed) return;

    try {
      await (Services.sales as any).revertStatus(id);
      alerts.success("Estado retrocedido correctamente");
      loadSale();
    } catch (error: any) {
      alerts.error(
        error.response?.data?.message || "Error al retroceder el estado"
      );
    }
  };

  const handleCancel = async () => {
    const confirmed = await alerts.confirm(
      "¿Estás seguro de cancelar esta venta? Esta acción no se puede deshacer.",
      {
        title: "Cancelar Venta",
        okText: "Cancelar Venta",
        cancelText: "No",
      }
    );

    if (!confirmed) return;

    try {
      await (Services.sales as any).cancel(id);
      alerts.success("Venta cancelada correctamente");
      loadSale();
    } catch (error: any) {
      alerts.error(
        error.response?.data?.message || "Error al cancelar la venta"
      );
    }
  };

  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No se encontró la venta</Text>
      </View>
    );
  }

  console.log("Sale details:", sale);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Header con información principal */}
      <Surface
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              variant="headlineSmall"
              style={{ fontWeight: "bold", marginBottom: 8 }}
            >
              Venta #{sale.id}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={16}
                color={palette.textSecondary}
              />
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary }}
              >
                {new Date(sale.sale_date).toLocaleDateString("es-MX", {
                  dateStyle: "long",
                })}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={palette.textSecondary}
              />
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary }}
              >
                {sale.location?.name || "Sin ubicación"}
              </Text>
            </View>
          </View>

          <Chip
            icon={getStatusIcon(sale.status)}
            style={{
              backgroundColor: getStatusColor(sale.status),
            }}
            textStyle={{ color: "white", fontWeight: "bold" }}
          >
            {getStatusLabel(sale.status)}
          </Chip>
        </View>

        <Divider style={{ marginVertical: 16 }} />

        {/* Total */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text variant="titleMedium" style={{ fontWeight: "600" }}>
            Total:
          </Text>
          <Text
            variant="headlineSmall"
            style={{ fontWeight: "bold", color: palette.primary }}
          >
            {new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: "MXN",
            }).format(sale.total_cost)}
          </Text>
        </View>
      </Surface>

      {/* Información de Pago */}
      <Surface
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          elevation: 2,
        }}
      >
        <Text
          variant="titleMedium"
          style={{ fontWeight: "bold", marginBottom: 16 }}
        >
          Información de Pago
        </Text>

        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <MaterialCommunityIcons
              name={getPaymentMethodIcon(sale.payment_method)}
              size={24}
              color={palette.primary}
            />
            <View>
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary }}
              >
                Método de Pago
              </Text>
              <Text variant="bodyLarge" style={{ fontWeight: "600" }}>
                {getPaymentMethodLabel(sale.payment_method)}
              </Text>
            </View>
          </View>

          {sale.payment_method === "efectivo" &&
            sale.content?.received_amount && (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: palette.textSecondary }}>
                    Monto Recibido:
                  </Text>
                  <Text style={{ fontWeight: "600" }}>
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(sale.content.received_amount)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: palette.textSecondary }}>Cambio:</Text>
                  <Text style={{ fontWeight: "600" }}>
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(
                      sale.content.received_amount - parseFloat(sale.total_cost)
                    )}
                  </Text>
                </View>
              </>
            )}
        </View>
      </Surface>

      {/* Información del Cliente */}
      {(sale.content?.customer_name ||
        sale.content?.customer_phone ||
        sale.content?.customer_email) && (
        <Surface
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            elevation: 2,
          }}
        >
          <Text
            variant="titleMedium"
            style={{ fontWeight: "bold", marginBottom: 16 }}
          >
            Información del Cliente
          </Text>

          <View style={{ gap: 12 }}>
            {sale.content.customer_name && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={palette.primary}
                />
                <Text variant="bodyMedium">{sale.content.customer_name}</Text>
              </View>
            )}
            {sale.content.customer_phone && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={20}
                  color={palette.primary}
                />
                <Text variant="bodyMedium">{sale.content.customer_phone}</Text>
              </View>
            )}
            {sale.content.customer_email && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="email"
                  size={20}
                  color={palette.primary}
                />
                <Text variant="bodyMedium">{sale.content.customer_email}</Text>
              </View>
            )}
          </View>
        </Surface>
      )}

      {/* Productos */}
      <Surface
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          elevation: 2,
        }}
      >
        <Text
          variant="titleMedium"
          style={{ fontWeight: "bold", marginBottom: 16 }}
        >
          Productos ({sale.details?.length || 0})
        </Text>

        <View style={{ gap: 12 }}>
          {sale.details?.map((detail: any, index: number) => (
            <Card
              key={detail.id}
              style={{
                backgroundColor: palette.background,
              }}
            >
              <Card.Content style={{ padding: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  {detail.product_image && (
                    <Image
                      source={{
                        uri: detail.product_image,
                      }}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        backgroundColor: "#f0f0f0",
                      }}
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text
                      variant="bodyLarge"
                      style={{ fontWeight: "600", marginBottom: 4 }}
                    >
                      {detail.product_name || "Producto sin nombre"}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="barcode"
                        size={14}
                        color={palette.textSecondary}
                      />
                      <Text
                        variant="bodySmall"
                        style={{ color: palette.textSecondary }}
                      >
                        {detail.product_code}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text variant="bodyMedium">
                        {parseFloat(detail.quantity)} x{" "}
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(
                          detail.unit_cost ||
                            parseFloat(detail.total_cost) /
                              parseFloat(detail.quantity)
                        )}
                      </Text>
                      <Text
                        variant="bodyLarge"
                        style={{
                          fontWeight: "bold",
                          color: palette.primary,
                        }}
                      >
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(
                          detail.total_cost ||
                            parseFloat(detail.quantity) *
                              (detail.unit_cost || 0)
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </Surface>

      {/* Notas */}
      {sale.content?.notes && (
        <Surface
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <MaterialCommunityIcons
              name="note-text"
              size={20}
              color={palette.primary}
            />
            <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
              Notas
            </Text>
          </View>
          <Text variant="bodyMedium">{sale.content.notes}</Text>
        </Surface>
      )}

      {/* Botones de Acción */}
      <View style={{ gap: 12, marginBottom: 32 }}>
        {sale.can_advance && (
          <Button
            mode="contained"
            onPress={handleAdvanceStatus}
            icon="arrow-right-circle"
            style={{ backgroundColor: palette.primary }}
          >
            Avanzar Estado
          </Button>
        )}

        {sale.can_revert && (
          <Button
            mode="outlined"
            onPress={handleRevertStatus}
            icon="arrow-left-circle"
            style={{ borderColor: palette.primary }}
            textColor={palette.primary}
          >
            Retroceder Estado
          </Button>
        )}

        {sale.can_cancel && (
          <Button
            mode="outlined"
            onPress={handleCancel}
            icon="close-circle"
            style={{ borderColor: palette.error }}
            textColor={palette.error}
          >
            Cancelar Venta
          </Button>
        )}

        <Button
          mode="text"
          onPress={() => router.back()}
          icon="arrow-left"
          textColor={palette.textSecondary}
        >
          Volver
        </Button>
      </View>
    </ScrollView>
  );
}
