/**
 * Revisión "Tu pedido": lista sobria al estilo ListGroup, total grande,
 * "¿A nombre de quién?" (opcional), cómo se paga y "Enviar pedido".
 */
import { useTheme } from "@/contexts/ThemeContext";
import type { KioskCartEntry } from "@/hooks/useKioskCart";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import KioskButton from "./KioskButton";
import KioskCartLineRow from "./KioskCartLineRow";
import KioskNotice, { type KioskNoticeMessage } from "./KioskNotice";
import KioskPaymentChoice from "./KioskPaymentChoice";
import { formatCents, KIOSK_NAME_MAX, plural } from "./model";

interface Props {
  entries: KioskCartEntry[];
  count: number;
  totalCents: number;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  notice: KioskNoticeMessage | null;
  onIncrement: (entry: KioskCartEntry) => void;
  onDecrement: (entry: KioskCartEntry) => void;
  onRemove: (entry: KioskCartEntry) => void;
  onSend: () => void;
  onKeepShopping: () => void;
  sending: boolean;
}

export default function KioskReview({
  entries,
  count,
  totalCents,
  customerName,
  onCustomerNameChange,
  notice,
  onIncrement,
  onDecrement,
  onRemove,
  onSend,
  onKeepShopping,
  sending,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingBottom: 40, gap: 20, width: "100%", maxWidth: 760, alignSelf: "center" },
    header: { gap: 2 },
    title: { fontSize: 32, lineHeight: 40, fontWeight: "800", color: c.text },
    count: { fontSize: 18, color: c.textSecondary },
    group: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 16 },
    empty: { padding: 20, gap: 6 },
    emptyTitle: { fontSize: 20, fontWeight: "600", color: c.text },
    emptyText: { fontSize: 18, color: c.textSecondary },
    totalRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      gap: 12,
    },
    totalLabel: { fontSize: 24, fontWeight: "600", color: c.text },
    total: { fontSize: 40, lineHeight: 48, fontWeight: "800", color: c.text, fontVariant: ["tabular-nums"] },
    field: { gap: 8 },
    fieldLabel: { fontSize: 18, fontWeight: "600", color: c.text },
    fieldHint: { fontWeight: "400", color: c.textSecondary },
    input: {
      height: 60,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.surface,
      fontSize: 20,
      color: c.text,
    },
    actions: { gap: 12 },
  }));

  const empty = entries.length === 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="kiosk-review">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Tu pedido
        </Text>
        {!empty ? <Text style={styles.count}>{plural(count, "producto", "productos")}</Text> : null}
      </View>

      {notice ? <KioskNotice notice={notice} testID="kiosk-review-notice" /> : null}

      <View style={styles.group}>
        {empty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Tu pedido está vacío</Text>
            <Text style={styles.emptyText}>Toca «Seguir comprando» para elegir tus productos.</Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <View key={entry.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <KioskCartLineRow entry={entry} onIncrement={onIncrement} onDecrement={onDecrement} onRemove={onRemove} />
            </View>
          ))
        )}
      </View>

      {!empty ? (
        <>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total} testID="kiosk-review-total">
              {formatCents(totalCents)}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              ¿A nombre de quién? <Text style={styles.fieldHint}>(opcional)</Text>
            </Text>
            <TextInput
              value={customerName}
              onChangeText={onCustomerNameChange}
              maxLength={KIOSK_NAME_MAX}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="off"
              keyboardType="default"
              returnKeyType="done"
              accessibilityLabel="¿A nombre de quién? (opcional)"
              testID="kiosk-customer-name"
            />
          </View>

          <KioskPaymentChoice />
        </>
      ) : null}

      <View style={styles.actions}>
        {!empty ? (
          <KioskButton
            label="Enviar pedido"
            size="lg"
            icon="send"
            onPress={onSend}
            loading={sending}
            testID="kiosk-send"
          />
        ) : null}
        <KioskButton
          label="Seguir comprando"
          variant={empty ? "primary" : "secondary"}
          icon="arrow-left"
          onPress={onKeepShopping}
          testID="kiosk-keep-shopping"
        />
      </View>
    </ScrollView>
  );
}
