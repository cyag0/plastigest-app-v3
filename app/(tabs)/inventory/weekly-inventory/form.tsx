import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, {
  AppFormRef,
  useAppForm,
} from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import useDebounce from "@/hooks/useDebounce";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Platform, Pressable, Text, TextInput, View } from "react-native";
import { ActivityIndicator, Button } from "react-native-paper";
import * as Yup from "yup";

interface InventoryFormProps {
  id: number;
  readonly?: boolean;
}

// Detalle de conteo por producto tal como vive en Formik.
interface Detail {
  id?: number;
  product_id: number;
  location_id?: number;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  notes?: string;
}

interface InventoryFormData {
  id?: number;
  name: string;
  count_date: string;
  location_id?: number;
  status: "planning" | "counting" | "completed" | "cancelled";
  notes?: string;
  details: Record<string, Detail>;
}

// Clave consistente para los detalles dentro de Formik.
const detailKey = (productId: number) => `product_${productId}`;

// Lee el cuerpo del recurso devuelto por la API (Laravel envuelve en `data`).
function unwrap(res: any): any {
  return res?.data?.data ?? res?.data ?? null;
}

// Ejecuta un trabajo asíncrono en lotes para no saturar la red al "marcar todo".
async function runChunked<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 6,
) {
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    await Promise.all(chunk.map(worker));
  }
}

// ===========================================================================
// Pantalla principal: carga productos + detalles existentes y monta el form.
// ===========================================================================
export default function InventoryForm(props: InventoryFormProps) {
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<InventoryFormData>>(null);
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useStyles();

  const [products, setProducts] = useState<App.Entities.Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, detailsRes] = await Promise.all([
        Services.products.index({
          location_id: selectedLocation?.id,
          with_stock: true,
        }),
        Services.inventoryCounts.show(props.id),
      ]);

      const fetchedProducts = ((productsRes.data as any).data ||
        []) as App.Entities.Product[];
      setProducts(fetchedProducts);

      const count = detailsRes.data.data;
      const existing = (count.details || {}) as Record<string, any>;

      const details: Record<string, Detail> = {};
      fetchedProducts.forEach((product) => {
        const prev = existing[detailKey(product.id)] || null;
        const system = Number(product.current_stock || 0);
        details[detailKey(product.id)] = {
          id: prev?.id ?? undefined,
          product_id: product.id,
          location_id: prev?.location_id ?? selectedLocation?.id,
          system_quantity: system,
          counted_quantity:
            prev?.counted_quantity != null
              ? Number(prev.counted_quantity)
              : system,
          difference: prev?.difference != null ? Number(prev.difference) : 0,
          notes: prev?.notes ?? "",
        };
      });

      formRef.current?.setValues({
        name: count.name || "",
        count_date: count.count_date || "",
        location_id: count.location?.id || selectedLocation?.id,
        status: count.status || "planning",
        notes: count.notes || "",
        details,
      } as InventoryFormData);
    } catch (error) {
      console.error("Error fetching initial values:", error);
      alerts.error("No se pudieron cargar los datos del inventario");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, selectedLocation?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cancelar el conteo: confirma y marca el inventario como cancelado.
  const handleCancel = useCallback(async () => {
    const ok = await alerts.confirm("¿Deseas cancelar este conteo?", {
      title: "Cancelar conteo",
      okText: "Sí, cancelar",
      cancelText: "Volver",
    });
    if (!ok) return;
    try {
      await Services.inventoryCounts.update(props.id, {
        status: "cancelled",
      } as any);
      alerts.success("Conteo cancelado");
      router.back();
    } catch {
      alerts.error("No se pudo cancelar el conteo");
    }
  }, [alerts, props.id, router]);

  return (
    <AppForm
      readonly={props.readonly}
      id={props.id}
      ref={formRef}
      style={styles.screen}
      validationSchema={Yup.object().shape({
        name: Yup.string().required("El nombre del inventario es requerido"),
        count_date: Yup.date().required("La fecha es requerida"),
        notes: Yup.string(),
      })}
      submitButtonText="Completar conteo"
      showButtons={!props.readonly}
      showResetButton={false}
      additionalSubmitButtons={
        <Button
          mode="outlined"
          compact={Platform.OS === "web"}
          textColor={colors.error}
          onPress={handleCancel}
        >
          Cancelar conteo
        </Button>
      }
      onSubmit={async (valuesFormData: any) => {
        const current = formRef.current?.getValues();
        const details = current?.details || {};

        const missing = products.filter((p) => !details[detailKey(p.id)]?.id);
        if (missing.length > 0) {
          alerts.warning(
            `Faltan ${missing.length} producto(s) por contar. Usa "Marcar todo como correcto" para completarlos rápido.`,
          );
          return valuesFormData;
        }

        const ok = await alerts.confirm(
          "¿Estás seguro de completar el conteo? El stock se ajustará según las diferencias.",
          { title: "Completar conteo", okText: "Sí, completar" },
        );
        if (!ok) return valuesFormData;

        valuesFormData.append("status", "completed");
        await Services.inventoryCounts.update(props.id, valuesFormData);
        alerts.success("Conteo completado correctamente");
        router.navigate("/inventory/weekly-inventory");
        return valuesFormData;
      }}
    >
      <InfoBanner styles={styles} colors={colors} />

      <View style={styles.card}>
        <FormInput
          name="name"
          label="Nombre del inventario"
          placeholder="Ej: Conteo semanal almacén principal"
        />
        <FormDatePicker name="count_date" label="Fecha del inventario" required />
        <FormInput
          name="notes"
          label="Comentarios"
          placeholder="Observaciones adicionales"
          multiline
          numberOfLines={3}
        />
      </View>

      <CountingManager
        inventoryCountId={props.id}
        products={products}
        loading={loading}
        selectedLocationId={selectedLocation?.id}
      />
    </AppForm>
  );
}

// Banner informativo superior.
function InfoBanner({
  styles,
  colors,
}: {
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerIcon}>
        <MaterialCommunityIcons
          name="clipboard-check-outline"
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Inventario semanal</Text>
        <Text style={styles.bannerText}>
          Verifica el stock físico y confirma si coincide con el sistema.
        </Text>
      </View>
    </View>
  );
}

// ===========================================================================
// Gestor del conteo: resumen, acciones masivas, búsqueda y lista de productos.
// Vive dentro de Formik (AppForm).
// ===========================================================================
interface CountingManagerProps {
  inventoryCountId: number;
  products: App.Entities.Product[];
  loading: boolean;
  selectedLocationId?: number;
}

function CountingManager({
  inventoryCountId,
  products,
  loading,
  selectedLocationId,
}: CountingManagerProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { readonly } = useAppForm();
  const alerts = useAlerts();

  const { values, setFieldValue } = useFormikContext<InventoryFormData>();
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [query, setQuery] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const details = values.details || {};

  // --- Métricas de progreso ---
  const stats = useMemo(() => {
    let counted = 0;
    let ok = 0;
    let diff = 0;
    products.forEach((p) => {
      const d = details[detailKey(p.id)];
      if (d?.id != null) {
        counted++;
        if (Number(d.counted_quantity) === Number(p.current_stock || 0)) ok++;
        else diff++;
      }
    });
    const total = products.length;
    return {
      total,
      counted,
      ok,
      diff,
      pending: total - counted,
      progress: total ? counted / total : 0,
    };
  }, [products, details]);

  // --- Persistencia de un detalle (solo API, devuelve el detalle nuevo) ---
  const storeDetail = useCallback(
    async (
      product: App.Entities.Product,
      patch: { counted_quantity?: number; notes?: string },
    ): Promise<Detail> => {
      const key = detailKey(product.id);
      const current = valuesRef.current.details?.[key];
      const system = Number(product.current_stock || 0);
      const counted = patch.counted_quantity ?? current?.counted_quantity ?? 0;
      const notes = patch.notes ?? current?.notes ?? "";

      const res = await Services.inventoryCountsDetails.store({
        inventory_count_id: inventoryCountId,
        product_id: product.id,
        location_id: selectedLocationId,
        system_quantity: system,
        counted_quantity: counted,
        notes,
      } as any);

      const saved = unwrap(res);
      return {
        id: saved?.id ?? current?.id,
        product_id: product.id,
        location_id: selectedLocationId,
        system_quantity: system,
        counted_quantity: Number(counted),
        difference: Number(counted) - system,
        notes,
      };
    },
    [inventoryCountId, selectedLocationId],
  );

  // Guardado individual (lo usan las tarjetas).
  const saveDetail = useCallback(
    async (
      product: App.Entities.Product,
      patch: { counted_quantity?: number; notes?: string },
    ) => {
      const detail = await storeDetail(product, patch);
      setFieldValue(`details.${detailKey(product.id)}`, detail);
      return detail;
    },
    [storeDetail, setFieldValue],
  );

  // Marcar todos los productos pendientes como correctos (stock = sistema).
  const markAllCorrect = useCallback(async () => {
    const pending = products.filter(
      (p) => valuesRef.current.details?.[detailKey(p.id)]?.id == null,
    );
    if (pending.length === 0) {
      alerts.info("Todos los productos ya están contados");
      return;
    }
    const ok = await alerts.confirm(
      `Se marcarán ${pending.length} producto(s) como correctos (el stock coincide con el sistema). ¿Continuar?`,
      { title: "Marcar todo como correcto", okText: "Sí, marcar" },
    );
    if (!ok) return;

    setBulkLoading(true);
    try {
      const updates: Record<string, Detail> = {};
      await runChunked(pending, async (p) => {
        updates[detailKey(p.id)] = await storeDetail(p, {
          counted_quantity: Number(p.current_stock || 0),
        });
      });
      setFieldValue("details", { ...valuesRef.current.details, ...updates });
      alerts.success(`${pending.length} producto(s) marcados como correctos`);
    } catch {
      alerts.error("Ocurrió un error al marcar los productos");
    } finally {
      setBulkLoading(false);
    }
  }, [products, storeDetail, setFieldValue, alerts]);

  // --- Productos filtrados por búsqueda ---
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q),
    );
  }, [products, query]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      {/* --- Resumen + progreso --- */}
      <View style={styles.card}>
        <View style={styles.summaryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Avance del conteo</Text>
            <Text style={styles.summarySub}>
              {stats.counted} de {stats.total} productos contados
            </Text>
          </View>
          <Text style={styles.summaryPct}>
            {Math.round(stats.progress * 100)}%
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${stats.progress * 100}%` }]}
          />
        </View>

        <View style={styles.statsRow}>
          <StatPill
            icon="check-circle"
            label="Correctos"
            value={stats.ok}
            color={colors.success}
            styles={styles}
          />
          <StatPill
            icon="alert-circle"
            label="Con diferencia"
            value={stats.diff}
            color={colors.warning}
            styles={styles}
          />
          <StatPill
            icon="clock-outline"
            label="Pendientes"
            value={stats.pending}
            color={colors.textMuted}
            styles={styles}
          />
        </View>

        {!readonly && (
          <Pressable
            style={[styles.bulkBtn, bulkLoading && styles.bulkBtnDisabled]}
            onPress={markAllCorrect}
            disabled={bulkLoading || stats.pending === 0}
          >
            {bulkLoading ? (
              <ActivityIndicator size={16} color={colors.primaryForeground} />
            ) : (
              <MaterialCommunityIcons
                name="checkbox-multiple-marked-outline"
                size={18}
                color={colors.primaryForeground}
              />
            )}
            <Text style={styles.bulkBtnText}>
              {stats.pending === 0
                ? "Todo contado"
                : `Marcar todo como correcto (${stats.pending})`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* --- Buscador --- */}
      <View style={styles.searchBox}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={colors.textMuted}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar producto..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <MaterialCommunityIcons
              name="close"
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>

      {/* --- Lista de productos --- */}
      {visibleProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="package-variant"
            size={32}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            {products.length === 0
              ? "No hay productos con stock en esta ubicación"
              : "No se encontraron productos"}
          </Text>
        </View>
      ) : (
        visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            detail={details[detailKey(product.id)]}
            readonly={readonly}
            styles={styles}
            colors={colors}
            onSave={saveDetail}
          />
        ))
      )}
    </View>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
  styles,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: number;
  color: string;
  styles: Styles;
}) {
  return (
    <View style={styles.statPill}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ===========================================================================
// Tarjeta de producto (memoizada). Solo se re-renderiza cuando cambia su
// propio detalle (referencia) o el modo de tema.
// ===========================================================================
type Styles = ReturnType<typeof useStyles>;

interface ProductCardProps {
  product: App.Entities.Product;
  detail?: Detail;
  readonly: boolean;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
  onSave: (
    product: App.Entities.Product,
    patch: { counted_quantity?: number; notes?: string },
  ) => Promise<Detail>;
}

const ProductCard = React.memo(function ProductCard({
  product,
  detail,
  readonly,
  styles,
  colors,
  onSave,
}: ProductCardProps) {
  const system = Number(product.current_stock || 0);
  const unit = product.unit?.abbreviation || "u";

  const savedId = detail?.id;
  const savedCounted = detail?.counted_quantity;

  const derivedMode: "pending" | "correct" | "adjust" =
    savedId == null
      ? "pending"
      : Number(savedCounted) === system
        ? "correct"
        : "adjust";

  const [mode, setMode] = useState(derivedMode);
  const [counted, setCounted] = useState(
    savedCounted != null ? String(savedCounted) : String(system),
  );
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  // Borrador para que el guardado debounced envíe siempre los últimos valores.
  const draftRef = useRef({
    counted: savedCounted != null ? Number(savedCounted) : system,
    notes: detail?.notes || "",
  });

  // Re-sincroniza cuando el detalle cambia desde afuera (ej. "marcar todo").
  useEffect(() => {
    setMode(derivedMode);
    if (savedCounted != null) {
      setCounted(String(savedCounted));
      draftRef.current.counted = Number(savedCounted);
    }
    draftRef.current.notes = detail?.notes || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedId, savedCounted]);

  const persist = useCallback(async () => {
    try {
      setSaving(true);
      await onSave(product, {
        counted_quantity: draftRef.current.counted,
        notes: draftRef.current.notes,
      });
      setFlash(true);
      setTimeout(() => setFlash(false), 1400);
    } catch {
      // El gestor muestra el error global.
    } finally {
      setSaving(false);
    }
  }, [onSave, product]);

  const { run: debouncedPersist } = useDebounce(persist, { time: 450 });

  const onPressCorrect = () => {
    setMode("correct");
    setCounted(String(system));
    draftRef.current.counted = system;
    persist();
  };

  const onPressAdjust = () => {
    setMode("adjust");
  };

  const changeCounted = (next: number) => {
    const v = Math.max(0, next);
    setCounted(String(v));
    draftRef.current.counted = v;
    debouncedPersist();
  };

  const difference = (Number(counted) || 0) - system;

  // ---- Modo lectura ----
  if (readonly) {
    const countedVal = savedCounted != null ? Number(savedCounted) : 0;
    const diff = countedVal - system;
    return (
      <View style={styles.productCard}>
        <ProductHeader
          product={product}
          system={system}
          unit={unit}
          styles={styles}
          colors={colors}
          status={savedId == null ? "pending" : diff === 0 ? "correct" : "adjust"}
        />
        <View style={styles.readonlyRow}>
          <Text style={styles.readonlyLabel}>Cantidad contada</Text>
          <Text style={styles.readonlyValue}>
            {countedVal} {unit}
          </Text>
        </View>
        {diff !== 0 && (
          <DiffBadge diff={diff} unit={unit} styles={styles} colors={colors} />
        )}
        {!!detail?.notes && (
          <Text style={styles.readonlyNotes}>{detail.notes}</Text>
        )}
      </View>
    );
  }

  // ---- Modo edición ----
  return (
    <View style={styles.productCard}>
      <ProductHeader
        product={product}
        system={system}
        unit={unit}
        styles={styles}
        colors={colors}
        status={derivedMode}
        saving={saving}
        flash={flash}
      />

      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentBtn, mode === "correct" && styles.segmentOk]}
          onPress={onPressCorrect}
        >
          <MaterialCommunityIcons
            name="check"
            size={16}
            color={mode === "correct" ? colors.success : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              mode === "correct" && { color: colors.success },
            ]}
          >
            Correcto
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, mode === "adjust" && styles.segmentAdjust]}
          onPress={onPressAdjust}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={15}
            color={mode === "adjust" ? colors.warning : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              mode === "adjust" && { color: colors.warning },
            ]}
          >
            Ajustar
          </Text>
        </Pressable>
      </View>

      {mode === "adjust" && (
        <View style={styles.adjustBox}>
          <Text style={styles.fieldLabel}>Cantidad contada</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, { backgroundColor: colors.errorSoft }]}
              onPress={() => changeCounted((Number(counted) || 0) - 1)}
            >
              <MaterialCommunityIcons
                name="minus"
                size={20}
                color={colors.error}
              />
            </Pressable>
            <TextInput
              value={counted}
              onChangeText={(t) => changeCounted(parseInt(t) || 0)}
              keyboardType="numeric"
              style={styles.stepInput}
              selectTextOnFocus
            />
            <Text style={styles.stepUnit}>{unit}</Text>
            <Pressable
              style={[styles.stepBtn, { backgroundColor: colors.successSoft }]}
              onPress={() => changeCounted((Number(counted) || 0) + 1)}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={colors.success}
              />
            </Pressable>
          </View>

          {difference !== 0 && (
            <DiffBadge
              diff={difference}
              unit={unit}
              styles={styles}
              colors={colors}
            />
          )}

          <Text style={[styles.fieldLabel, { marginTop: tokens.spacing[3] }]}>
            Notas (opcional)
          </Text>
          <TextInput
            defaultValue={detail?.notes || ""}
            onChangeText={(t) => {
              draftRef.current.notes = t;
            }}
            onBlur={persist}
            placeholder="Observaciones..."
            placeholderTextColor={colors.textMuted}
            style={styles.notesInput}
            multiline
          />
        </View>
      )}
    </View>
  );
});

// Encabezado del producto: imagen, nombre, stock sistema y estado.
function ProductHeader({
  product,
  system,
  unit,
  styles,
  colors,
  status,
  saving,
  flash,
}: {
  product: App.Entities.Product;
  system: number;
  unit: string;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
  status: "pending" | "correct" | "adjust";
  saving?: boolean;
  flash?: boolean;
}) {
  const statusMeta = {
    pending: { label: "Pendiente", color: colors.textMuted, icon: "clock-outline" as const },
    correct: { label: "Correcto", color: colors.success, icon: "check-circle" as const },
    adjust: { label: "Ajustado", color: colors.warning, icon: "pencil-circle" as const },
  }[status];

  return (
    <View style={styles.productHeader}>
      {product?.main_image?.uri ? (
        <Image
          source={{ uri: product.main_image.uri }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <MaterialCommunityIcons
            name="package-variant"
            size={22}
            color={colors.textMuted}
          />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={2}>
          {product?.name || "Producto"}
        </Text>
        <Text style={styles.productStock}>
          Stock sistema:{" "}
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            {system} {unit}
          </Text>
        </Text>
      </View>

      <View style={[styles.statusChip, { backgroundColor: statusMeta.color + "1A" }]}>
        {flash ? (
          <MaterialCommunityIcons name="check" size={14} color={colors.success} />
        ) : saving ? (
          <ActivityIndicator size={12} color={statusMeta.color} />
        ) : (
          <MaterialCommunityIcons
            name={statusMeta.icon}
            size={14}
            color={statusMeta.color}
          />
        )}
        <Text style={[styles.statusChipText, { color: statusMeta.color }]}>
          {flash ? "Guardado" : statusMeta.label}
        </Text>
      </View>
    </View>
  );
}

// Badge de diferencia (excedente / faltante).
function DiffBadge({
  diff,
  unit,
  styles,
  colors,
}: {
  diff: number;
  unit: string;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const positive = diff > 0;
  const color = positive ? colors.info : colors.error;
  return (
    <View style={[styles.diffBadge, { backgroundColor: color + "14" }]}>
      <MaterialCommunityIcons
        name={positive ? "arrow-up-bold" : "arrow-down-bold"}
        size={16}
        color={color}
      />
      <Text style={[styles.diffText, { color }]}>
        {positive ? "Excedente" : "Faltante"}: {Math.abs(diff)} {unit}
      </Text>
    </View>
  );
}

// ===========================================================================
// Estilos (reactivos al tema).
// ===========================================================================
function useStyles() {
  const isWeb = Platform.OS === "web";
  return useThemedStyles((c) => ({
    screen: { backgroundColor: c.background },
    content: { gap: tokens.spacing[4] },

    // Banner
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      backgroundColor: c.primarySoft,
      borderRadius: tokens.radius.lg,
      borderLeftWidth: 4,
      borderLeftColor: c.primary,
      padding: tokens.spacing[3],
      marginBottom: tokens.spacing[4],
    },
    bannerIcon: {
      width: 36,
      height: 36,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    bannerTitle: { ...tokens.typography.bodyMd, fontWeight: "700", color: c.text },
    bannerText: { ...tokens.typography.bodySm, color: c.textSecondary, marginTop: 2 },

    // Card genérica
    card: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
      ...tokens.shadow.xs,
    },
    cardTitle: { ...tokens.typography.h3, color: c.text },

    // Resumen
    summaryHeader: { flexDirection: "row", alignItems: "center" },
    summarySub: { ...tokens.typography.bodySm, color: c.textSecondary, marginTop: 2 },
    summaryPct: { ...tokens.typography.h2, color: c.primary },
    progressTrack: {
      height: 8,
      borderRadius: tokens.radius.full,
      backgroundColor: c.surfaceMuted,
      overflow: "hidden",
      marginTop: tokens.spacing[3],
    },
    progressFill: {
      height: "100%",
      borderRadius: tokens.radius.full,
      backgroundColor: c.primary,
    },
    statsRow: {
      flexDirection: "row",
      gap: tokens.spacing[2],
      marginTop: tokens.spacing[4],
    },
    statPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: tokens.spacing[2],
      borderRadius: tokens.radius.md,
      backgroundColor: c.surfaceMuted,
    },
    statValue: { ...tokens.typography.bodyMd, fontWeight: "700" },
    statLabel: { ...tokens.typography.caption, color: c.textSecondary },

    // Botón masivo
    bulkBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.spacing[2],
      marginTop: tokens.spacing[4],
      height: 46,
      borderRadius: tokens.radius.md,
      backgroundColor: c.primary,
    },
    bulkBtnDisabled: { opacity: 0.6 },
    bulkBtnText: {
      ...tokens.typography.bodyMd,
      fontWeight: "700",
      color: c.primaryForeground,
    },

    // Buscador
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      height: 44,
      paddingHorizontal: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: tokens.spacing[2],
    },
    searchInput: {
      flex: 1,
      ...tokens.typography.body,
      color: c.text,
      ...(isWeb ? ({ outlineStyle: "none" } as any) : {}),
    },

    // Producto
    productCard: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: tokens.spacing[3],
      marginBottom: tokens.spacing[3],
    },
    productHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
    },
    productImage: {
      width: 48,
      height: 48,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surfaceMuted,
    },
    productImagePlaceholder: { alignItems: "center", justifyContent: "center" },
    productName: { ...tokens.typography.bodyMd, fontWeight: "600", color: c.text },
    productStock: { ...tokens.typography.bodySm, color: c.textSecondary, marginTop: 2 },
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: tokens.spacing[2],
      borderRadius: tokens.radius.full,
    },
    statusChipText: { ...tokens.typography.caption, fontWeight: "600" },

    // Segmented
    segment: {
      flexDirection: "row",
      gap: tokens.spacing[2],
      marginTop: tokens.spacing[3],
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      height: 42,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    segmentText: { ...tokens.typography.bodySm, fontWeight: "600", color: c.textSecondary },
    segmentOk: { borderColor: c.success, backgroundColor: c.successSoft },
    segmentAdjust: { borderColor: c.warning, backgroundColor: c.warningSoft },

    // Ajuste
    adjustBox: { marginTop: tokens.spacing[3], gap: tokens.spacing[1] },
    fieldLabel: { ...tokens.typography.bodySm, color: c.textSecondary, marginBottom: 6 },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
    },
    stepBtn: {
      width: 44,
      height: 44,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    stepInput: {
      flex: 1,
      height: 44,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      textAlign: "center",
      ...tokens.typography.h3,
      color: c.text,
      ...(isWeb ? ({ outlineStyle: "none" } as any) : {}),
    },
    stepUnit: {
      ...tokens.typography.bodySm,
      color: c.textMuted,
      minWidth: 28,
    },
    notesInput: {
      minHeight: 44,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: tokens.spacing[3],
      paddingTop: tokens.spacing[2],
      ...tokens.typography.body,
      color: c.text,
      ...(isWeb ? ({ outlineStyle: "none" } as any) : {}),
    },

    // Diferencia
    diffBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: tokens.spacing[3],
      borderRadius: tokens.radius.full,
      marginTop: tokens.spacing[2],
    },
    diffText: { ...tokens.typography.bodySm, fontWeight: "700" },

    // Lectura
    readonlyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: tokens.spacing[3],
    },
    readonlyLabel: { ...tokens.typography.bodySm, color: c.textSecondary },
    readonlyValue: { ...tokens.typography.bodyMd, fontWeight: "700", color: c.text },
    readonlyNotes: {
      ...tokens.typography.bodySm,
      color: c.textSecondary,
      marginTop: tokens.spacing[2],
      fontStyle: "italic",
    },

    // Estados
    loadingBox: { alignItems: "center", gap: tokens.spacing[2], paddingVertical: tokens.spacing[8] },
    loadingText: { ...tokens.typography.bodySm, color: c.textMuted },
    emptyState: {
      alignItems: "center",
      gap: tokens.spacing[2],
      paddingVertical: tokens.spacing[8],
    },
    emptyText: { ...tokens.typography.body, color: c.textMuted, textAlign: "center" },
  }));
}
