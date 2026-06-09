import { useMemo } from "react";
import {
  ImageStyle,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import type { Palette } from "@/constants/palette";

type Style = ViewStyle | TextStyle | ImageStyle;
type NamedStyles<T> = { [P in keyof T]: Style };
type StyleFactory<T extends NamedStyles<T>> = (colors: Palette) => T;

/**
 * Hook que crea un StyleSheet reactivo al tema.
 *
 * Uso:
 *   const styles = useThemedStyles((colors) => ({
 *     container: { backgroundColor: colors.background },
 *     title: { color: colors.text },
 *   }));
 *
 * Los estilos se recrean solo cuando cambia la paleta (cambio
 * de tema). Se accede a ellos como `styles.container`, etc.
 *
 * Notas:
 * - El factory NO debe capturar estado externo (use closure
 *   values). Si necesita valores externos, paselos como
 *   argumento via useMemo en el componente.
 * - No agregue `factory` al array de deps; se recrea en cada
 *   render. Solo `colors` (que cambia con el tema) dispara
 *   la recreacion del StyleSheet.
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: StyleFactory<T>,
): T {
  const { colors } = useTheme();
  return useMemo(
    () => StyleSheet.create(factory(colors)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );
}
