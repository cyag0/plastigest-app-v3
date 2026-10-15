import palette from "@/constants/palette";
import { formatDateTime, toLocalDateString } from "@/utils/dates";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface Props {
  session: App.Entities.CashRegisterSession;
  currentLocationName?: string;
  switching: boolean;
  onSwitch: () => void;
  onCloseShift: () => void;
}

/**
 * El cajero tiene un turno abierto, pero en otra sucursal. Antes el POS
 * mostraba esa caja con el catálogo de la sucursal actual y la venta fallaba
 * hasta el final, al cobrar ("Tu turno abierto es de otra sucursal"). Ahora
 * se avisa desde el inicio y se ofrecen las dos salidas.
 */
export default function OtherLocationShift({ session, currentLocationName, switching, onSwitch, onCloseShift }: Props) {
  const where = session.location_name ?? "otra sucursal";
  const register = session.cash_register_name ?? "Caja";
  // Abierto desde otro día: casi siempre un turno que se olvidó cerrar.
  const stale = !!session.opened_at && toLocalDateString(new Date(session.opened_at)) < toLocalDateString();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="store-alert-outline" size={40} color={palette.warning} />
        <Text variant="titleLarge" style={styles.title}>Tu turno está abierto en otra sucursal</Text>
        <Text style={styles.body}>
          {register} · {where}
          {"\n"}Abierto el {formatDateTime(session.opened_at)}
        </Text>
        {stale && (
          <Text style={styles.warning}>Lleva abierto desde otro día: ciérralo para que el corte cuadre.</Text>
        )}
        <Text style={styles.body}>
          Para cobrar en {currentLocationName ?? "esta sucursal"} cierra ese turno y abre uno aquí, o cámbiate a {where} para seguir con él.
        </Text>

        <Button mode="contained" icon="lock" onPress={onCloseShift} style={styles.button} contentStyle={styles.buttonContent}>
          Cerrar ese turno
        </Button>
        <Button
          mode="outlined"
          icon="swap-horizontal"
          onPress={onSwitch}
          loading={switching}
          disabled={switching}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Ir a {where}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: palette.background },
  card: { width: "100%", maxWidth: 460, backgroundColor: palette.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: palette.border, alignItems: "stretch" },
  title: { fontWeight: "700", color: palette.text, marginTop: 12, marginBottom: 8 },
  body: { color: palette.textSecondary, lineHeight: 21, marginBottom: 8 },
  warning: { color: palette.warning, lineHeight: 21, marginBottom: 8 },
  button: { marginTop: 10, borderRadius: 10 },
  buttonContent: { height: 46 },
});
