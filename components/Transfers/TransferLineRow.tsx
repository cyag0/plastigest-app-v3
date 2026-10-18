/**
 * Renglón de una transferencia dentro de un ListGroup: el producto, a la
 * derecha la cantidad de la etapa en la que va (Pedido, Aprobado, Enviado o
 * Recibido) y, debajo, lo que hace falta según quién lo ve: la existencia
 * del origen, las etapas anteriores si cambiaron, el faltante con su motivo,
 * fotos y ajuste, o la captura del paso (`children`).
 *
 * Mismas medidas que PurchaseLineRow y ListRow (14/12 de margen, título 15 y
 * subtítulo 13).
 */

import AppUpload from "@/components/Form/AppUpload";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Platform, Pressable, Text, TextInput, View } from "react-native";
import {
  lineImage,
  lineName,
  linePackage,
  lineQty,
  reasonLabel,
  stockText,
  type LineIncident,
  type LineStage,
  type TransferLine,
} from "./transferFormat";

interface Props {
  line: TransferLine;
  /** Lugar para la foto: algún renglón de la transferencia la tiene. */
  thumb?: boolean;
  /** Etapas del renglón, de la más reciente a la primera (lineStages). */
  stages: LineStage[];
  /** Existencia en el origen (solo a quien surte). */
  showStock?: boolean;
  /** Aviso debajo del renglón (p. ej. "Solo hay 12 pz en tu sucursal"). */
  warning?: string | null;
  /** Faltante de una recepción ya registrada. */
  shortage?: number;
  incident?: LineIncident | null;
  /** Abre el ajuste que generó el faltante. */
  onOpenAdjustment?: () => void;
  /** Captura del paso (cuánto se envía, cuánto llegó). */
  children?: React.ReactNode;
}

export default function TransferLineRow({
  line,
  thumb,
  stages,
  showStock,
  warning,
  shortage = 0,
  incident,
  onOpenAdjustment,
  children,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const name = lineName(line);
  const image = thumb ? lineImage(line) : null;
  const pkg = linePackage(line);
  const [main, ...earlier] = stages;

  // Las etapas anteriores solo si cambió la cantidad (lo pedido que se aprobó
  // y envió completo no se repite), de la primera a la última: "Pedido 10 pz
  // · Enviado 8 pz".
  const changes: string[] = [];
  let previous = main?.value;
  for (const stage of earlier) {
    if (previous !== undefined && Math.abs(stage.value - previous) > 1e-9) {
      changes.unshift(`${stage.label} ${lineQty(line, stage.value)}`);
    }
    previous = stage.value;
  }

  const nothing = !!main && main.value <= 1e-9 && (main.label === "Aprobado" || main.label === "Enviado");
  const subtitle = [line.product?.code, pkg, showStock ? `Hay ${stockText(line)}` : null].filter(Boolean).join(" · ");

  return (
    <View style={styles.row}>
      {thumb &&
        (image ? (
          <Image source={{ uri: image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.textMuted} />
          </View>
        ))}

      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={2}>
              {name}
            </Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {!!main && (
            <View style={styles.stage}>
              <Text style={styles.stageLabel}>{main.label}</Text>
              <Text style={[styles.stageValue, nothing && styles.stageValueMuted]}>{lineQty(line, main.value)}</Text>
            </View>
          )}
        </View>

        {nothing && (
          <Text style={styles.muted}>{main.label === "Aprobado" ? "No se envía" : "No se envió"}</Text>
        )}
        {changes.length > 0 && <Text style={styles.muted}>{changes.join(" · ")}</Text>}
        {!!warning && <Text style={styles.warning}>{warning}</Text>}

        {shortage > 0 && (
          <View style={styles.incident}>
            <Text style={styles.warning}>
              {`${shortage === 1 ? "Faltó" : "Faltaron"} ${lineQty(line, shortage)}`}
              {incident?.reason ? ` · ${reasonLabel(incident.reason)}` : ""}
            </Text>
            {!!incident?.comment && <Text style={styles.quote}>{`«${incident.comment}»`}</Text>}
            {!!incident?.notes && <Text style={styles.muted}>{`Nota: ${incident.notes}`}</Text>}
            {!!incident?.photos.length && (
              <View style={styles.photos}>
                <AppUpload value={incident.photos} readonly accept="images" multiple maxFiles={incident.photos.length} />
              </View>
            )}
            {!!onOpenAdjustment && (
              <Pressable
                onPress={onOpenAdjustment}
                hitSlop={6}
                style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
                accessibilityRole="link"
                accessibilityLabel={`Ver el ajuste de ${name}`}
              >
                <Text style={styles.linkText}>Ver ajuste</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}

        {children}
      </View>
    </View>
  );
}

/**
 * Campo de cantidad con las medidas de QuantityField, pero el texto va tal
 * cual a parseQuantity (como en la recepción de Compras): QuantityField
 * cambia la coma por punto y «1,450» quedaría en 1.45.
 */
export function TransferQuantityInput({
  label,
  value,
  onChangeText,
  unit,
  invalid,
  accessibilityLabel,
  after,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string | null;
  invalid?: boolean;
  accessibilityLabel: string;
  /** Texto a la derecha del campo ("de 24"). */
  after?: string | null;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.capture}>
      <Text style={styles.captureLabel}>{label}</Text>
      <View style={[styles.field, invalid && styles.fieldInvalid]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          inputMode="decimal"
          selectTextOnFocus
          accessibilityLabel={accessibilityLabel}
          style={styles.input}
        />
        {!!unit && <Text style={styles.fieldUnit}>{unit}</Text>}
      </View>
      {!!after && <Text style={styles.captureAfter}>{after}</Text>}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  thumb: { width: 40, height: 40, borderRadius: tokens.radius.sm, backgroundColor: c.surfaceMuted },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titleBox: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
  subtitle: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
  stage: { alignItems: "flex-end", flexShrink: 0 },
  stageLabel: { fontSize: 12, lineHeight: 16, color: c.textMuted },
  stageValue: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: c.text, fontVariant: ["tabular-nums"] },
  stageValueMuted: { color: c.textMuted, fontWeight: "500" },
  muted: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 4 },
  // Ocre "Strong": el ocre normal no llega a 4.5:1 en letra chica.
  warning: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.warningStrong, marginTop: 4 },
  incident: { marginTop: 2 },
  quote: { fontSize: 13, lineHeight: 18, color: c.text, marginTop: 4 },
  photos: { marginTop: 2 },
  link: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 2, marginTop: 6 },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: c.primary },

  capture: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 },
  captureLabel: { fontSize: 14, fontWeight: "500", color: c.textSecondary },
  // Las medidas de QuantityField. Ancho fijo: en web un TextInput mide unos
  // 20 caracteres y se comía el renglón.
  field: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    width: 128,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
  },
  fieldInvalid: { borderColor: c.error, backgroundColor: c.errorSoft },
  input: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    fontSize: 18,
    fontWeight: "600",
    color: c.text,
    textAlign: "right",
    paddingVertical: 0,
    fontVariant: ["tabular-nums"],
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : null),
  },
  fieldUnit: { marginLeft: 4, fontSize: 14, color: c.textSecondary },
  captureAfter: { fontSize: 14, color: c.textSecondary, fontVariant: ["tabular-nums"] },
}));
