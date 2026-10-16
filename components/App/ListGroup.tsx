/**
 * Listas agrupadas: el patrón de Inicio ("Por atender", "Tus tareas")
 * compartido con Tareas y Notificaciones.
 *
 *   <ListSection title="Tus tareas" action={{ label: "Ver todas", onPress }}>
 *     <ListGroup>
 *       <ListRow icon="alarm" title="…" subtitle="…" onPress={…} />
 *     </ListGroup>
 *   </ListSection>
 *
 * Una sola superficie con borde y separadores entre filas, en vez de una
 * tarjeta con sombra por renglón. En listas virtualizadas (FlatList,
 * SectionList) cada fila va en un ListGroupItem, que pinta su parte del
 * borde.
 */

import Skeleton from "@/components/SkeletonLoader";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Sangría del separador en filas con ícono: empieza donde empieza el texto. */
export const LIST_ICON_INSET = 46;
/** Sangría del separador en filas sin ícono. */
export const LIST_TEXT_INSET = 14;

// ─── Sección ────────────────────────────────────────────────────────────────

interface SectionTitleProps {
  title?: string;
  /** Total junto al título ("Vencidas 2"). */
  count?: number;
  action?: { label: string; onPress: () => void };
}

/** Encabezado de sección; suelto, para los de una SectionList. */
export function ListSectionTitle({
  title,
  count,
  action,
  style,
}: SectionTitleProps & { style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(makeStyles);
  if (!title && !action) return null;
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>
        {title}
        {count !== undefined && <Text style={styles.sectionCount}>{`  ${count}`}</Text>}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ListSection({
  title,
  count,
  action,
  children,
  style,
}: SectionTitleProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.section, style]}>
      <ListSectionTitle title={title} count={count} action={action} />
      {children}
    </View>
  );
}

// ─── Grupo ──────────────────────────────────────────────────────────────────

/** Superficie con separadores sólo entre filas (sin doble línea al final). */
export function ListGroup({
  children,
  inset = LIST_ICON_INSET,
  style,
}: {
  children: React.ReactNode;
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[styles.divider, { marginLeft: inset }]} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

/** Una fila de un ListGroup dentro de una lista virtualizada. */
export function ListGroupItem({
  first,
  last,
  inset = LIST_ICON_INSET,
  children,
}: {
  first: boolean;
  last: boolean;
  inset?: number;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.item, first && styles.itemFirst, last && styles.itemLast]}>
      {!first && <View style={[styles.divider, { marginLeft: inset }]} />}
      {children}
    </View>
  );
}

// ─── Filas ──────────────────────────────────────────────────────────────────

export interface ListRowProps {
  icon?: IconName;
  iconColor?: string;
  /** Punto sobre el ícono (p. ej. notificación sin leer). */
  dot?: boolean;
  title: string;
  titleLines?: number;
  /** Título en negritas (p. ej. notificación sin leer). */
  strong?: boolean;
  /** Texto o nodos <Text> (para resaltar una parte con color). */
  subtitle?: React.ReactNode;
  subtitleLines?: number;
  /** Línea discreta al final ("Tarea · hace 2 h"). */
  meta?: string;
  warning?: string;
  /** Acción en texto debajo del contenido ("Abrir turno →"). */
  actionLabel?: string;
  /** En lugar del chevron (p. ej. un menú de acciones). */
  trailing?: React.ReactNode;
  /** Chevron en filas que se pueden tocar (por omisión, sí). */
  chevron?: boolean;
  /** Alinea ícono y acciones arriba: para filas de varias líneas. */
  alignTop?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function ListRow({
  icon,
  iconColor,
  dot,
  title,
  titleLines,
  strong,
  subtitle,
  subtitleLines,
  meta,
  warning,
  actionLabel,
  trailing,
  chevron = true,
  alignTop,
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [highlighted, setHighlighted] = useState(false);
  const showChevron = chevron && !trailing && !actionLabel && !!onPress;
  const highlight = !!onPress && highlighted && { backgroundColor: colors.surfaceMuted };

  const pressable = (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      onPressIn={() => setHighlighted(true)}
      onPressOut={() => setHighlighted(false)}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.row,
        alignTop && styles.rowTop,
        trailing ? styles.rowMain : highlight,
      ]}
    >
      {icon && (
        <View style={alignTop && styles.iconTop}>
          <MaterialCommunityIcons name={icon} size={20} color={iconColor ?? colors.textSecondary} />
          {dot && <View style={styles.dot} />}
        </View>
      )}
      <View style={styles.body}>
        <Text style={[styles.title, strong && styles.titleStrong]} numberOfLines={titleLines}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={subtitleLines}>
            {subtitle}
          </Text>
        )}
        {!!warning && <Text style={[styles.subtitle, { color: colors.warning }]}>{warning}</Text>}
        {!!meta && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}
        {/* La acción va debajo: a la derecha apretaba el texto en el teléfono. */}
        {!!actionLabel && <Text style={styles.action}>{actionLabel} →</Text>}
      </View>
      {showChevron && (
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );

  if (!trailing) return pressable;

  // Las acciones van junto a la fila y no dentro de ella: en web un botón
  // dentro de otro no es válido (React lo marca como error).
  return (
    <View style={[styles.rowOuter, alignTop && styles.rowTop, highlight]}>
      {pressable}
      <View style={[styles.trailing, alignTop && styles.trailingTop]}>{trailing}</View>
    </View>
  );
}

/** Esqueleto de carga con la forma de un ListGroup. */
export function ListGroupSkeleton({ rows = 4 }: { rows?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ListGroup>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <View style={[styles.body, { gap: 6 }]}>
            <Skeleton width="65%" height={14} borderRadius={6} />
            <Skeleton width="40%" height={11} borderRadius={6} />
          </View>
        </View>
      ))}
    </ListGroup>
  );
}

/** Fila de dato: etiqueta a la izquierda, valor a la derecha. */
export function ListValueRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const makeStyles = themedStyles((c) => ({
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: c.textSecondary, flexShrink: 1 },
  sectionCount: { fontWeight: "500", color: c.textMuted },
  sectionAction: { fontSize: 14, fontWeight: "600", color: c.primary },

  group: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  item: {
    backgroundColor: c.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  itemFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: tokens.radius.md,
    borderTopRightRadius: tokens.radius.md,
  },
  itemLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: tokens.radius.md,
    borderBottomRightRadius: tokens.radius.md,
  },
  divider: { height: 1, backgroundColor: c.border },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowTop: { alignItems: "flex-start" },
  rowOuter: { flexDirection: "row", alignItems: "center" },
  rowMain: { flex: 1, paddingRight: 4 },
  trailing: { paddingRight: 8 },
  trailingTop: { paddingTop: 8 },
  iconTop: { marginTop: 1 },
  dot: {
    position: "absolute",
    top: -2,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 9999,
    backgroundColor: c.primary,
    borderWidth: 2,
    borderColor: c.surface,
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
  titleStrong: { fontWeight: "600" },
  subtitle: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 4 },
  action: { fontSize: 14, fontWeight: "600", color: c.primary, marginTop: 6 },

  valueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  valueLabel: { fontSize: 14, lineHeight: 20, color: c.textSecondary, flexShrink: 0 },
  value: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: c.text,
    flexShrink: 1,
    textAlign: "right",
  },
}));
