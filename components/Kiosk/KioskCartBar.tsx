/**
 * Barra inferior del pedido (tableta vertical y teléfono): 72 de alto, color
 * primario. "Ver mi pedido · 3 productos · $397.00 →".
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatCents, plural } from "./model";

export const KIOSK_CART_BAR_HEIGHT = 72;

interface Props {
  count: number;
  totalCents: number;
  onPress: () => void;
  /** Teléfono: título arriba y resumen abajo, en dos renglones. */
  stacked: boolean;
}

export default function KioskCartBar({ count, totalCents, onPress, stacked }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    bar: {
      minHeight: KIOSK_CART_BAR_HEIGHT,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingHorizontal: 24,
    },
    pressed: { backgroundColor: c.primaryHover },
    texts: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 16 },
    textsStacked: { flexDirection: "column", alignItems: "flex-start", gap: 0 },
    title: { fontSize: 22, fontWeight: "800", color: c.primaryForeground },
    meta: {
      flexShrink: 1,
      fontSize: 20,
      fontWeight: "600",
      color: c.primaryForeground,
      fontVariant: ["tabular-nums"],
    },
    metaStacked: { fontSize: 18 },
  }));

  const summary = `${plural(count, "producto", "productos")} · ${formatCents(totalCents)}`;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ver mi pedido: ${summary}`}
      testID="kiosk-cart-bar"
    >
      <View style={[styles.texts, stacked && styles.textsStacked]}>
        <Text style={styles.title} numberOfLines={1}>
          Ver mi pedido
        </Text>
        <Text style={[styles.meta, stacked && styles.metaStacked]} numberOfLines={1}>
          {stacked ? summary : `· ${summary}`}
        </Text>
      </View>
      <MaterialCommunityIcons name="arrow-right" size={30} color={colors.primaryForeground} />
    </Pressable>
  );
}
