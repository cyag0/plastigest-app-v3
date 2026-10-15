import OpenShiftView from "@/components/Pos/OpenShiftView";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { Modal, StyleSheet, View } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Turno abierto: quien lo llamó puede reintentar el cobro. */
  onOpened: () => void;
}

/**
 * Atajo para abrir turno sin salir de la venta, el kiosko o el pedido: el
 * cobro en efectivo fuera del punto de venta exige el turno de caja abierto
 * de quien cobra (si no, el backend responde "no_open_session"). Ir al punto
 * de venta a abrirlo hacía perder el carrito.
 */
export default function OpenShiftModal({ visible, onClose, onOpened }: Props) {
  const { location } = useAuth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Se monta al abrir: así vuelve a pedir las cajas libres cada vez. */}
        {visible && <OpenShiftView locationName={location?.name} onOpened={onOpened} onCancel={onClose} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: palette.overlay },
});
