/**
 * Barra superior delgada del kiosko: nombre de la sucursal (mantenerlo
 * presionado 3 s abre la salida con PIN), búsqueda y "Empezar de nuevo".
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import KioskButton from "./KioskButton";

/** Presión larga para salir del kiosko (solo personal). */
export const KIOSK_EXIT_HOLD_MS = 3000;

export function KioskLocationName({
  name,
  onExitRequest,
  large,
  testID = "kiosk-location-name",
}: {
  name: string;
  onExitRequest: () => void;
  large?: boolean;
  testID?: string;
}) {
  const styles = useThemedStyles((c) => ({
    wrap: { minHeight: 56, justifyContent: "center", flexShrink: 1 },
    text: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: c.text },
    large: { fontSize: 22, lineHeight: 28, fontWeight: "600", color: c.textSecondary },
  }));
  return (
    <Pressable
      onLongPress={onExitRequest}
      delayLongPress={KIOSK_EXIT_HOLD_MS}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={`${name}. Personal: mantén presionado para salir del kiosko.`}
      testID={testID}
    >
      <Text style={large ? styles.large : styles.text} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

export function KioskSearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    box: {
      flex: 1,
      minWidth: 0,
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingLeft: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.background,
    },
    input: {
      flex: 1,
      minWidth: 0,
      height: 54,
      fontSize: 18,
      color: c.text,
      paddingVertical: 0,
      // Sin el contorno azul del navegador: el borde del cuadro ya marca el campo.
      outlineStyle: "none",
    } as any,
    clear: { width: 56, height: 54, alignItems: "center", justifyContent: "center" },
  }));
  return (
    <View style={styles.box}>
      <MaterialCommunityIcons name="magnify" size={26} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Buscar producto"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Buscar producto"
        testID="kiosk-search"
      />
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          testID="kiosk-search-clear"
        >
          <MaterialCommunityIcons name="close-circle" size={26} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface Props {
  locationName: string;
  onExitRequest: () => void;
  onRestart: () => void;
  /** Solo en el catálogo. */
  search?: { value: string; onChange: (value: string) => void };
  /** Pantallas angostas: búsqueda en su propio renglón. */
  compact: boolean;
}

export default function KioskTopBar({ locationName, onExitRequest, onRestart, search, compact }: Props) {
  const styles = useThemedStyles((c) => ({
    bar: {
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 16 },
    name: { flexShrink: 1 },
    nameWide: { maxWidth: 320 },
    spacer: { flex: 1 },
  }));

  const restart = (
    <KioskButton
      label="Empezar de nuevo"
      icon="restart"
      variant="secondary"
      onPress={onRestart}
      testID="kiosk-restart"
    />
  );

  if (compact) {
    return (
      <View style={styles.bar}>
        <View style={styles.row}>
          <View style={[styles.name, styles.spacer]}>
            <KioskLocationName name={locationName} onExitRequest={onExitRequest} />
          </View>
          {restart}
        </View>
        {search ? <KioskSearchBox value={search.value} onChange={search.onChange} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <View style={[styles.name, styles.nameWide]}>
          <KioskLocationName name={locationName} onExitRequest={onExitRequest} />
        </View>
        {search ?<KioskSearchBox value={search.value} onChange={search.onChange} /> : <View style={styles.spacer} />}
        {restart}
      </View>
    </View>
  );
}
