import { StyleSheet } from "react-native";

/**
 * Compatibilidad de librerías con React Native 0.85. Se importa desde
 * index.js, antes que cualquier otra cosa: las librerías arman sus estilos
 * al importarse.
 *
 * RN 0.85 quitó `StyleSheet.absoluteFillObject`, pero react-native-paper 5
 * (Menu, Modal, FAB.Group, BottomNavigation, ActivityIndicator,
 * TouchableRipple) lo sigue usando.
 * Sin él, el fondo invisible que cierra un menú al tocar fuera quedaba de
 * tamaño cero en Android: el toque pasaba a la pantalla de abajo, el menú se
 * quedaba abierto y se podían abrir varios a la vez. En web,
 * react-native-web todavía lo trae.
 */
const sheet = StyleSheet as typeof StyleSheet & { absoluteFillObject?: object };

if (!sheet.absoluteFillObject) {
  sheet.absoluteFillObject = {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };
}
