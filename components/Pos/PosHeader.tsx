import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Menu, Text } from "react-native-paper";

interface Props {
  locationName?: string;
  registerName?: string | null;
  cashierName?: string;
  compact?: boolean;
  /** Sin turno abierto no hay nada que cerrar: la opción no se muestra. */
  onCloseShift?: () => void;
  onExit: () => void;
  /** Corte parcial: imprime el corte del turno abierto. */
  onPrintShift?: () => void;
  /** Ancho del rollo de la impresora de esta caja. */
  ticketWidth?: 58 | 80;
  onToggleTicketWidth?: () => void;
  /** Vuelve a descargar precios y existencias. */
  onRefreshCatalog?: () => void;
}

/** Encabezado del POS: sucursal · caja · cajero · hora. */
export default function PosHeader({ locationName, registerName, cashierName, compact, onCloseShift, onExit, onPrintShift, ticketWidth, onToggleTicketWidth, onRefreshCatalog }: Props) {
  const [now, setNow] = useState(new Date());
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

  return (
    <View style={styles.bar}>
      <IconButton icon="arrow-left" iconColor={palette.textInverse} size={20} onPress={onExit} />
      {compact ? (
        // Celular: la sucursal de la caja también se ve (el turno puede ser
        // de otra sucursal que la seleccionada en la app).
        <View style={styles.compactInfo}>
          {registerName ? (
            <>
              <Item icon="cash-register" text={registerName} strong />
              {locationName ? (
                <Text style={styles.compactSub} numberOfLines={1}>
                  {locationName}
                </Text>
              ) : null}
            </>
          ) : (
            // Sin turno todavía no hay caja: solo la sucursal.
            <Item icon="store" text={locationName} strong />
          )}
        </View>
      ) : (
        <View style={styles.info}>
          <Item icon="store" text={locationName} />
          <Item icon="cash-register" text={registerName ?? undefined} strong />
          <Item icon="account" text={cashierName} />
        </View>
      )}
      <Text style={styles.time}>{time}</Text>
      <Menu
        visible={menu}
        onDismiss={() => setMenu(false)}
        anchorPosition="bottom"
        anchor={<IconButton icon="dots-vertical" iconColor={palette.textInverse} onPress={() => setMenu(true)} />}
      >
        {onRefreshCatalog && (
          <Menu.Item leadingIcon="refresh" title="Actualizar productos" onPress={() => { setMenu(false); onRefreshCatalog(); }} />
        )}
        {onPrintShift && (
          <Menu.Item leadingIcon="printer" title="Imprimir corte parcial" onPress={() => { setMenu(false); onPrintShift(); }} />
        )}
        {onToggleTicketWidth && (
          <Menu.Item
            leadingIcon="receipt-text-outline"
            title={`Cambiar ticket a ${ticketWidth === 58 ? 80 : 58} mm`}
            onPress={() => { setMenu(false); onToggleTicketWidth(); }}
          />
        )}
        {onCloseShift && (
          <Menu.Item leadingIcon="lock" title="Cerrar turno" onPress={() => { setMenu(false); onCloseShift(); }} />
        )}
        <Menu.Item leadingIcon="exit-to-app" title="Salir del punto de venta" onPress={() => { setMenu(false); onExit(); }} />
      </Menu>
    </View>
  );
}

function Item({ icon, text, strong }: { icon: string; text?: string; strong?: boolean }) {
  if (!text) return null;
  return (
    <View style={styles.item}>
      <MaterialCommunityIcons name={icon as any} size={16} color={palette.textInverse} />
      <Text style={[styles.text, strong && { fontWeight: "700" }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compactInfo: { flex: 1, minWidth: 0, justifyContent: "center", paddingVertical: 4 },
  compactSub: { color: palette.textInverse, opacity: 0.85, fontSize: 12, marginLeft: 22 },
  bar: { flexDirection: "row", alignItems: "center", backgroundColor: palette.primary, paddingRight: 4, minHeight: 52 },
  info: { flex: 1, flexDirection: "row", gap: 20, alignItems: "center", flexWrap: "wrap" },
  item: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 260 },
  text: { color: palette.textInverse, fontSize: 15 },
  time: { color: palette.textInverse, fontSize: 15, fontWeight: "600", marginRight: 4 },
});
