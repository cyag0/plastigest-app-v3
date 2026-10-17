import { formatDate } from "@/utils/dates";
import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import IconLabel from "@/components/App/IconLabel";
import StatusBadge from "@/components/App/StatusBadge";
import PrintLabelsModal from "@/components/Products/PrintLabelsModal";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import useInventoryTypes, {
  ALL_INVENTORY_TYPES,
} from "@/hooks/useInventoryTypes";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { Text } from "react-native-paper";
import { errorMessageOf } from "@/utils/errorNotice";

/**
 * Listado de productos de un tipo de inventario.
 *
 * El tipo viaja en la URL como slug: /inventory/products/type/materia-prima.
 * `all` muestra el catálogo completo.
 */
export default function ProductsByTypeIndex() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alerts = useAlerts();
  const { bySlug } = useInventoryTypes();
  const { can } = useCan();
  // El filtro de categoría pide categories_list; sin él no se consulta.
  const canFilterCategories = can("categories_list");
  // Movimientos de un producto: GET /products/{id}/movements (inventory_list).
  const canSeeMovements = can("inventory_list");

  const typeSlug = String(params.slug || ALL_INVENTORY_TYPES);
  const inventoryType = bySlug[typeSlug];
  const title =
    typeSlug === ALL_INVENTORY_TYPES
      ? "Todos los productos"
      : inventoryType?.name || "Productos";

  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );

  // Cargamos las categorías para poblar las opciones del filtro "Categoría".
  useEffect(() => {
    if (!canFilterCategories) return;
    let cancelled = false;
    (async () => {
      try {
        const res: any = await Services.categories.index({ all: true });
        const data = Array.isArray(res)
          ? res
          : res?.data?.data || res?.data || [];
        if (!cancelled) setCategories(data);
      } catch {
        // Si falla, el filtro de categoría simplemente queda sin opciones.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFilterCategories]);

  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onSuccess: (uri) => {
      setPrintModalVisible(false);
      setSelectedProduct(null);
    },
    onError: (error) => {
      alerts.error(errorMessageOf(error, "No se pudo descargar el PDF. Inténtalo de nuevo."));
    },
  });

  // El detalle, la edición y el alta viven un nivel arriba, fuera de /type/[slug].
  const route: Href = "/(tabs)/inventory/products";

  const columns: AppListColumn<any>[] = [
    {
      title: "Imagen",
      key: "image",
      width: 88,
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
                borderColor: "#E6E1D5",
                backgroundColor: "#F0EDE4",
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
              borderColor: "#E6E1D5",
              backgroundColor: "#F8F6F1",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="image-off-outline"
              size={16}
              color="#6E6B5E"
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
      title: "Tipo",
      key: "inventory_type",
      width: 150,
      render: (_, item) => {
        const type = item.inventory_type;
        if (!type) return "-";

        // El tipo es un atributo, no un estado: texto con su ícono.
        return (
          <IconLabel
            icon={(type.icon || "shape-outline") as any}
            label={type.name}
          />
        );
      },
    },
    {
      title: "Estado",
      key: "is_active",
      width: 110,
      render: (_, item) => <ActiveBadge active={!!item.is_active} />,
    },
    {
      title: "Stock",
      key: "stock",
      width: 130,
      render: (_, item) => {
        const stock =
          item.current_stock !== null && item.current_stock !== undefined
            ? Number(item.current_stock)
            : 0;
        const minStock = Number(item.minimum_stock || 0);
        const isHealthy = minStock > 0 ? stock > minStock : stock > 0;
        const stockColor = isHealthy ? "#3F8A3A" : "#B9412C";

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
      width: 110,
      align: "right",
      render: (_, item) =>
        item.sale_price
          ? `$${Number(item.sale_price).toFixed(2)}`
          : "-",
    },
    {
      title: "Creado",
      key: "created_at",
      width: 110,
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
    // Desde el aviso de Inicio "N productos agotados".
    if (params.filter === "out_of_stock") {
      filters.in_stock = "0";
    }

    // El tipo de inventario viene en la ruta, como slug
    if (typeSlug !== ALL_INVENTORY_TYPES) {
      filters.inventory_type_slug = typeSlug;
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
        actionColumnWidth={180}
        title={title}
        service={Services.products}
        // El detalle acepta products_read o products_list (ProductController::show).
        permissionPrefix="products"
        permissions={{ read: ["products_read", "products_list"] }}
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
          ...(canFilterCategories
            ? [
                {
                  type: "simple" as const,
                  name: "category_id",
                  label: "Categoría",
                  options: [
                    { label: "Todas", value: "" },
                    ...categories.map((c) => ({
                      label: c.name,
                      value: String(c.id),
                    })),
                  ],
                },
              ]
            : []),
          {
            type: "simple",
            name: "for_sale",
            label: "Para venta",
            options: [
              { label: "Todos", value: "" },
              { label: "Sí", value: "1" },
              { label: "No", value: "0" },
            ],
          },
          {
            type: "simple",
            name: "in_stock",
            label: "Existencia",
            options: [
              { label: "Todos", value: "" },
              { label: "Con stock", value: "1" },
              { label: "Sin stock", value: "0" },
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
                    backgroundColor: "#D3CCBC",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#EEEAE0",
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
                    color: palette.text,
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
                    <StatusBadge label="Stock bajo" tone="warning" />
                  )}

                {item.sale_price && <ActiveBadge active={!!item.is_active} />}
              </View>
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
              title: "Movimientos de Inventario",
              icon: "history",
              show: () => canSeeMovements,
              onPress: (item) => {
                router.push(`${route}/${item.id}/movements` as any);
              },
            },
            {
              title: "Ver Paquetes",
              icon: "package-variant-closed",
              onPress: (item) => {
                router.push(
                  `/(tabs)/inventory/packages?product_id=${item.id}` as any
                );
              },
            },
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
          // Se crea dentro del tipo actual: el formulario abre con el tipo puesto.
          router.push(
            `/(tabs)/inventory/products/type/${typeSlug}/form` as any
          );
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

