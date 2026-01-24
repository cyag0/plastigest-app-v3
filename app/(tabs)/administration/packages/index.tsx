import AppList from "@/components/App/AppList/AppList";
import PrintLabelsModal from "@/components/Products/PrintLabelsModal";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "react-native-paper";

export default function PackagesIndex() {
  const router = useRouter();
  const alerts = useAlerts();
  const { company, availableCompanies, selectCompany, isLoading } =
    useSelectedCompany();

  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onSuccess: (uri) => {
      setPrintModalVisible(false);
      setSelectedPackage(null);
    },
    onError: (error) => {
      alerts.error("Error al descargar el PDF: " + error.message);
    },
  });

  const handlePrintLabels = async (quantity: number) => {
    if (!selectedPackage) return;

    try {
      // Obtener la URL firmada del PDF de etiquetas del paquete
      const response = await axios.get(
        `/auth/admin/product-packages/${selectedPackage.id}/labels/pdf-url`,
        {
          params: { quantity },
        }
      );

      if (response.data?.url) {
        // Descargar usando la URL firmada (pública)
        await downloadPdfFromApi(response.data.url, {
          fileName: `etiquetas-paquete-${selectedPackage.barcode}.pdf`,
        });
      }
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message ||
          "Error al generar etiquetas del paquete"
      );
    }
  };

  useEffect(() => {
    // Seleccionar automáticamente la primera empresa si no hay ninguna seleccionada
    if (
      !company &&
      availableCompanies &&
      availableCompanies.length > 0 &&
      !isLoading
    ) {
      selectCompany(availableCompanies[0]);
    }
  }, [company, availableCompanies, isLoading]);

  if (isLoading || !company) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <AppList
        title="Paquetes de Producto"
        service={Services.productPackages}
        renderCard={({ item }: { item: any }) => ({
          title: item.package_name,
          description: (
            <Text
              style={{
                color: palette.textSecondary,
                opacity: 0.7,
                lineHeight: 14,
              }}
            >
              {item.product?.name || "Producto no encontrado"}
              {" • "}
              {item.quantity_per_package} {item.unit?.abbreviation || "uds"}
            </Text>
          ),
          right: (
            <AppList.Description
              style={{
                fontWeight: "bold",
                color: item.is_active ? palette.success : palette.red,
              }}
            >
              {item.is_active ? "Activo" : "Inactivo"}
            </AppList.Description>
          ),
          bottom: [
            /* {
              label: "Código de barras",
              value: item.barcode || "Sin código",
            }, */
            {
              label: "Precio de venta",
              value: item.sale_price
                ? `$${parseFloat(item.sale_price).toFixed(2)}`
                : "No definido",
            },
            {
              label: "Precio de compra",
              value: item.purchase_price
                ? `$${parseFloat(item.purchase_price).toFixed(2)}`
                : "No definido",
            },
          ],
        })}
        onPressCreate={() => {
          router.push("/(tabs)/administration/packages/form" as any);
        }}
        menu={{
          onEdit(item) {
            router.push(
              `/(tabs)/administration/packages/${item.id}/edit` as any
            );
          },
          customActions: [
            {
              title: "Imprimir Etiquetas",
              icon: "barcode",
              onPress: (item) => {
                setSelectedPackage(item);
                setPrintModalVisible(true);
              },
            },
          ],
        }}
        onItemPress={(item) => {
          router.push(`/(tabs)/administration/packages/${item.id}` as any);
        }}
        defaultFilters={{ company_id: company.id }}
        searchPlaceholder="Buscar paquetes..."
      />

      <PrintLabelsModal
        visible={printModalVisible}
        onDismiss={() => {
          setPrintModalVisible(false);
          setSelectedPackage(null);
        }}
        onConfirm={handlePrintLabels}
        productName={selectedPackage?.package_name || ""}
        loading={isDownloading}
      />
    </>
  );
}
