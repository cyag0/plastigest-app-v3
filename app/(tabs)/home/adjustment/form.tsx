/**
 * Registrar un ajuste de inventario en una sola pantalla, como Procesos y
 * Compras: dónde se aplica y cuándo pasó, los productos (cada uno con qué
 * pasó y cuánto) y la barra de abajo con la acción concreta ("Registrar
 * salida de 3 pz").
 *
 * Antes se pedía "Dirección" y "Razón" por separado (se podía registrar un
 * "Encontrado" como salida y la razón arrancaba en "Otro"), "Diferencia de
 * conteo" obligaba a hacer la resta a mano, se podía guardar una salida
 * mayor a la existencia (el servidor respondía 422) y "Crear" era un botón
 * chico y gris al final.
 *
 * Cada producto es un ajuste (POST inventory-adjustments, multipart con
 * details[i][...] y las fotos en details[i][evidence][]).
 */

import { ListGroup, ListRow, ListSection, ListValueRow } from "@/components/App/ListGroup";
import AdjustmentLineRow from "@/components/Adjustments/AdjustmentLineRow";
import { checkLine, lineDetail, submitLabel, type DraftLine } from "@/components/Adjustments/adjustmentLine";
import { createAdjustments, loadProductForAdjustment } from "@/components/Adjustments/adjustmentRequests";
import { FORM_MAX_WIDTH, FormFooter } from "@/components/Form/FormLayout";
import ProductPickerSheet, { type PickedProduct } from "@/components/Production/ProductPickerSheet";
import { shortName } from "@/components/Production/productionFormat";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate, parseLocalDate, toLocalDateString } from "@/utils/dates";
import { errorMessageOf } from "@/utils/errorNotice";
import { objectToFormDataWithNestedInputsAsync } from "@/utils/formDataUtils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, usePathname, useRouter } from "expo-router";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Button } from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";

/** "Hoy, 17 oct 2026" · "Ayer, 16 oct 2026" · "14 oct 2026". */
function dateText(value: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (value === toLocalDateString(today)) return `Hoy, ${formatDate(value)}`;
  if (value === toLocalDateString(yesterday)) return `Ayer, ${formatDate(value)}`;
  return formatDate(value);
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export default function AdjustmentForm() {
  const navigation = useNavigation();
  const router = useRouter();
  const pathname = usePathname();
  // También se abre desde Inventario (inventory/adjustment/form). Solo se
  // llega desde la lista: al cancelar o registrar se vuelve a ella (también
  // si se recargó la página, cuando "atrás" llevaba a Inicio).
  const listRoute = pathname.startsWith("/inventory") ? "/(tabs)/inventory/adjustment" : "/(tabs)/home/adjustment";
  const toList = () => router.dismissTo(listRoute as any);
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { location } = useAuth();
  // Un doble toque en "Registrar" no manda dos veces los mismos ajustes.
  const { submitting, run } = useSubmitGuard();
  const narrow = useWindowDimensions().width < 520;

  const today = toLocalDateString();
  const [date, setDate] = useState(today);
  const [dateOpen, setDateOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [picker, setPicker] = useState(false);
  // Se intentó registrar: se marcan los renglones con lo que falta.
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Nuevo ajuste" });
  }, [navigation]);

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 32, gap: 22, maxWidth: FORM_MAX_WIDTH, width: "100%", alignSelf: "center" },
    selectRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    rowLabel: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
    rowValue: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
    rowValueText: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: c.text, textAlign: "right", flexShrink: 1 },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  }));

  const checks = useMemo(() => lines.map(checkLine), [lines]);

  const change = (productId: number, patch: Partial<DraftLine>) => {
    setServerError(null);
    setLines((rows) => rows.map((row) => (row.productId === productId ? { ...row, ...patch } : row)));
  };

  const remove = (productId: number) => {
    setServerError(null);
    setLines((rows) => rows.filter((row) => row.productId !== productId));
  };

  const addProduct = (product: PickedProduct) => {
    setServerError(null);
    setLines((rows) => [
      ...rows,
      {
        productId: product.id,
        name: product.name,
        code: product.code ?? null,
        unitId: product.unit_id,
        unitAbbr: product.unit_abbreviation ?? "",
        unitType: null,
        stock: product.stock,
        units: [],
        captureUnitId: product.unit_id,
        reason: null,
        direction: null,
        qty: "",
        notes: "",
        photos: [],
        showNotes: false,
        showPhotos: false,
      },
    ]);
    // El renglón nuevo queda abajo: en el teléfono se baja a verlo.
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 150);
    // La existencia al momento y las unidades en que se puede capturar.
    loadProductForAdjustment(product.id, product.unit_id).then((info) => {
      if (!info) return;
      setLines((rows) =>
        rows.map((row) =>
          row.productId === product.id
            ? { ...row, stock: info.stock, unitType: info.unitType, code: row.code ?? info.code, units: info.units }
            : row,
        ),
      );
    });
  };

  const problems = lines.map((line, index) => ({ line, problem: checks[index].problem })).filter((row) => row.problem);

  // Lo que dice la barra: el error del servidor o, después de intentar, lo que falta.
  let note: string | null = serverError;
  if (!note && attempted) {
    if (lines.length === 0) note = "Agrega al menos un producto.";
    else if (problems.length === 1)
      note = `${shortName(problems[0].line.name)}: ${lowerFirst(problems[0].problem!.message)}`;
    else if (problems.length > 1) note = `Revisa los ${problems.length} productos marcados.`;
  }

  const submit = () =>
    run(async () => {
      setAttempted(true);
      setServerError(null);
      if (lines.length === 0 || problems.length > 0) return;
      try {
        const form = await objectToFormDataWithNestedInputsAsync({
          applied_at: date,
          details: lines.map((line, index) => lineDetail(line, checks[index])),
        });
        await createAdjustments(form);
        alerts.success(lines.length === 1 ? "Ajuste registrado" : `${lines.length} ajustes registrados`);
        toList();
      } catch (error) {
        setServerError(errorMessageOf(error, "No se pudo registrar el ajuste. Inténtalo de nuevo."));
      }
    });

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <ListGroup inset={14}>
          <ListValueRow label="Se aplica en" value={location?.name ?? "Sin sucursal"} />
          <Pressable
            onPress={() => setDateOpen(true)}
            style={({ pressed }) => [styles.selectRow, pressed && { backgroundColor: colors.surfaceMuted }]}
            accessibilityRole="button"
            accessibilityLabel={`¿Cuándo pasó? ${dateText(date)}. Cambiar`}
          >
            <Text style={styles.rowLabel}>¿Cuándo pasó?</Text>
            <View style={styles.rowValue}>
              <Text style={styles.rowValueText}>{dateText(date)}</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        </ListGroup>

        <ListSection title="Productos" count={lines.length || undefined}>
          <ListGroup inset={14}>
            {lines.map((line, index) => (
              <AdjustmentLineRow
                key={line.productId}
                line={line}
                check={checks[index]}
                showProblems={attempted}
                onChange={(patch) => change(line.productId, patch)}
                onRemove={() => remove(line.productId)}
              />
            ))}
            <ListRow
              icon="plus"
              iconColor={colors.primary}
              title="Agregar producto"
              onPress={() => setPicker(true)}
              chevron={false}
            />
          </ListGroup>
          {lines.length === 0 && (
            <Text style={styles.hint}>Búscalo por nombre o código; también puedes escanearlo.</Text>
          )}
        </ListSection>
      </ScrollView>

      <FormFooter note={note}>
        {/* En el teléfono "Cancelar" ocupa solo lo suyo: así cabe la acción
            completa ("Registrar salida de 3 pz"), que con el reparto de
            siempre se cortaba. */}
        <Button
          mode="outlined"
          onPress={toList}
          disabled={submitting}
          compact={narrow}
          style={narrow ? undefined : { flex: 1 }}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={submit}
          loading={submitting}
          disabled={submitting}
          compact={narrow}
          style={{ flex: narrow ? 1 : 1.4 }}
        >
          {submitLabel(lines, checks)}
        </Button>
      </FormFooter>

      <ProductPickerSheet
        visible={picker}
        onDismiss={() => setPicker(false)}
        title="Agregar producto"
        params={{}}
        excludeIds={lines.map((line) => line.productId)}
        onSelect={addProduct}
      />

      {/* Solo hoy o días pasados: el servidor rechaza una fecha futura. */}
      <DatePickerModal
        locale="es"
        mode="single"
        visible={dateOpen}
        onDismiss={() => setDateOpen(false)}
        date={parseLocalDate(date)}
        validRange={{ endDate: new Date() }}
        label="¿Cuándo pasó?"
        saveLabel="Listo"
        onConfirm={({ date: picked }) => {
          setDateOpen(false);
          if (picked) {
            setServerError(null);
            setDate(toLocalDateString(picked));
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}
