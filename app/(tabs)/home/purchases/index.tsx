import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import PermissionGate from "@/components/App/PermissionGate";
import StatusBadge from "@/components/App/StatusBadge";
import PurchaseStats from "@/components/Dashboard/PurchaseStats";
import { purchaseStatus } from "@/constants/statuses";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import Services from "@/utils/services";
import {
  CrudService,
  IndexParams,
  createCrudService,
} from "@/utils/services/crudService";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { SceneMap, TabView } from "react-native-tab-view";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash:     "Efectivo",
  card:     "Tarjeta",
  transfer: "Transferencia",
  other:    "Otro",
};

/**
 * Listado para AppList: la respuesta de axios con { data, meta } para que
 * pagine (Services.purchasesV2.index devolvía solo el cuerpo y la lista se
 * quedaba en las últimas 20 compras, sin paginador), con búsqueda y filtros.
 * Los filtros en "Todos" (vacíos) no se mandan: el servidor los tomaría como
 * un estado vacío y no traería nada.
 */
const purchasesCrud = createCrudService<any>("/auth/admin/purchases-v2");
const purchasesListService: CrudService<any> = {
  ...purchasesCrud,
  index: (params?: IndexParams) =>
    purchasesCrud.index(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(
          ([, value]) => value !== "" && value !== null && value !== undefined,
        ),
      ),
    ),
};

/** Motivo que manda el backend; nunca el texto en inglés de axios. */
const apiMessage = (error: any, fallback: string): string => {
  if (error?.isAxiosError && !error.response) {
    return "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  const data = error?.response?.data;
  return data?.message || data?.error || fallback;
};

export default function PurchasesIndex() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const layout = useWindowDimensions();
  const alerts = useAlerts();
  const { can } = useCan();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "list", title: "Lista de Compras" },
    { key: "stats", title: "Estadísticas" },
  ]);

  // Remonta la lista después de eliminar un borrador para que desaparezca.
  const [listKey, setListKey] = useState(0);

  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onError: (error) => alerts.error(error.message || "Error al descargar el PDF"),
  });

  const handleDownloadPdf = async (item: any) => {
    try {
      const response = await Services.purchasesV2.pdfUrl(Number(item.id));
      if (response?.url) {
        await downloadPdfFromApi(response.url, {
          fileName: `compra_${item.purchase_number || item.id}.pdf`,
        });
      } else {
        alerts.error("No se pudo obtener la URL del PDF");
      }
    } catch (error: any) {
      alerts.error(error?.message || "Error al obtener la URL del PDF");
    }
  };

  const columns = useMemo<AppListColumn<any>[]>(
    () => [
      {
        title: "Compra",
        key: "purchase_number",
        width: 140,
        render: (_, item) => purchaseLabel(item),
      },
      {
        title: "Proveedor",
        key: "supplier_name",
        width: 240,
        render: (_, item) => item.supplier_name || item.supplier?.name || "Sin proveedor",
      },
      {
        title: "Estado",
        key: "status",
        width: 170,
        render: (_, item) => <StatusBadge {...purchaseStatus(item.status)} />,
      },
      {
        title: "Método",
        key: "payment_method",
        width: 130,
        render: (_, item) =>
          PAYMENT_METHOD_LABELS[item.payment_method] ?? item.payment_method ?? "—",
      },
      {
        title: "Productos",
        key: "products_count",
        width: 110,
        align: "right",
        render: (_, item) => item.products_count ?? item.details?.length ?? 0,
      },
      {
        title: "Fecha",
        key: "purchase_date",
        width: 130,
        render: (_, item) => formatDate(item.purchase_date ?? item.created_at),
      },
    ],
    [],
  );

  // Eliminar un borrador: antes se borraba sin confirmar y la lista no se
  // actualizaba (el menú propio reemplaza la confirmación de AppList).
  const handleDeleteDraft = async (item: any) => {
    const ok = await alerts.confirm(
      `¿Eliminar el borrador ${purchaseLabel(item)}? Esta acción no se puede deshacer.`,
      { title: "Eliminar borrador", okText: "Eliminar", cancelText: "Cancelar" },
    );
    if (!ok) return;
    try {
      await Services.purchasesV2.delete(item.id);
      alerts.success("Borrador eliminado");
      setListKey((key) => key + 1);
    } catch (error: any) {
      alerts.error(apiMessage(error, "No se pudo eliminar el borrador"));
    }
  };

  const renderListRoute = useMemo(
    () => () => (
      <AppList
        key={listKey}
        title="Compras"
        service={purchasesListService}
        // Editar un borrador lo guarda con upsert-draft (purchases_create);
        // eliminarlo pide purchases_delete y abrir la compra, purchases_read.
        permissions={{
          create: "purchases_create",
          read: "purchases_read",
          update: "purchases_create",
          delete: "purchases_delete",
        }}
        searchPlaceholder="Buscar compras..."
        filters={[
          {
            type: "simple",
            name: "status",
            label: "Estado",
            options: [
              { label: "Todos", value: "" },
              { label: "Borrador", value: "draft" },
              { label: "Pedido", value: "ordered" },
              { label: "En tránsito", value: "in_transit" },
              { label: "Recibido", value: "received" },
              { label: "Cancelado", value: "cancelled" },
            ],
          },
        ]}
        showAppBar={false}
        renderCard={({ item }: { item: any }) => {
          return {
            title: `Compra ${purchaseLabel(item)}`,
            description: `Proveedor: ${item.supplier_name || item.supplier?.name || "Sin proveedor"}`,
            right: (
              <View style={styles.rightContent}>
                <StatusBadge {...purchaseStatus(item.status)} />
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: formatDate(item.purchase_date ?? item.created_at),
              },
              {
                label: "Productos",
                value: `${item.products_count ?? item.details?.length ?? 0} items`,
              },
              {
                label: "Método",
                value: PAYMENT_METHOD_LABELS[item.payment_method] ?? "—",
              },
            ],
          };
        }}
        menu={{
          onEdit(item) {
            // Solo permitir editar si está en borrador
            if (item.status === "draft") {
              router.push(`/(tabs)/home/purchases/formv2?id=${item.id}` as any);
            }
          },
          showEdit(item) {
            return item.status === "draft";
          },
          onShow(item) {
            router.push(`/(tabs)/home/purchases/${item.id}` as any);
          },
          showDelete(item) {
            return item.status === "draft";
          },
          onDelete: handleDeleteDraft,
          customActions: [
            {
              title: isDownloading ? "Descargando..." : "Imprimir PDF",
              icon: "file-pdf-box",
              color: colors.primary,
              show: () => can("purchases_read"),
              onPress: handleDownloadPdf,
            },
          ],
        }}
        // El formulario pide proveedor, fecha y forma de pago; el borrador
        // se crea con el primer producto. Antes un modal pedía lo mismo,
        // creaba un borrador vacío y abría productos sin forma de llegar a
        // confirmar en el celular.
        onPressCreate={() => {
          router.push("/(tabs)/home/purchases/formv2?new=1" as any);
        }}
        fabLabel="Nueva Compra"
        columns={columns}
      />
    ),
    [router, columns, listKey, can, colors, styles],
  );

  const renderStatsRoute = useMemo(() => () => <PurchaseStats />, []);

  const renderScene = useMemo(
    () =>
      SceneMap({
        list: renderListRoute,
        stats: renderStatsRoute,
      }),
    [renderListRoute, renderStatsRoute],
  );

  return (
    <PermissionGate permission="purchases_list">
      <View style={styles.container}>
      {/* Tabs Header */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, index === 0 && styles.tabActive]}
          onPress={() => setIndex(0)}
        >
          <Text style={[styles.tabText, index === 0 && styles.tabTextActive]}>
            Lista de Compras
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, index === 1 && styles.tabActive]}
          onPress={() => setIndex(1)}
        >
          <Text style={[styles.tabText, index === 1 && styles.tabTextActive]}>
            Estadísticas
          </Text>
        </Pressable>
      </View>

      {/* Tab View */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => null}
      />
    </View>
    </PermissionGate>
  );
}

const makeStyles = themedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: c.surface,
    borderBottomWidth: 2,
    borderBottomColor: c.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: c.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: c.textSecondary,
  },
  tabTextActive: {
    color: c.primary,
  },
  rightContent: {
    alignItems: "flex-end",
    gap: 8,
  },
  cardTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardTitleText: {
    color: c.text,
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  cardDescription: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  supplierText: {
    color: c.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  amountText: {
    color: c.primary,
    fontWeight: "700",
    fontSize: 16,
  },
}));

// Mismo folio que muestra el detalle (PUR000051); el número de documento del
// proveedor o el id sólo si la compra no tiene folio.
function purchaseLabel(item: any): string {
  return item.purchase_number || `#${item.document_number || item.id}`;
}
