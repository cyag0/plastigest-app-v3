import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import PrintLabelsModal from "@/components/Products/PrintLabelsModal";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface ProductsIndexProps {
  route?: Href;
}

export default function ProductsIndex(props: ProductsIndexProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alerts = useAlerts();

  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onSuccess: (uri) => {
      setPrintModalVisible(false);
      setSelectedProduct(null);
    },
    onError: (error) => {
      alerts.error("Error al descargar el PDF: " + error.message);
    },
  });

  const route: Href = "/(tabs)/inventory/products";

  const columns: AppListColumn<any>[] = [
    {
      title: "Imagen",
      key: "image",
      width: 96,
      render: (_, item) => {
        if (item.main_image?.uri) {
          return (
            <Image
              source={{ uri: item.main_image.uri }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "#F3F4F6",
              }}
            />
          );
        }

        return (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: "#F9FAFB",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="image-off-outline"
              size={16}
              color="#6B7280"
            />
          </View>
        );
      },
    },
    {
      title: "Producto",
      key: "name",
      dataIndex: "name",
      width: 240,
    },
    {
      title: "Estado",
      key: "is_active",
      width: 130,
      render: (_, item) => (
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: item.is_active ? "#2E7D32" : "#B3261E",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text variant="labelSmall" style={{ color: "#fff", fontWeight: "700" }}>
            {item.is_active ? "Activo" : "Inactivo"}
          </Text>
        </View>
      ),
    },
    {
      title: "Stock",
      key: "stock",
      width: 170,
      render: (_, item) => {
        const stock =
          item.current_stock !== null && item.current_stock !== undefined
            ? Number(item.current_stock)
            : 0;
        const minStock = Number(item.minimum_stock || 0);
        const isHealthy = minStock > 0 ? stock > minStock : stock > 0;
        const stockColor = isHealthy ? "#2E7D32" : "#B3261E";

        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons
              name={isHealthy ? "arrow-up-bold" : "arrow-down-bold"}
              size={14}
              color={stockColor}
            />
            <Text style={{ color: stockColor, fontWeight: "700" }}>{stock}</Text>
          </View>
        );
      },
    },
    {
      title: "Precio",
      key: "sale_price",
      width: 120,
      align: "right",
      render: (_, item) =>
        item.sale_price
          ? `$${Number(item.sale_price).toFixed(2)}`
          : "-",
    },
    {
      title: "Creado",
      key: "created_at",
      width: 120,
      render: (_, item) => formatDate(item.created_at),
    },
  ];

  // Determinar filtros iniciales basados en parámetros
  const getDefaultFilters = () => {
    const filters: any = {};

    // Si viene el parámetro filter=low_stock, agregar el filtro
    if (params.filter === "low_stock") {
      filters.low_stock = "1";
    }

    return filters;
  };

  const handlePrintLabels = async (quantity: number) => {
    if (!selectedProduct) return;

    // Primero obtener la URL firmada
    const response = await axios.get(
      `/auth/admin/products/${selectedProduct.id}/labels/pdf-url`,
      {
        params: { quantity },
      }
    );

    if (response.data?.url) {
      // Descargar usando la URL firmada (pública)
      await downloadPdfFromApi(response.data.url, {
        fileName: `etiquetas-${selectedProduct.code}.pdf`,
      });
    }
  };

  return (
    <>
      <AppList
        title="Productos"
        service={Services.products}
        defaultFilters={getDefaultFilters()}
        filters={[
          {
            type: "simple",
            name: "is_active",
            label: "Estado",
            options: [
              { label: "Todos", value: "" },
              { label: "Activos", value: "1" },
              { label: "Inactivos", value: "0" },
            ],
          },
          {
            type: "simple",
            name: "low_stock",
            label: "Stock",
            options: [
              { label: "Todos", value: "" },
              { label: "Stock bajo", value: "1" },
              { label: "Stock normal", value: "0" },
            ],
          },
        ]}
        renderCard={({ item }: { item: any }) => ({
          title: item.name,
          description: (
            <>
              <AppList.Description
                numberOfLines={1}
                style={{ color: palette.textSecondary }}
              >
                {item.description || "Sin descripción"}
              </AppList.Description>
            </>
          ),
          left: (
            <View
              style={{
                justifyContent: "center",
                height: "100%",
                flex: 1,
              }}
            >
              {item.main_image?.uri && (
                <Image
                  source={{ uri: item.main_image.uri }}
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: "#ccc",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#eee",
                  }}
                />
              )}
            </View>
          ),
          right: (
            <View
              style={{
                justifyContent: "flex-end",
                alignItems: "flex-end",
              }}
            >
              {item.sale_price && (
                <AppList.Title
                  style={{
                    color: palette.error,
                  }}
                >
                  {"$" + item.sale_price}
                </AppList.Title>
              )}

              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {item.current_stock !== null &&
                  item.current_stock !== undefined &&
                  item.current_stock <= (item.minimum_stock || 0) &&
                  item.minimum_stock > 0 && (
                    <AppList.Description
                      style={{
                        fontWeight: "bold",
                        color: palette.warning,
                      }}
                    >
                      Stock bajo
                    </AppList.Description>
                  )}

                {item.sale_price && (
                  <AppList.Description
                    style={{
                      fontWeight: "bold",
                      color: item.is_active ? palette.success : palette.error,
                    }}
                  >
                    {item.is_active ? "Activo" : "Inactivo"}
                  </AppList.Description>
                )}
              </View>
              {/* <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: item.is_active
                      ? palette.success + "20"
                      : palette.warning,
                    borderColor: item.is_active
                      ? palette.success
                      : palette.error,
                  },
                ]}
                textStyle={[
                  styles.statusText,
                  {
                    color: item.is_active ? palette.success : palette.error,
                  },
                ]}
                compact
              >
                {item.is_active ? "ACTIVO" : "INACTIVO"}
              </Chip> */}

              {/*  {item.current_stock !== null &&
                item.current_stock !== undefined && (
                  <View style={styles.stockInfo}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          item.current_stock <= (item.minimum_stock || 0)
                            ? palette.error
                            : palette.textSecondary,
                      }}
                    >
                      Stock: {item.current_stock}
                    </Text>
                    {item.current_stock <= (item.minimum_stock || 0) &&
                      item.minimum_stock > 0 && (
                        <Chip
                          mode="flat"
                          style={{
                            borderColor: palette.warning,
                            borderWidth: 1,
                            marginTop: 4,
                            backgroundColor: palette.background,
                          }}
                          textStyle={{
                            fontSize: 10,
                            color: palette.error,
                            fontWeight: "bold",
                          }}
                          compact
                        >
                          BAJO
                        </Chip>
                      )}
                  </View>
                )} */}
            </View>
          ),
          bottom: [
            {
              label: "Stock",
              value:
                item.current_stock !== null && item.current_stock !== undefined
                  ? item.current_stock
                  : 0,
            },
            {
              label: "Creado en",
              value: formatDate(item.created_at),
            },
          ],
        })}
        onItemPress={(entity: any) => {
          router.push(`${route}/${entity.id}` as any);
        }}
        menu={{
          onEdit(item) {
            router.push(`${route}/${item.id}/edit` as any);
          },
          customActions: [
            {
              title: "Imprimir Etiquetas",
              icon: "barcode",
              onPress: (item) => {
                setSelectedProduct(item);
                setPrintModalVisible(true);
              },
            },
          ],
        }}
        onPressCreate={() => {
          router.push(`${route}/form` as any);
        }}
        fabLabel="Nuevo Producto"
        columns={columns}
      />

      <PrintLabelsModal
        visible={printModalVisible}
        onDismiss={() => {
          setPrintModalVisible(false);
          setSelectedProduct(null);
        }}
        onConfirm={handlePrintLabels}
        productName={selectedProduct?.name || ""}
        loading={isDownloading}
      />
    </>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  rightContent: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 100,
    gap: 8,
  },
  statusChip: {
    borderWidth: 1,
    height: 26,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: palette.primary,
  },
  bottomContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  leftBottomInfo: {
    flex: 1,
  },
  rightBottomInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  stockText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  minStockText: {
    fontSize: 10,
    color: palette.textSecondary,
  },
  categoryText: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  companyText: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
});
