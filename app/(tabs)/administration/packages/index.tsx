import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { FilterConfig } from "@/components/App/AppList/AppListFilter";
import PrintLabelsModal from "@/components/Products/PrintLabelsModal";
import { activeFilter } from "@/constants/listFilters";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCategoryFilter } from "@/hooks/useListFilters";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "react-native-paper";
import { errorMessageOf } from "@/utils/errorNotice";

export default function PackagesIndex() {
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { company, availableCompanies, selectCompany, isLoading } =
    useSelectedCompany();

  // Categoría del producto del empaque (si se pueden listar categorías).
  const categoryFilter = useCategoryFilter();
  const filters: FilterConfig[] = [activeFilter(), ...(categoryFilter ? [categoryFilter] : [])];

  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onSuccess: (uri) => {
      setPrintModalVisible(false);
      setSelectedPackage(null);
    },
    onError: (error) => {
      alerts.error(errorMessageOf(error, "No se pudo descargar el PDF. Inténtalo de nuevo."));
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const columns: AppListColumn<any>[] = [
    { title: "Nombre", dataIndex: "package_name", key: "package_name", width: 200 },
    {
      title: "Producto",
      key: "product",
      width: 200,
      render: (_, item) => item.product?.name || "—",
    },
    {
      title: "Cant. por paquete",
      key: "quantity_per_package",
      width: 150,
      align: "center",
      render: (_, item) =>
        `${item.quantity_per_package} ${item.product?.unit?.abbreviation || item.unit?.abbreviation || "uds"}`,
    },
    {
      title: "Precio venta",
      key: "sale_price",
      width: 130,
      align: "right",
      render: (_, item) =>
        item.sale_price ? `$${parseFloat(item.sale_price).toFixed(2)}` : "—",
    },
    {
      title: "Precio compra",
      key: "purchase_price",
      width: 140,
      align: "right",
      render: (_, item) =>
        item.purchase_price ? `$${parseFloat(item.purchase_price).toFixed(2)}` : "—",
    },
    {
      title: "Estado",
      key: "is_active",
      width: 100,
      align: "center",
      render: (_, item) => (
        <Text
          style={{ fontWeight: "bold", color: item.is_active ? colors.success : colors.textMuted }}
        >
          {item.is_active ? "Activo" : "Inactivo"}
        </Text>
      ),
    },
  ];

  return (
    <>
      <AppList
        title="Paquetes de Producto"
        service={Services.productPackages}
        // Los paquetes usan los permisos de productos (ProductPackageController).
        permissionPrefix="products"
        columns={columns}
        filters={filters}
        renderCard={({ item }: { item: any }) => ({
          title: item.package_name,
          description: (
            <Text
              style={{
                color: colors.textSecondary,
                opacity: 0.7,
                lineHeight: 14,
              }}
            >
              {item.product?.name || "Producto no encontrado"}
              {" • "}
              {item.quantity_per_package} {item.product?.unit?.abbreviation || item.unit?.abbreviation || "uds"}
            </Text>
          ),
          right: (
            <AppList.Description
              style={{
                fontWeight: "bold",
                color: item.is_active ? colors.success : colors.textMuted,
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
              onPress: (item: any) => {
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
