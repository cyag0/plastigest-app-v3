import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import AppSelect, {
  FormSelectSimple,
} from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/hooks/AHooks";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface RecurringTaskFormData {
  title: string;
  description?: string;
  type: string;
  priority: string;
  assigned_users?: number[];
  due_date: string;
  recurrence_frequency: string;
  recurrence_day?: number;
  recurrence_time: string;
  company_id: number;
  location_id: number;
  is_recurring: boolean;
}

interface RecurringTaskFormProps {
  id?: number;
  readonly?: boolean;
}

const validationSchema = Yup.object().shape({
  title: Yup.string().required("El título es obligatorio"),
  description: Yup.string(),
  type: Yup.string().required("El tipo de tarea es obligatorio"),
  priority: Yup.string().required("La prioridad es obligatoria"),
  assigned_users: Yup.array().of(Yup.number()),
  due_date: Yup.string().required("La fecha de inicio es obligatoria"),
  recurrence_frequency: Yup.string().required("La frecuencia es obligatoria"),
  recurrence_day: Yup.number().when("recurrence_frequency", {
    is: (val: string) => val === "weekly" || val === "monthly",
    then: (schema) => schema.required("El día es obligatorio"),
  }),
  recurrence_time: Yup.string().required("La hora es obligatoria"),
});

export default function RecurringTaskForm(props: RecurringTaskFormProps) {
  const params = useLocalSearchParams();
  const taskId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!taskId;
  const formRef = useRef<AppFormRef<RecurringTaskFormData>>(null);

  const router = useRouter();
  const { company } = useSelectedCompany();
  const { location } = useAuth();

  const [workers, setWorkers] = useState<App.Entities.Worker[]>([]);

  useAsync(async () => {
    if (!location) return;

    try {
      const response = await Services.admin.workers.index({
        company_id: company?.id,
        location_id: location.id,
        is_active: 1 as any,
        all: 1 as any,
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      console.log("Loaded workers for location:", location.id, data);
      setWorkers(data);
    } catch (error) {
      console.error("Error loading workers:", error);
    }
  });

  if (!location) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <IconButton
            icon="alert-circle"
            size={64}
            iconColor={palette.warning}
          />
          <Text variant="titleLarge" style={styles.emptyTitle}>
            Sin Sucursal Seleccionada
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Debes seleccionar una sucursal primero
          </Text>
        </View>
      </View>
    );
  }

  const taskTypes = [
    { label: "Conteo de Inventario", value: "inventory_count" },
    { label: "Reporte de Ventas", value: "sales_report" },
    { label: "Verificación de Stock", value: "stock_check" },
  ];

  const priorities = [
    { label: "Baja", value: "low" },
    { label: "Media", value: "medium" },
    { label: "Alta", value: "high" },
    { label: "Urgente", value: "urgent" },
  ];

  const frequencies = [
    { label: "Diario", value: "daily" },
    { label: "Semanal", value: "weekly" },
    { label: "Mensual", value: "monthly" },
  ];

  const weekDays = [
    { label: "Lunes", value: 1 },
    { label: "Martes", value: 2 },
    { label: "Miércoles", value: 3 },
    { label: "Jueves", value: 4 },
    { label: "Viernes", value: 5 },
    { label: "Sábado", value: 6 },
    { label: "Domingo", value: 7 },
  ];

  const monthDays = Array.from({ length: 31 }, (_, i) => ({
    label: `Día ${i + 1}`,
    value: (i + 1).toString(),
  }));

  return (
    <AppForm
      ref={formRef}
      api={Services.tasks}
      id={taskId}
      readonly={props.readonly}
      onSuccess={() => router.back()}
      initialValues={{
        title: "",
        description: "",
        type: "inventory_count",
        priority: "medium",
        assigned_users: [],
        due_date: new Date().toISOString().split("T")[0],
        recurrence_frequency: "monthly",
        recurrence_day: 1,
        recurrence_time: "09:00",
        company_id: company?.id || 0,
        location_id: location.id,
        is_recurring: true,
      }}
      validationSchema={validationSchema}
      submitButtonText={isEditing ? "Actualizar" : "Crear Tarea"}
    >
      {/* Información Básica */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconButton
            icon="file-document-edit"
            size={24}
            iconColor={palette.primary}
            style={{ margin: 0 }}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Información de la Tarea
          </Text>
        </View>

        <FormInput
          name="title"
          label="Título"
          placeholder="Ej: Conteo mensual de inventario"
          required
        />

        <FormInput
          name="description"
          label="Descripción"
          placeholder="Describe la tarea en detalle"
          multiline
          numberOfLines={3}
        />

        <FormSelectSimple
          name="type"
          label="Tipo de Tarea"
          placeholder="Selecciona el tipo"
          data={taskTypes}
          required
        />

        <FormSelectSimple
          name="priority"
          label="Prioridad"
          placeholder="Selecciona la prioridad"
          data={priorities}
          required
        />
      </View>

      {/* Programación */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconButton
            icon="calendar-clock"
            size={24}
            iconColor={palette.blue}
            style={{ margin: 0 }}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Programación
          </Text>
        </View>

        <FormSelectSimple
          name="recurrence_frequency"
          label="Frecuencia"
          placeholder="Selecciona la frecuencia"
          data={frequencies}
          required
        />

        {/* Mostrar selector de día según la frecuencia */}
        <AppDependency name="recurrence_frequency">
          {(value) => {
            return (
              <FormSelectSimple
                name="recurrence_day"
                label="Día de Ejecución"
                placeholder="Selecciona el día"
                data={value === "weekly" ? weekDays : monthDays}
              />
            );
          }}
        </AppDependency>

        <FormInput
          name="recurrence_time"
          label="Hora de Ejecución"
          placeholder="09:00"
          required
        />

        <FormDatePicker name="due_date" label="Primera Ejecución" required />
      </View>

      {/* Asignación */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconButton
            icon="account-check"
            size={24}
            iconColor={palette.secondary}
            style={{ margin: 0 }}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Asignación
          </Text>
        </View>

        <Text variant="bodySmall" style={styles.helperText}>
          Selecciona uno o varios trabajadores que recibirán esta tarea cada vez
          que se genere
        </Text>

        {workers.length > 0 ? (
          <AppSelect
            name="assigned_users"
            label="Usuarios Asignados"
            placeholder="Selecciona trabajadores (opcional)"
            data={workers.map((w) => ({
              label: w.user_name || "Sin nombre",
              value: w.user_id,
            }))}
            multiple
          />
        ) : (
          <Text
            variant="bodySmall"
            style={{ color: palette.textSecondary, marginTop: 8 }}
          >
            No hay trabajadores activos en esta sucursal para asignar la tarea.
          </Text>
        )}
      </View>

      {/* Nota informativa */}
      <View style={[styles.section, styles.infoSection]}>
        <View style={styles.infoContent}>
          <IconButton
            icon="information"
            size={24}
            iconColor={palette.info}
            style={{ margin: 0 }}
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={styles.infoText}>
              Las tareas recurrentes se crearán automáticamente según la
              programación configurada.
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.infoText, { marginTop: 4 }]}
            >
              Cada nueva tarea generada será asignada al trabajador especificado
              o distribuida automáticamente.
            </Text>
          </View>
        </View>
      </View>
    </AppForm>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: 0,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: "600",
    color: palette.text,
  },
  infoSection: {
    backgroundColor: palette.info + "10",
    borderLeftWidth: 4,
    borderLeftColor: palette.info,
    paddingVertical: 12,
    borderRadius: 8,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontWeight: "700",
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
  },
  helperText: {
    color: palette.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
});
