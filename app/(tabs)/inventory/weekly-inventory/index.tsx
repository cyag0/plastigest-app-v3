import AppList, { FilterConfig } from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import StatusBadge from "@/components/App/StatusBadge";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { inventoryCountStatus } from "@/constants/statuses";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { AlertsDialogs, AlertsProvider } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Modal, Pressable, Text as RNText, View } from "react-native";
import { ProgressChart } from "react-native-chart-kit";
import { Portal, Text } from "react-native-paper";
import * as Yup from "yup";
import { toLocalDateString, formatDate } from "@/utils/dates";

/** "#RRGGBB" → "r, g, b": la gráfica pide el color con opacidad. */
const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

const inventoryColumns: AppListColumn<App.Entities.InventoryCount.InventoryCount>[] = [
  {
    title: "Nombre",
    dataIndex: "name",
    key: "name",
    width: 240,
  },
  {
    title: "Fecha",
    dataIndex: "count_date",
    key: "count_date",
    width: 130,
    render: (value) => formatDate(value) || "-",
  },
  {
    title: "Estado",
    dataIndex: "status",
    key: "status",
    width: 130,
    render: (value) => <StatusBadge {...inventoryCountStatus(value)} />,
  },
  {
    title: "Usuario",
    dataIndex: "user.name",
    key: "user",
    width: 160,
  },
  {
    title: "Progreso",
    key: "progress",
    width: 120,
    render: (_value, record) => {
      const progress = (record as any).progress;
      if (!progress) return "-";
      const total = (progress.counted ?? 0) + (progress.pending ?? 0);
      const pct = total > 0 ? Math.round((progress.counted / total) * 100) : 0;
      return `${pct}% (${progress.counted}/${total})`;
    },
  },
];

// Lo mismo que pide el backend (InventoryCountController: nombre ≤ 150,
// fecha obligatoria, notas opcionales).
const inventoryValidationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Escribe un nombre para el conteo")
    .max(150, "Usa 150 caracteres o menos"),
  count_date: Yup.date()
    .typeError("Elige la fecha del conteo")
    .required("Elige la fecha del conteo"),
  notes: Yup.string().nullable(),
});

const inventoryFilters: FilterConfig[] = [
  {
    name: "status",
    label: "Estado",
    type: "simple",
    options: [
      { label: "Planificación", value: "planning" },
      { label: "Contando", value: "counting" },
      { label: "Completado", value: "completed" },
      { label: "Cancelado", value: "cancelled" },
    ],
  },
  {
    name: "count_date",
    label: "Fecha de Conteo",
    type: "dateRange",
  },
];

export default function InventoryIndex() {
  const router = useRouter();
  const { selectedLocation } = useSelectedLocation();
  const { colors } = useTheme();
  // «Iniciar conteo semanal»: un diálogo con el formulario.
  const [creating, setCreating] = useState(false);
  const formRef = useRef<AppFormRef<any>>(null);
  const { can } = useCan();
  // Capturar renglones pide inventory_create (POST inventory-counts-details)
  // y completar o cancelar pide inventory_update: el conteo abierto se
  // ofrece solo con los dos.
  const canCapture = can(["inventory_create", "inventory_update"], { all: true });
  const canDownloadPdf = can(["inventory_read", "inventory_list"]);
  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onSuccess: (uri) => console.log("PDF abierto exitosamente:", uri),
    onError: (error) => console.error("Error al descargar PDF:", error),
  });

  const handleCreateInventory = async (values: any) => {
    try {
      const response = await Services.inventoryCounts.store(values);

      setCreating(false);
      formRef.current?.resetForm();

      // Navegar a la captura del inventario creado (o a su detalle si el
      // usuario no puede capturar).
      if (response.data?.data.id) {
        router.push(
          `/inventory/weekly-inventory/${response.data.data.id}${canCapture ? "/edit" : ""}` as any
        );
      }

      return response;
    } catch (error) {
      console.error("Error al crear inventario:", error);
      throw error;
    }
  };

  return (
    <>
      <AppList
        title="Inventario Semanal"
        service={Services.inventoryCounts}
        // InventoryCountController usa el prefijo inventory.
        permissionPrefix="inventory"
        filters={inventoryFilters}
        onPressCreate={() => setCreating(true)}
        columns={inventoryColumns}
        renderCard={({ item }: { item: any }) => {
          return {
            title: (
              <AppList.Title
                textProps={{
                  numberOfLines: 1,
                }}
              >
                {item.name || `Inventario #${item.id}`}
              </AppList.Title>
            ),
            description: (
              <>
                {item.progress && item.progress.pending > 0 && (
                  <AppList.Description>
                    <Text style={{ color: colors.warning, fontWeight: "600" }}>
                      {item.progress.pending} pendiente(s)
                    </Text>
                  </AppList.Description>
                )}
              </>
            ),
            right: (
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "flex-end",
                  marginBottom: 4,
                }}
              >
                <StatusBadge {...inventoryCountStatus(item.status)} />
              </View>
            ),
            left: (
              <View style={{ justifyContent: "center", alignItems: "center" }}>
                {item.progress &&
                  item.status !== "completed" &&
                  item.status !== "cancelled" && (
                    <ProgressPieChart
                      counted={item.progress.counted || 0}
                      pending={item.progress.pending || 0}
                      size={50}
                    />
                  )}
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: formatDate(item.count_date) || "Sin fecha",
              },
              {
                label: "Usuario",
                value: item.user?.name || "N/A",
              },
            ],
          };
        }}
        onItemPress={(item) =>
          router.push(`/inventory/weekly-inventory/${item.id}` as any)
        }
        searchPlaceholder="Buscar inventarios..."
        emptyMessage="No hay inventarios registrados"
        menu={{
          showView: true,
          showEdit: (item: App.Entities.InventoryCount.InventoryCount) =>
            canCapture &&
            item.status !== "completed" &&
            item.status !== "cancelled",
          showDelete: (item: App.Entities.InventoryCount.InventoryCount) =>
            item.status !== "completed" && item.status !== "cancelled",
          onEdit(item) {
            router.push(`/inventory/weekly-inventory/${item.id}/edit` as any);
          },
          customActions: [
            {
              title: isDownloading ? "Descargando..." : "Descargar PDF",
              icon: "file-pdf-box",
              color: colors.primary,
              show: (item: App.Entities.InventoryCount.InventoryCount) =>
                canDownloadPdf && item.status === "completed",
              onPress: async (
                item: App.Entities.InventoryCount.InventoryCount
              ) => {
                // Primero obtener la URL firmada
                const response = await axios.get(
                  `/auth/admin/inventory-counts/${item.id}/pdf-url`
                );

                if (response.data?.url) {
                  // Descargar usando la URL firmada (pública)
                  await downloadPdfFromApi(response.data.url, {
                    fileName: `inventario_${item.id}.pdf`,
                  });
                }
              },
            },
          ],
        }}
      />

      {creating && (
        <StartCountDialog
          formRef={formRef}
          locationName={selectedLocation?.name}
          locationId={selectedLocation?.id}
          onClose={() => setCreating(false)}
          onSubmit={handleCreateInventory}
        />
      )}
    </>
  );
}

/**
 * «Iniciar conteo semanal»: nombre (ya propuesto), fecha y notas. Antes era
 * un modal de 80 % de alto con el título en grande y «Cancelar» salía de la
 * pantalla en vez de cerrarlo.
 */
function StartCountDialog({
  formRef,
  locationName,
  locationId,
  onClose,
  onSubmit,
}: {
  formRef: React.RefObject<AppFormRef<any> | null>;
  locationName?: string;
  locationId?: number;
  onClose: () => void;
  onSubmit: (values: any) => Promise<unknown>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: tokens.spacing[4],
    },
    // Fondo de la página: los campos y la barra de abajo se ven como en
    // cualquier formulario.
    sheet: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "92%",
      backgroundColor: c.background,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.spacing[3],
      // Igual que la barra de abajo, para que todo quede alineado.
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 14,
    },
    title: { ...tokens.typography.h3, color: c.text },
    subtitle: { ...tokens.typography.bodySm, color: c.textSecondary, marginTop: 4 },
  }));

  // Una sola vez al abrir: AppForm vuelve a empezar si cambia el objeto.
  const initialValues = useMemo(
    () => ({
      name: `Conteo semanal ${locationName || ""} - ${new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
      count_date: toLocalDateString(),
      location_id: locationId || null,
      notes: "",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Los avisos (Snackbar) y el calendario se abren dentro del modal: en
          el Portal de la app quedaban detrás. */}
      <Portal.Host>
        <View style={styles.overlay}>
          {/* Tocar fuera cierra, como antes. */}
          <Pressable
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            onPress={onClose}
            accessibilityLabel="Cerrar"
          />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <RNText style={styles.title} accessibilityRole="header">
                  Iniciar conteo semanal
                </RNText>
                <RNText style={styles.subtitle}>
                  Se cuenta lo que hay en {locationName || "esta sucursal"}. Al completarlo, las
                  diferencias ajustan la existencia.
                </RNText>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <AlertsProvider>
              <AppForm
                ref={formRef}
                validationSchema={inventoryValidationSchema}
                initialValues={initialValues}
                onSubmit={async (values) => {
                  await onSubmit(values);
                }}
                submitButtonText="Iniciar conteo"
                onCancel={onClose}
                // Del alto de su contenido (no de toda la pantalla).
                containerStyle={{ flexGrow: 0, flexShrink: 1, flexBasis: "auto" }}
                style={{ flexGrow: 0, flexShrink: 1, paddingHorizontal: 16, paddingTop: 0, paddingBottom: 0 }}
              >
                <FormInput name="name" label="Nombre" maxLength={150} />

                <FormDatePicker name="count_date" label="Fecha" />

                <FormInput
                  name="notes"
                  label="Notas"
                  optional
                  multiline
                  numberOfLines={3}
                />
              </AppForm>
              <AlertsDialogs />
            </AlertsProvider>
          </View>
        </View>
      </Portal.Host>
    </Modal>
  );
}

interface ProgressPieChartProps {
  counted: number;
  pending: number;
  size?: number;
}

function ProgressPieChart({
  counted,
  pending,
  size = 80,
}: ProgressPieChartProps) {
  const { colors } = useTheme();
  const total = counted + pending;

  console.log("ProgressPieChart - counted:", counted, "pending:", pending);

  if (total === 0) {
    return (
      <View
        style={{
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
          0%
        </Text>
      </View>
    );
  }

  const percentage = counted / total;

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ProgressChart
        data={{
          data: [percentage],
        }}
        width={size}
        height={size}
        strokeWidth={8}
        radius={size / 2.5}
        chartConfig={{
          backgroundGradientFrom: "transparent" as any,
          backgroundGradientFromOpacity: 0,
          backgroundGradientTo: "transparent" as any,
          backgroundGradientToOpacity: 0.5,
          color: (opacity = 1) => `rgba(${rgbOf(colors.success)}, ${opacity})`, // Verde para la parte contada
          strokeWidth: 2, // optional, default 3
          barPercentage: 0.5,
          useShadowColorFromDataset: false, // optional
        }}
        hideLegend={true}
        style={{
          marginVertical: 0,
          marginHorizontal: 0,
        }}
      />
      {/* TEXTO EN EL CENTRO */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "bold",

            color: colors.text,
          }}
        >
          {Math.round(percentage * 100)}%
        </Text>
      </View>
    </View>
  );
}
