/**
 * Renglón de una compra dentro de un ListGroup: el producto, lo pedido con
 * el precio que se pagó y el importe; en una compra recibida, lo que llegó;
 * al registrar la recepción, cuánto llegó (por omisión, lo pedido) y el
 * precio que se pagó (por omisión, el del pedido).
 *
 * Mismas medidas que ListRow (14/12 de margen, título 15 y subtítulo 13)
 * con el importe a la derecha, como los renglones del detalle de venta.
 */

import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatMoney, formatQuantity, formatUnitPrice } from "@/utils/format";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Platform, Text, TextInput, View } from "react-native";
import { lineImage, lineUnit, toNum, type PurchaseLine, type ReceiveRow } from "./purchaseFormat";

interface Props {
  line: PurchaseLine;
  /** Lugar para la foto: algún renglón de la compra la tiene. */
  thumb?: boolean;
  /** Compra recibida: lo que llegó contra lo pedido. */
  showReceived?: boolean;
  /** Borrador: el renglón sin precio se avisa (el precio se escribe al continuar). */
  flagMissingPrice?: boolean;
  /** Captura de lo que llegó (compra pedida o en tránsito). */
  receive?: {
    text: string;
    row: ReceiveRow;
    onChangeText: (text: string) => void;
    /** Precio pagado tal como se escribe. */
    priceText: string;
    onChangePrice: (text: string) => void;
  };
}

export default function PurchaseLineRow({ line, thumb, showReceived, flagMissingPrice, receive }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const name = line.product_name || "Producto";
  const unit = lineUnit(line);
  const image = thumb ? lineImage(line) : null;
  const quantity = toNum(line.quantity);
  const price = toNum(line.unit_price);
  const amount = line.subtotal != null ? toNum(line.subtotal) : quantity * price;
  const received = line.quantity_received != null ? toNum(line.quantity_received) : null;
  const short = received !== null && received < quantity - 1e-9;

  const row = receive?.row;
  const missing =
    row && row.received !== null && row.received < row.ordered - 1e-9 ? row.ordered - row.received : 0;

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
          <Text style={styles.title} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.amount}>{formatMoney(amount)}</Text>
        </View>

        {/* Lo pedido y el precio pagado por unidad (o por paquete). */}
        <Text style={styles.subtitle}>
          {`${formatQuantity(quantity, unit)} × ${formatUnitPrice(price)}`}
          {line.product_code ? ` · ${line.product_code}` : ""}
        </Text>

        {flagMissingPrice && price <= 0 && (
          <Text style={styles.warning}>Sin precio: escríbelo al continuar la compra</Text>
        )}

        {showReceived && received !== null && (
          <Text style={short ? styles.warning : styles.received}>
            {short
              ? `Recibido: ${formatQuantity(received)} de ${formatQuantity(quantity, unit)}`
              : `Recibido: ${formatQuantity(received, unit)}`}
          </Text>
        )}

        {receive && row && (
          <>
            <View style={styles.capture}>
              <Text style={styles.captureLabel}>Llegó</Text>
              {/* Se ve como QuantityField, pero el texto va tal cual a
                  parseQuantity, como en el POS: QuantityField cambia la coma
                  por punto (en planta «1,5» es 1.5) y aquí «1,450» bolsas
                  quedaba en 1.45. */}
              <View style={[styles.field, row.error ? styles.fieldInvalid : null]}>
                <TextInput
                  value={receive.text}
                  onChangeText={receive.onChangeText}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType={line.package_id ? "number-pad" : "decimal-pad"}
                  inputMode={line.package_id ? "numeric" : "decimal"}
                  selectTextOnFocus
                  accessibilityLabel={`Cuánto llegó de ${name}`}
                  style={styles.input}
                />
                {/* El nombre del paquete no cabe en el campo: ya va en el subtítulo. */}
                {!line.package_id && !!unit && <Text style={styles.fieldUnit}>{unit}</Text>}
              </View>
              <Text style={styles.captureOf}>de {formatQuantity(row.ordered)}</Text>
            </View>
            {row.error ? (
              <Text style={styles.error}>{row.error}</Text>
            ) : missing > 0 ? (
              <Text style={styles.warning}>Faltan {formatQuantity(missing, unit)}</Text>
            ) : null}

            {/* El precio que de verdad se pagó, si al entregar no es el del
                pedido (cambió, o iba en $0 porque el proveedor lo da al
                entregar): con él salen el egreso de caja y el costo. */}
            <View style={styles.capture}>
              <Text style={styles.captureLabel}>Precio</Text>
              <View style={[styles.field, row.priceError ? styles.fieldInvalid : null]}>
                <Text style={styles.fieldPrefix}>$</Text>
                <TextInput
                  value={receive.priceText}
                  onChangeText={receive.onChangePrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  selectTextOnFocus
                  accessibilityLabel={`Precio pagado de ${name}`}
                  style={styles.input}
                />
              </View>
              <Text style={styles.captureOf}>{unit ? `por ${unit}` : "c/u"}</Text>
            </View>
            {row.priceError ? (
              <Text style={styles.error}>{row.priceError}</Text>
            ) : row.repriced ? (
              <Text style={styles.received}>En el pedido: {formatUnitPrice(price)}</Text>
            ) : null}
          </>
        )}
      </View>
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
  title: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
  amount: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: c.text, fontVariant: ["tabular-nums"] },
  subtitle: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
  received: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 4 },
  // Ocre "Strong": el ocre normal no llega a 4.5:1 en letra chica.
  warning: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.warningStrong, marginTop: 4 },
  error: { fontSize: 13, lineHeight: 18, color: c.error, marginTop: 4 },
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
  fieldPrefix: { marginRight: 4, fontSize: 14, color: c.textSecondary },
  captureOf: { fontSize: 14, color: c.textSecondary, fontVariant: ["tabular-nums"] },
}));
