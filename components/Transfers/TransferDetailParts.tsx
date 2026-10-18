/**
 * Piezas del detalle de una transferencia que comparten sus cuatro vistas
 * (aprobar, enviar, recibir y la ya terminada), como el detalle de Compras:
 * - Encabezado sin tarjeta: de qué sucursal a cuál, folio, quién la pidió y
 *   cuándo, el estado, qué significa y los pasos.
 * - Productos en un solo ListGroup.
 * - Fotos de cada paso (se abren en grande), notas e historial.
 * - Armado a una o dos columnas con la acción del paso en la barra de abajo.
 */

import IconLabel from "@/components/App/IconLabel";
import { LIST_TEXT_INSET, ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import StatusBadge from "@/components/App/StatusBadge";
import { SkeletonBlock, SkeletonSection, SummaryColumns, useSummaryLayout } from "@/components/App/SummaryLayout";
import AppUpload, { type UploadedFile } from "@/components/Form/AppUpload";
import { transferStatus } from "@/constants/statuses";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate, formatDateTime } from "@/utils/dates";
import { shortLocationName } from "@/utils/locations";
import type { InventoryTransfer } from "@/utils/services/transferService";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { requestedAt, transferHistory } from "./transferFormat";
import { TransferSteps } from "./TransferWizardSteps";

/** Nombres cortos de origen y destino ("Sucursal Matriz", "La Lija"). */
export function transferPlaces(transfer: InventoryTransfer, companyName?: string | null) {
  return {
    from: shortLocationName(transfer.from_location?.name || "Origen", companyName),
    to: shortLocationName(transfer.to_location?.name || "Destino", companyName),
  };
}

export const transferFolio = (transfer: InventoryTransfer): string =>
  transfer.transfer_number || `#${transfer.id}`;

// ── Encabezado ──────────────────────────────────────────────────────────────

export function TransferHeader({
  transfer,
  hint,
  reason,
  currentLocationId,
  companyName,
}: {
  transfer: InventoryTransfer;
  /** Qué significa el estado y a quién le toca (statusHint). */
  hint: string;
  /** Por qué se rechazó (rejectionReason), completo. */
  reason?: string | null;
  currentLocationId?: number | null;
  companyName?: string | null;
}) {
  const styles = useThemedStyles(makeStyles);
  const places = transferPlaces(transfer, companyName);
  const requester = transfer.requested_by_user?.name;
  const date = requestedAt(transfer);
  // La dirección vista desde la sucursal actual, como en las listas.
  const incoming = currentLocationId != null && Number(transfer.to_location_id) === Number(currentLocationId);
  const outgoing = currentLocationId != null && Number(transfer.from_location_id) === Number(currentLocationId);

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title} accessibilityRole="header">
          {`${places.from} → ${places.to}`}
        </Text>
        <Text style={styles.subtitle} selectable>
          {[transferFolio(transfer), requester ? `Pidió ${requester}` : null, date ? formatDate(date) : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <View style={styles.statusRow}>
          {/* En un View cada uno se centra con el otro (sueltos se alinean arriba). */}
          <View>
            <StatusBadge {...transferStatus(transfer.status)} />
          </View>
          {incoming && (
            <View>
              <IconLabel icon="arrow-down-bold-circle-outline" label="Yo solicité" />
            </View>
          )}
          {outgoing && (
            <View>
              <IconLabel icon="arrow-up-bold-circle-outline" label="Me solicitaron" />
            </View>
          )}
        </View>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
        {!!reason && (
          <Text style={styles.reason} selectable>
            <Text style={styles.reasonLabel}>Motivo: </Text>
            {reason}
          </Text>
        )}
      </View>
      <TransferSteps transfer={transfer} />
    </View>
  );
}

// ── Armado ──────────────────────────────────────────────────────────────────

/**
 * Una columna en el teléfono y dos desde 900 de ancho (productos y lo demás),
 * como el detalle de Compras; la barra de abajo (la acción del paso) queda
 * fija fuera del scroll.
 */
export function TransferLayout({
  header,
  main,
  side,
  footer,
}: {
  header: React.ReactNode;
  main: React.ReactNode;
  side: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const layout = useSummaryLayout();
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      onLayout={layout.onLayout}
    >
      <ScrollView
        contentContainerStyle={layout.contentStyle}
        // Un toque en un botón con el teclado abierto cuenta.
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {header}
        {layout.twoColumns ? (
          <SummaryColumns main={main} side={side} />
        ) : (
          <>
            {main}
            {side}
          </>
        )}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

/** Los productos en una sola superficie, con una línea de ayuda arriba. */
export function TransferProducts({
  count,
  hint,
  children,
}: {
  count: number;
  hint?: string | null;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ListSection title="Productos" count={count}>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      <ListGroup inset={LIST_TEXT_INSET}>{children}</ListGroup>
    </ListSection>
  );
}

// ── Lo de un lado: fotos, notas e historial ─────────────────────────────────

export function TransferPhotos({ title, photos }: { title: string; photos: UploadedFile[] }) {
  if (photos.length === 0) return null;
  return (
    <ListSection title={title} count={photos.length}>
      <AppUpload value={photos} readonly accept="images" multiple maxFiles={photos.length} />
    </ListSection>
  );
}

export function TransferNote({ title, note }: { title: string; note?: string | null }) {
  const styles = useThemedStyles(makeStyles);
  if (!note) return null;
  return (
    <ListSection title={title}>
      <Text style={styles.note} selectable>
        {note}
      </Text>
    </ListSection>
  );
}

/** Lo que pasó y quién lo hizo (quien aprobó, rechazó o canceló no viene del API). */
export function TransferHistory({ transfer }: { transfer: InventoryTransfer }) {
  const { colors } = useTheme();
  const entries = transferHistory(transfer);
  return (
    <ListSection title="Historial">
      <ListGroup>
        {entries.map((entry) => (
          <ListRow
            key={entry.key}
            icon={entry.icon}
            iconColor={entry.tone === "danger" ? colors.errorStrong : undefined}
            title={entry.title}
            subtitle={[entry.at ? formatDateTime(entry.at) : null, entry.by].filter(Boolean).join(" · ") || undefined}
            meta={entry.note ?? undefined}
            chevron={false}
          />
        ))}
      </ListGroup>
    </ListSection>
  );
}

// ── Carga ───────────────────────────────────────────────────────────────────

/** Esqueleto con la forma del detalle mientras carga. */
export function TransferSkeleton() {
  const styles = useThemedStyles(makeStyles);
  const layout = useSummaryLayout();
  const main = <SkeletonSection rows={4} />;
  const side = (
    <>
      <SkeletonSection rows={2} />
      <SkeletonSection rows={3} />
    </>
  );
  return (
    <View style={styles.screen} onLayout={layout.onLayout}>
      <ScrollView contentContainerStyle={layout.contentStyle}>
        <View style={styles.skeletonHeader}>
          <SkeletonBlock width={260} height={26} radius={8} />
          <SkeletonBlock width={220} height={13} />
          <SkeletonBlock width={90} height={22} radius={11} />
        </View>
        {layout.twoColumns ? (
          <SummaryColumns main={main} side={side} />
        ) : (
          <>
            {main}
            {side}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },

  header: { gap: 18 },
  headerText: { gap: 4, minWidth: 0 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 12,
    rowGap: 6,
    marginTop: 6,
  },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  reason: { fontSize: 14, lineHeight: 20, color: c.text, marginTop: 2 },
  reasonLabel: { fontWeight: "600" },
  note: { fontSize: 14, lineHeight: 20, color: c.text },
  skeletonHeader: { gap: 8 },
}));
