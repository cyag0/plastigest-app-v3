import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function SalesReportsIndexScreen() {
  const router = useRouter();
  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onSuccess: (uri) => console.log("PDF abierto exitosamente:", uri),
    onError: (error) => console.error("Error al descargar PDF:", error),
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${num.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <AppList
        title="Reportes de Ventas"
        service={Services.salesReports}
        searchPlaceholder="Buscar reportes..."
        renderCard={({ item }) => ({
          title: formatDate(item.report_date),
          subtitle: item.location?.name || "Sin ubicación",
          description: `${item.transactions_count || 0} transacciones`,
          rightText: formatCurrency(item.total_sales || 0),
          badge: `${item.transactions_count || 0}`,
          badgeColor: palette.primary,
          left: (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: palette.primary + "20",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name="chart-line"
                size={20}
                color={palette.primary}
              />
            </View>
          ),
        })}
        menu={{
          showEdit: false,
          showDelete: false,
          customActions: [
            {
              title: isDownloading ? "Descargando..." : "Descargar PDF",
              icon: "file-pdf-box",
              color: palette.error,
              show: () => true,
              onPress: async (item: any) => {
                try {
                  // Obtener la URL firmada
                  const response = await axios.get(
                    `/auth/admin/sales-reports/${item.id}/pdf-url`
                  );

                  if (response.data?.url) {
                    // Descargar usando la URL firmada
                    await downloadPdfFromApi(response.data.url, {
                      fileName: `reporte_ventas_${item.id}.pdf`,
                    });
                  }
                } catch (error) {
                  console.error("Error al descargar PDF:", error);
                }
              },
            },
          ],
        }}
        onItemPress={(entity) => {
          router.push(`/(tabs)/home/sales-reports/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/home/sales-reports/form" as any);
        }}
      />
    </View>
  );
}
