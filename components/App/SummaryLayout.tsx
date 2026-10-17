/**
 * Armado de las pantallas de resumen (Dashboard, Inventario), con el mismo
 * aspecto que Inicio:
 * - Teléfono: una columna.
 * - Tableta vertical o teléfono acostado: una columna centrada en
 *   ONE_COLUMN_MAX_WIDTH (a dos columnas todo quedaba apretado).
 * - Tableta acostada y escritorio (desde TWO_COLUMNS_MIN_WIDTH de área):
 *   columna principal y lateral. Inicio pasa a dos columnas hasta los 1000
 *   por su lista de tareas; aquí las listas caben antes, y así un iPad
 *   acostado en web (920 de área junto al menú) o una tableta de 8" no se
 *   quedan con una columna angosta en medio de la pantalla.
 *
 * Las columnas se deciden por el ancho real del área, que en web descuenta el
 * menú lateral; antes de medirla, por el de la ventana.
 */

import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Platform,
  Text,
  useWindowDimensions,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export const TWO_COLUMNS_MIN_WIDTH = 900;
export const ONE_COLUMN_MAX_WIDTH = 680;
const WIDE_MAX_WIDTH = 1180;
const WIDE_PADDING = 28;
const COLUMNS_GAP = 28;

export function useSummaryLayout() {
  const styles = useThemedStyles(makeStyles);
  const { isMobile } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
  const [areaWidth, setAreaWidth] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => setAreaWidth(e.nativeEvent.layout.width), []);
  const width = areaWidth ?? windowWidth;
  const twoColumns = width >= TWO_COLUMNS_MIN_WIDTH;
  const inner = Math.min(width, WIDE_MAX_WIDTH) - 2 * WIDE_PADDING;

  return {
    /** Va en la vista que ocupa toda el área (la que envuelve al ScrollView). */
    onLayout,
    phone: isMobile,
    twoColumns,
    /** Ancho aproximado de la columna principal (o de la única). */
    mainWidth: isMobile
      ? width - 32
      : twoColumns
        ? ((inner - COLUMNS_GAP) * 3) / 5
        : Math.min(inner, ONE_COLUMN_MAX_WIDTH),
    /** contentContainerStyle del ScrollView. */
    contentStyle: [
      styles.content,
      !isMobile && styles.contentWide,
      !isMobile && !twoColumns && styles.contentOneColumn,
    ],
  };
}

/** Columna principal (3/5) y lateral (2/5). */
export function SummaryColumns({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.columns}>
      <View style={styles.colMain}>{main}</View>
      <View style={styles.colSide}>{side}</View>
    </View>
  );
}

/**
 * Encabezado: una línea de contexto (fecha o periodo) y el título (la
 * sucursal). Los controles (`children`) van a la derecha en pantallas anchas y
 * debajo en el teléfono.
 */
export function SummaryHeader({
  caption,
  title,
  phone,
  children,
}: {
  caption: string;
  title: string;
  phone: boolean;
  children?: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.header, !phone && styles.headerWide]}>
      <View style={styles.headerText}>
        <Text style={styles.caption}>{caption}</Text>
        <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children ? <View style={[styles.controls, phone && styles.controlsPhone]}>{children}</View> : null}
    </View>
  );
}

/** La cifra con la que abre la pantalla (una sola por pantalla). */
export function HeroFigure({ value, color }: { value: string; color?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text
      style={[styles.hero, color ? { color } : null]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
    >
      {value}
    </Text>
  );
}

/** Bloque gris de carga que respira (con los colores del tema). */
export function SkeletonBlock({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.border, opacity }, style]}
    />
  );
}

/** Esqueleto de un grupo de filas (la forma de un ListGroup). */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <SkeletonBlock width="62%" height={13} />
          <SkeletonBlock width="34%" height={11} />
        </View>
      ))}
    </View>
  );
}

/** Esqueleto de una sección con cifra grande. */
export function SkeletonHero() {
  return (
    <View style={{ gap: 10 }}>
      <SkeletonBlock width={110} height={13} />
      <SkeletonBlock width={200} height={40} radius={8} />
      <SkeletonBlock width={230} height={12} />
    </View>
  );
}

/** Esqueleto de una sección con título y filas. */
export function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 8 }}>
      <SkeletonBlock width={90} height={13} />
      <SkeletonList rows={rows} />
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  content: { padding: 16, gap: 22, paddingBottom: 40 },
  contentWide: { padding: WIDE_PADDING, maxWidth: WIDE_MAX_WIDTH, width: "100%", alignSelf: "center" },
  contentOneColumn: { maxWidth: ONE_COLUMN_MAX_WIDTH },

  columns: { flexDirection: "row", gap: COLUMNS_GAP, alignItems: "flex-start" },
  colMain: { flex: 3, gap: 22, minWidth: 0 },
  colSide: { flex: 2, gap: 22, minWidth: 0 },

  header: { gap: 14, marginTop: 4 },
  headerWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: 24,
    rowGap: 14,
  },
  headerText: { gap: 2, flexShrink: 1, minWidth: 0 },
  caption: { fontSize: 13, lineHeight: 18, color: c.textSecondary, fontWeight: "500" },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: c.text,
    letterSpacing: -0.3,
  },
  controls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  // Sin flexWrap: en columna con wrap, cada control medía lo de su texto.
  controlsPhone: { flexDirection: "column", flexWrap: "nowrap", alignItems: "stretch" },

  hero: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    color: c.text,
    letterSpacing: -1,
  },

  skeletonList: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  skeletonRow: { gap: 7, paddingVertical: 11 },
}));
