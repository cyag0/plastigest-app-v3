import { goBack } from "@/utils/navigation";
import EmptyState from "@/components/App/EmptyState";
import {
  ListGroup,
  ListGroupSkeleton,
  ListRow,
} from "@/components/App/ListGroup";
import ListSearchbar from "@/components/App/ListSearchbar";
import StatusBadge from "@/components/App/StatusBadge";
import { ProportionBar } from "@/components/Dashboard/BreakdownList";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, {
  AppFormRef,
  useAppForm,
} from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormRow, FormSection } from "@/components/Form/FormLayout";
import { inventoryCountStatus } from "@/constants/statuses";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import useDebounce from "@/hooks/useDebounce";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { formatDate } from "@/utils/dates";
import { formatQuantity, parseQuantity } from "@/utils/format";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
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

// Número que manda la API ("12.000"), o el respaldo si no viene.
function toNumber(value: any, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Motivo que manda el backend; nunca el texto en inglés de axios. */
function apiMessage(error: any, fallback: string): string {
  if (error?.isAxiosError && !error.response) {
    return "sin conexión con el servidor";
  }
  const data = error?.response?.data;
  const fieldError = data?.errors
    ? (Object.values(data.errors).flat()[0] as string | undefined)
    : undefined;
  return fieldError || data?.message || data?.error || fallback;
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

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// Nombre (≤ 150, como el backend) y fecha: lo que se manda al completar.
const validationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Escribe el nombre del conteo")
    .max(150, "Usa 150 caracteres o menos"),
  count_date: Yup.date()
    .typeError("Elige la fecha del conteo")
    .required("Elige la fecha del conteo"),
  notes: Yup.string(),
});

// ===========================================================================
// Pantalla principal: carga productos + detalles existentes y monta el form.
// ===========================================================================
// Esta pantalla sólo edita un conteo existente (se crea desde el modal del
// listado). Si se abre /weekly-inventory/form sin id, se regresa al listado
// en lugar de pedir /inventory-counts/undefined.
export default function InventoryFormRoute(props: InventoryFormProps) {
  if (!props.id) {
    return <Redirect href="/inventory/weekly-inventory" />;
  }
  return <InventoryForm {...props} />;
}

function InventoryForm(props: InventoryFormProps) {
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
          // Lo ya contado se compara contra la existencia que tomó el servidor
          // al guardarlo (de ahí sale la diferencia), no contra la de ahora.
          system_quantity: toNumber(prev?.system_quantity, system),
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
      goBack();
    } catch (error) {
      // P. ej. 422 count_closed: alguien más ya lo completó o canceló.
      alerts.error(apiMessage(error, "No se pudo cancelar el conteo"));
    }
  }, [alerts, props.id, router]);

  return (
    <AppForm
      deletePermission="inventory_delete"
      readonly={props.readonly}
      id={props.id}
      ref={formRef}
      style={styles.screen}
      validationSchema={validationSchema}
      submitButtonText="Completar conteo"
      showButtons={!props.readonly}
      showResetButton={false}
      // Cada producto se guarda al momento: no hay nada que descartar con un
      // "Cancelar" (y junto a "Cancelar conteo" confundía). Se sale con la
      // flecha de la barra.
      showCancelButton={false}
      additionalSubmitButtons={
        <Button
          mode="outlined"
          textColor={colors.error}
          onPress={handleCancel}
          style={styles.cancelCountButton}
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
            `Faltan ${plural(missing.length, "producto", "productos")} por contar. Cuéntalos o usa «Marcar pendientes como correctos».`,
          );
          return valuesFormData;
        }

        const ok = await alerts.confirm(
          "Al completarlo, la existencia se ajusta con las diferencias que encontraste.",
          { title: "¿Completar el conteo?", okText: "Sí, completar" },
        );
        if (!ok) return valuesFormData;

        // Solo el encabezado y el estado, en JSON: los renglones ya se
        // guardaron uno por uno. Antes iba todo el formulario como multipart
        // (7 campos por producto) y con ~142 productos PHP cortaba la petición.
        await Services.inventoryCounts.complete(props.id, {
          name: current?.name,
          count_date: current?.count_date,
          notes: current?.notes,
        });
        alerts.success("Conteo completado");
        router.navigate("/inventory/weekly-inventory");
        return valuesFormData;
      }}
    >
      <CountHeader />

      <CountingManager
        inventoryCountId={props.id}
        products={products}
        loading={loading}
        selectedLocationId={selectedLocation?.id}
      />

      <CountDataSection />
    </AppForm>
  );
}

// Encabezado sin tarjeta, como el detalle de Compras: nombre, fecha y estado
// (y las notas en el detalle). Lo que se cuenta va primero; los datos del
// conteo se editan al final, junto a "Completar conteo".
function CountHeader() {
  const { readonly } = useAppForm();
  const { values } = useFormikContext<InventoryFormData>();
  const styles = useStyles();

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {values.name || "Conteo de inventario"}
      </Text>
      {!!values.count_date && (
        <Text style={styles.headerSubtitle}>{formatDate(values.count_date)}</Text>
      )}
      {!!values.status && (
        <View style={styles.headerStatus}>
          <StatusBadge {...inventoryCountStatus(values.status)} />
        </View>
      )}
      {readonly && !!values.notes && (
        <Text style={styles.headerNotes}>{values.notes}</Text>
      )}
    </View>
  );
}

// Nombre, fecha y notas: se mandan al completar el conteo (no antes).
function CountDataSection() {
  const { readonly } = useAppForm();
  if (readonly) return null;

  return (
    <FormSection
      title="Datos del conteo"
      description="El nombre, la fecha y las notas se guardan al completarlo."
    >
      <FormRow widths={[2, 1]}>
        <FormInput name="name" label="Nombre" maxLength={150} />
        <FormDatePicker name="count_date" label="Fecha" />
      </FormRow>
      <FormInput name="notes" label="Notas" optional multiline numberOfLines={2} />
    </FormSection>
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
        // Contra la existencia que tomó el servidor al guardar el renglón.
        const system = toNumber(d.system_quantity, Number(p.current_stock || 0));
        if (Number(d.counted_quantity) === system) ok++;
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
  // Con matches_system ("Correcto", "Marcar todo") la cantidad contada la
  // pone el servidor: su existencia en el momento de guardar. Antes se
  // mandaba la que la pantalla cargó al abrir y, si mientras tanto hubo
  // ventas o recepciones, el cierre metía ajustes fantasma por esa diferencia.
  const storeDetail = useCallback(
    async (
      product: App.Entities.Product,
      patch: { counted_quantity?: number; notes?: string; matches_system?: boolean },
    ): Promise<Detail> => {
      const key = detailKey(product.id);
      const current = valuesRef.current.details?.[key];
      const system = toNumber(current?.system_quantity, Number(product.current_stock || 0));
      // Con matches_system se manda también la cifra de la pantalla: un
      // servidor que aún no conozca el campo guarda lo mismo que antes.
      const counted = patch.matches_system
        ? Number(product.current_stock || 0)
        : patch.counted_quantity ?? current?.counted_quantity ?? 0;
      const notes = patch.notes ?? current?.notes ?? "";

      const res = await Services.inventoryCountsDetails.store({
        inventory_count_id: inventoryCountId,
        product_id: product.id,
        location_id: selectedLocationId,
        system_quantity: system,
        counted_quantity: counted,
        ...(patch.matches_system ? { matches_system: 1 } : {}),
        notes,
      } as any);

      // Lo que guardó el servidor: su existencia del momento y lo contado.
      const saved = unwrap(res);
      const savedSystem = toNumber(saved?.system_quantity, system);
      const savedCounted = toNumber(saved?.counted_quantity, Number(counted));
      return {
        id: saved?.id ?? current?.id,
        product_id: product.id,
        location_id: selectedLocationId,
        system_quantity: savedSystem,
        counted_quantity: savedCounted,
        difference: toNumber(saved?.difference, savedCounted - savedSystem),
        notes: saved?.notes ?? notes,
      };
    },
    [inventoryCountId, selectedLocationId],
  );

  // Guardado individual (lo usan las tarjetas). Antes un error al guardar
  // no se avisaba: la tarjeta seguía como si se hubiera guardado.
  const saveDetail = useCallback(
    async (
      product: App.Entities.Product,
      patch: { counted_quantity?: number; notes?: string; matches_system?: boolean },
    ) => {
      try {
        const detail = await storeDetail(product, patch);
        setFieldValue(`details.${detailKey(product.id)}`, detail);
        return detail;
      } catch (error) {
        alerts.error(
          `No se guardó el conteo de ${product.name}: ${apiMessage(error, "intenta de nuevo")}`,
        );
        throw error;
      }
    },
    [storeDetail, setFieldValue, alerts],
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
      `Se toma como contada la existencia del sistema al guardar cada uno de los ${plural(pending.length, "producto pendiente", "productos pendientes")}.`,
      { title: "¿Marcar pendientes como correctos?", okText: "Sí, marcar" },
    );
    if (!ok) return;

    setBulkLoading(true);
    // Los que sí se guardaron se muestran aunque otros fallen (antes un solo
    // error dejaba la pantalla sin ninguno).
    const updates: Record<string, Detail> = {};
    let failed = 0;
    try {
      await runChunked(pending, async (p) => {
        try {
          updates[detailKey(p.id)] = await storeDetail(p, {
            matches_system: true,
          });
        } catch (error) {
          failed++;
          console.error("Error al marcar como correcto:", error);
        }
      });
    } finally {
      setFieldValue("details", { ...valuesRef.current.details, ...updates });
      setBulkLoading(false);
    }
    const saved = Object.keys(updates).length;
    if (failed === 0) {
      alerts.success(plural(saved, "producto marcado como correcto", "productos marcados como correctos"));
    } else {
      alerts.warning(
        `${plural(saved, "producto marcado como correcto", "productos marcados como correctos")}; ${failed} no se pudieron guardar. Vuelve a intentarlo.`,
      );
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
      <FormSection title="Productos">
        <ListGroupSkeleton rows={5} />
      </FormSection>
    );
  }

  return (
    <View>
      {/* --- Avance (en el detalle, el resumen) --- */}
      <FormSection title={readonly ? "Resumen" : "Avance"} style={styles.section}>
        <ListGroup inset={14}>
          <View style={styles.progress}>
            <View style={styles.progressHead}>
              <Text style={styles.progressText}>
                <Text style={styles.strong}>{stats.counted}</Text> de{" "}
                {plural(stats.total, "producto contado", "productos contados")}
              </Text>
              <Text style={styles.progressPct}>
                {Math.round(stats.progress * 100)}%
              </Text>
            </View>
            {stats.total > 0 && (
              <ProportionBar
                height={8}
                segments={[
                  { key: "ok", value: stats.ok, color: colors.success },
                  { key: "diff", value: stats.diff, color: colors.warning },
                  { key: "pending", value: stats.pending, color: colors.border },
                ]}
              />
            )}
            <View style={styles.legend}>
              <Legend
                icon="check-circle-outline"
                color={colors.success}
                label={plural(stats.ok, "correcto", "correctos")}
              />
              <Legend
                icon="alert-circle-outline"
                color={colors.warning}
                label={`${stats.diff} con diferencia`}
              />
              <Legend
                icon="clock-outline"
                color={colors.textMuted}
                label={plural(stats.pending, "pendiente", "pendientes")}
              />
            </View>
          </View>

          {!readonly && stats.pending > 0 && (
            <ListRow
              icon="checkbox-multiple-marked-outline"
              iconColor={colors.primary}
              title={
                stats.pending === 1
                  ? "Marcar el pendiente como correcto"
                  : `Marcar los ${stats.pending} pendientes como correctos`
              }
              subtitle="Toma como contada la existencia del sistema."
              onPress={bulkLoading ? undefined : markAllCorrect}
              chevron={false}
              trailing={
                bulkLoading ? (
                  <ActivityIndicator size={16} color={colors.primary} />
                ) : undefined
              }
            />
          )}
        </ListGroup>
      </FormSection>

      {/* --- Productos: buscador y lista --- */}
      <FormSection
        title="Productos"
        description={
          readonly
            ? undefined
            : "Toca «Correcto» si lo que hay coincide con el sistema; si no, «Ajustar» y escribe lo que contaste. Cada producto se guarda al momento."
        }
        style={styles.section}
      >
        <View style={styles.productsBody}>
          {products.length > 0 && (
            <ListSearchbar
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por nombre o código"
            />
          )}

          {visibleProducts.length === 0 ? (
            <ListGroup>
              <EmptyState
                compact
                icon={products.length === 0 ? "package-variant" : "magnify"}
                title={
                  products.length === 0
                    ? "No hay productos activos en esta sucursal"
                    : "Sin resultados"
                }
                description={
                  products.length === 0
                    ? undefined
                    : `Ningún producto coincide con «${query.trim()}».`
                }
              />
            </ListGroup>
          ) : (
            <ListGroup inset={14}>
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  detail={details[detailKey(product.id)]}
                  readonly={readonly}
                  styles={styles}
                  colors={colors}
                  onSave={saveDetail}
                />
              ))}
            </ListGroup>
          )}
        </View>
      </FormSection>
    </View>
  );
}

/** Una entrada de la leyenda de la barra de avance: ícono, cifra y nombre. */
function Legend({
  icon,
  color,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  label: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <MaterialCommunityIcons name={icon} size={15} color={color} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

// ===========================================================================
// Renglón de producto (memoizado). Solo se re-renderiza cuando cambia su
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
    patch: { counted_quantity?: number; notes?: string; matches_system?: boolean },
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
  const savedId = detail?.id;
  const savedCounted = detail?.counted_quantity;
  // Ya contado: la existencia que tomó el servidor al guardarlo (contra ella
  // se calcula la diferencia). Pendiente: la existencia al abrir el conteo.
  const system =
    savedId != null
      ? toNumber(detail?.system_quantity, Number(product.current_stock || 0))
      : Number(product.current_stock || 0);
  const unit = product.unit?.abbreviation || "u";
  // Peso y volumen se cuentan con decimales (2.5 kg); las piezas, enteras.
  const allowDecimal =
    !!product.unit?.unit_type && product.unit.unit_type !== "quantity";

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
  const [invalid, setInvalid] = useState(false);

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

  const { run: debouncedPersist, cancel: cancelPersist } = useDebounce(
    persist,
    { time: 450 },
  );

  // "Correcto": la cantidad contada la pone el servidor con su existencia al
  // guardar (no la que esta pantalla cargó al abrir, que pudo cambiar).
  const onPressCorrect = async () => {
    // Una cantidad escrita que esperaba guardarse ya no aplica.
    cancelPersist();
    setMode("correct");
    setInvalid(false);
    try {
      setSaving(true);
      const saved = await onSave(product, {
        matches_system: true,
        notes: draftRef.current.notes,
      });
      setCounted(String(saved.counted_quantity));
      draftRef.current.counted = saved.counted_quantity;
      setFlash(true);
      setTimeout(() => setFlash(false), 1400);
    } catch {
      // El gestor ya mostró el error.
    } finally {
      setSaving(false);
    }
  };

  const onPressAdjust = () => {
    setMode("adjust");
  };

  const changeCounted = (next: number) => {
    const v = Math.max(0, Math.round(next * 1000) / 1000);
    setCounted(String(v));
    setInvalid(false);
    draftRef.current.counted = v;
    debouncedPersist();
  };

  // Lo escrito solo se guarda si es una cantidad válida. Antes se leía con
  // parseInt: los decimales se perdían (2.5 kg → 2) y un campo vacío
  // guardaba 0.
  const changeCountedText = (text: string) => {
    setCounted(text);
    const parsed = parseQuantity(text);
    const valid =
      parsed !== null &&
      parsed >= 0 &&
      (allowDecimal || Number.isInteger(parsed));
    setInvalid(!valid);
    if (!valid) {
      cancelPersist();
      return;
    }
    draftRef.current.counted = Math.round(parsed * 1000) / 1000;
    debouncedPersist();
  };

  const difference = (parseQuantity(counted) ?? 0) - system;

  // ---- Modo lectura ----
  // Un producto sin contar dice "Sin contar" (antes mostraba como contada
  // la existencia del sistema).
  if (readonly) {
    const countedVal = savedCounted != null ? Number(savedCounted) : 0;
    const diff = countedVal - system;
    return (
      <View style={styles.row}>
        <View style={styles.rowHead}>
          <ProductThumb product={product} styles={styles} colors={colors} />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {product?.name || "Producto"}
            </Text>
            <Text style={styles.rowMeta}>
              Sistema {formatQuantity(system, unit)}
              {savedId != null
                ? ` · Contado ${formatQuantity(countedVal, unit)}`
                : ""}
            </Text>
            {!!detail?.notes && (
              <Text style={styles.rowNotes}>{detail.notes}</Text>
            )}
          </View>
          {savedId == null ? (
            <StatusBadge label="Sin contar" tone="neutral" />
          ) : diff === 0 ? (
            <StatusBadge label="Correcto" tone="success" icon="check" />
          ) : (
            <DiffBadge diff={diff} unit={unit} />
          )}
        </View>
      </View>
    );
  }

  // ---- Modo edición ----
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <ProductThumb product={product} styles={styles} colors={colors} />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {product?.name || "Producto"}
          </Text>
          <Text style={styles.rowMeta}>
            Sistema {formatQuantity(system, unit)}
          </Text>
        </View>
        <RowStatus
          status={derivedMode}
          saving={saving}
          flash={flash}
          styles={styles}
          colors={colors}
        />
      </View>

      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentBtn, mode === "correct" && styles.segmentOk]}
          onPress={onPressCorrect}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "correct" }}
          accessibilityLabel={`${product?.name}: correcto`}
        >
          <MaterialCommunityIcons
            name="check"
            size={16}
            color={mode === "correct" ? colors.successStrong : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              mode === "correct" && { color: colors.successStrong },
            ]}
          >
            Correcto
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, mode === "adjust" && styles.segmentAdjust]}
          onPress={onPressAdjust}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "adjust" }}
          accessibilityLabel={`${product?.name}: ajustar`}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={15}
            color={mode === "adjust" ? colors.warningStrong : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              mode === "adjust" && { color: colors.warningStrong },
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
              style={styles.stepBtn}
              onPress={() => changeCounted((parseQuantity(counted) ?? 0) - 1)}
              accessibilityRole="button"
              accessibilityLabel="Uno menos"
            >
              <MaterialCommunityIcons
                name="minus"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            <TextInput
              value={counted}
              onChangeText={changeCountedText}
              keyboardType={allowDecimal ? "decimal-pad" : "number-pad"}
              style={[styles.stepInput, invalid && { borderColor: colors.error }]}
              selectTextOnFocus
              accessibilityLabel={`Cantidad contada de ${product?.name}`}
            />
            <Text style={styles.stepUnit}>{unit}</Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => changeCounted((parseQuantity(counted) ?? 0) + 1)}
              accessibilityRole="button"
              accessibilityLabel="Uno más"
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {invalid ? (
            <Text style={styles.errorText}>
              {allowDecimal
                ? "Escribe una cantidad válida (por ejemplo 2.5)"
                : "Escribe una cantidad entera"}
            </Text>
          ) : difference !== 0 ? (
            <View style={styles.diffLine}>
              <DiffBadge diff={difference} unit={unit} />
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: tokens.spacing[3] }]}>
            Notas <Text style={styles.optional}>(opcional)</Text>
          </Text>
          <TextInput
            defaultValue={detail?.notes || ""}
            onChangeText={(t) => {
              draftRef.current.notes = t;
            }}
            onBlur={persist}
            placeholder="Por qué no coincide"
            placeholderTextColor={colors.textMuted}
            style={styles.notesInput}
            multiline
          />
        </View>
      )}
    </View>
  );
});

// Foto del producto o, sin foto, un ícono gris.
function ProductThumb({
  product,
  styles,
  colors,
}: {
  product: App.Entities.Product;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return product?.main_image?.uri ? (
    <Image
      source={{ uri: product.main_image.uri }}
      style={styles.thumb}
      resizeMode="cover"
    />
  ) : (
    <View style={[styles.thumb, styles.thumbPlaceholder]}>
      <MaterialCommunityIcons
        name="package-variant"
        size={20}
        color={colors.textMuted}
      />
    </View>
  );
}

// Estado del renglón mientras se cuenta: guardando, "Guardado" un momento y
// luego Pendiente / Correcto / Con diferencia.
function RowStatus({
  status,
  saving,
  flash,
  styles,
  colors,
}: {
  status: "pending" | "correct" | "adjust";
  saving?: boolean;
  flash?: boolean;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  if (saving) {
    return (
      <View style={styles.saving}>
        <ActivityIndicator size={12} color={colors.textMuted} />
        <Text style={styles.savingText}>Guardando</Text>
      </View>
    );
  }
  if (flash) return <StatusBadge label="Guardado" tone="success" icon="check" />;
  if (status === "correct") return <StatusBadge label="Correcto" tone="success" />;
  if (status === "adjust") return <StatusBadge label="Con diferencia" tone="warning" />;
  return <StatusBadge label="Pendiente" tone="neutral" />;
}

// Diferencia contra el sistema: "Sobran 2 pz" / "Faltan 3 pz".
function DiffBadge({ diff, unit }: { diff: number; unit: string }) {
  const positive = diff > 0;
  return (
    <StatusBadge
      label={`${positive ? "Sobran" : "Faltan"} ${formatQuantity(Math.abs(diff), unit)}`}
      tone={positive ? "info" : "warning"}
      icon={positive ? "arrow-up" : "arrow-down"}
    />
  );
}

// ===========================================================================
// Estilos (reactivos al tema).
// ===========================================================================
function useStyles() {
  const isWeb = Platform.OS === "web";
  return useThemedStyles((c) => ({
    screen: { backgroundColor: c.background },
    section: { marginBottom: 22 },
    productsBody: { gap: 8 },
    // Mismo ancho que "Completar conteo": en el teléfono no se corta.
    cancelCountButton: { flex: 1.4 },

    // Encabezado del detalle (sin tarjeta, como el detalle de Compras).
    header: { gap: 4, marginBottom: 22 },
    headerTitle: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.2,
    },
    headerSubtitle: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
    headerStatus: { flexDirection: "row", marginTop: 6 },
    headerNotes: { fontSize: 14, lineHeight: 20, color: c.text, marginTop: 8 },

    strong: { fontWeight: "700", color: c.text },

    // Avance
    progress: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    progressHead: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    progressText: { flex: 1, fontSize: 15, lineHeight: 20, color: c.text },
    progressPct: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "600",
      color: c.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendText: { fontSize: 13, lineHeight: 18, color: c.textSecondary },

    // Renglón de producto
    row: { paddingHorizontal: 14, paddingVertical: 12 },
    rowHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
    rowMeta: {
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
      marginTop: 2,
      fontVariant: ["tabular-nums"],
    },
    rowNotes: { fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 4 },
    thumb: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.surfaceMuted,
    },
    thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
    saving: { flexDirection: "row", alignItems: "center", gap: 6, height: 22 },
    savingText: { fontSize: 12, lineHeight: 16, color: c.textMuted },

    // Correcto / Ajustar
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
      height: 40,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    segmentText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    segmentOk: { borderColor: c.success, backgroundColor: c.successSoft },
    segmentAdjust: { borderColor: c.warning, backgroundColor: c.warningSoft },

    // Ajuste
    adjustBox: { marginTop: tokens.spacing[3] },
    fieldLabel: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600",
      color: c.textSecondary,
      marginBottom: 6,
    },
    optional: { fontWeight: "400", color: c.textMuted },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      maxWidth: 360,
    },
    stepBtn: {
      width: 48,
      height: 48,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    stepInput: {
      flex: 1,
      minWidth: 0,
      height: 48,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
      ...(isWeb ? ({ outlineStyle: "none" } as any) : {}),
    },
    stepUnit: {
      fontSize: 14,
      color: c.textMuted,
      minWidth: 24,
    },
    errorText: { fontSize: 13, lineHeight: 18, color: c.error, marginTop: 6 },
    diffLine: { flexDirection: "row", marginTop: 8 },
    notesInput: {
      minHeight: 48,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      fontSize: 15,
      color: c.text,
      textAlignVertical: "top",
      ...(isWeb ? ({ outlineStyle: "none" } as any) : {}),
    },
  }));
}
