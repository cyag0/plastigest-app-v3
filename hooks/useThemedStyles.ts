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

/**
 * Misma idea que la firma de `StyleSheet.create`: el `& NamedStyles<any>` da
 * tipado contextual al objeto que regresa la factory y el `const` del
 * genérico conserva los literales ("center", "row", "600") en vez de
 * ensancharlos a `string`, que es lo que rompía cada `style={styles.x}`.
 */
type StyleFactory<T> = (colors: Palette) => T & NamedStyles<any>;

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
 * - Una factory definida fuera del componente (compartida entre
 *   varios) conviene declararla con `themedStyles(...)`: una función
 *   normal ensancha los literales y cae en la firma laxa (estilos sin
 *   verificación de tipos).
 */
export function useThemedStyles<const T extends NamedStyles<T> | NamedStyles<any>>(
  factory: StyleFactory<T>,
): T;
/**
 * Firma laxa para factories declaradas como funciones normales fuera del
 * componente, cuyos literales TypeScript ya ensanchó a `string`. Solo
 * cambia el tipado (cada estilo queda como `any`), no el comportamiento.
 */
export function useThemedStyles<T extends Record<string, object>>(
  factory: (colors: Palette) => T,
): { [K in keyof T]: any };
export function useThemedStyles(factory: (colors: Palette) => any) {
  const { colors } = useTheme();
  return useMemo(
    () => StyleSheet.create(factory(colors)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );
}

/**
 * Declara una factory de estilos reutilizable (fuera de un componente) con el
 * tipado estricto de `useThemedStyles`. No hace nada en tiempo de ejecución.
 */
export function themedStyles<const T extends NamedStyles<T> | NamedStyles<any>>(
  factory: StyleFactory<T>,
): StyleFactory<T> {
  return factory;
}
