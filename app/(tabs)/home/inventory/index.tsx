import AppList, { FilterConfig } from "@/components/App/AppList/AppList";
import AppModal, { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import { AlertsProvider } from "@/hooks/useAlerts";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { View } from "react-native";
import { ProgressChart } from "react-native-chart-kit";
import { Text } from "react-native-paper";
import * as Yup from "yup";

const inventoryValidationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre del inventario es requerido"),
  count_date: Yup.date().required("La fecha es requerida"),
  notes: Yup.string(),
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
  const { selectedLocation, isLoadingLocations } = useSelectedLocation();
  const modalRef = useRef<AppModalRef>(null);
  const formRef = useRef<AppFormRef<any>>(null);
  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onSuccess: (uri) => console.log("PDF abierto exitosamente:", uri),
    onError: (error) => console.error("Error al descargar PDF:", error),
  });

  if (isLoadingLocations) {
    return <Text>Cargando...</Text>;
  }

  const handleCreateInventory = async (values: any) => {
    try {
      console.log("Creating inventory with values:", values);

      const response = await Services.inventoryCounts.store(values);

      modalRef.current?.hide();
      formRef.current?.resetForm();

      // Navegar al detalle del inventario creado
      if (response.data?.id) {
        router.push(`/home/inventory/${response.data.id}` as any);
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
        defaultFilters={{
          location_id: selectedLocation?.id,
        }}
        filters={inventoryFilters}
        onPressCreate={() =>
          modalRef.current?.show({
            title: "Iniciar Inventario Semanal",
            dismissable: true,
            width: "90%",
          })
        }
        renderCard={({ item }: { item: any }) => {
          const statusLabels: Record<string, string> = {
            planning: "Planificación",
            counting: "Contando",
            completed: "Completado",
            cancelled: "Cancelado",
          };

          const statusColors: Record<string, string> = {
            planning: palette.textSecondary,
            counting: palette.warning,
            completed: palette.success,
            cancelled: palette.error,
          };

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
                    <Text style={{ color: palette.warning, fontWeight: "600" }}>
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
                <View
                  style={{
                    backgroundColor:
                      statusColors[item.status] || palette.textSecondary,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    variant="labelSmall"
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 8 }}
                  >
                    {statusLabels[item.status] || item.status}
                  </Text>
                </View>
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
        onItemPress={(item) => router.push(`/home/inventory/${item.id}` as any)}
        searchPlaceholder="Buscar inventarios..."
        emptyMessage="No hay inventarios registrados"
        menu={{
          showView: true,
          showEdit: (item: App.Entities.InventoryCount.InventoryCount) =>
            item.status !== "completed" && item.status !== "cancelled",
          showDelete: false,
          onEdit(item) {
            router.push(`/home/inventory/${item.id}/edit` as any);
          },
          customActions: [
            {
              title: isDownloading ? "Descargando..." : "Descargar PDF",
              icon: "file-pdf-box",
              color: palette.error,
              show: (item: App.Entities.InventoryCount.InventoryCount) =>
                item.status === "completed",
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

      <AppModal ref={modalRef}>
        <AlertsProvider>
          <AppForm
            ref={formRef}
            validationSchema={inventoryValidationSchema}
            initialValues={{
              name: `Conteo Semanal ${
                selectedLocation?.name || ""
              } - ${new Date().toLocaleDateString("es-MX", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}`,
              count_date: new Date().toISOString().split("T")[0],
              location_id: selectedLocation?.id || null,
              notes: "",
            }}
            onSubmit={(values, form) => {
              console.log("Submitting form with values:", values);
              handleCreateInventory(values);
            }}
          >
            <FormInput
              name="name"
              label="Nombre del Inventario"
              placeholder="Ej: Conteo Semanal Almacén Principal"
              required
            />

            <FormDatePicker
              name="count_date"
              label="Fecha del Conteo"
              required
            />

            <FormInput
              name="notes"
              label="Notas"
              placeholder="Observaciones generales del inventario"
              multiline
              numberOfLines={4}
            />
          </AppForm>
        </AlertsProvider>
      </AppModal>
    </>
  );
}

function formatDate(dateString: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
        <Text variant="labelSmall" style={{ color: palette.textSecondary }}>
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
          backgroundGradientFrom: "transparent",
          backgroundGradientFromOpacity: 0,
          backgroundGradientTo: "transparent",
          backgroundGradientToOpacity: 0.5,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Verde para la parte contada
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

            color: palette.error,
          }}
        >
          {Math.round(percentage * 100)}%
        </Text>
      </View>
    </View>
  );
}
