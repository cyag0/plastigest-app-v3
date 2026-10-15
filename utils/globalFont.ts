import React from "react";
import { Platform, StyleSheet } from "react-native";

/**
 * Tipografía de la app: Inter en todas las plataformas.
 *
 * React Native no tiene una "fuente por defecto" global, así que:
 *
 *  - Teléfono: se redefinen `Text` y `TextInput` del módulo react-native
 *    (también los usan react-native-paper, las pestañas, etc.). En Android e
 *    iOS cada grosor es una familia distinta (Inter_700Bold…), y poner
 *    fontWeight sobre una sola familia da negritas falsas o las ignora: el
 *    envoltorio elige la familia según el fontWeight final.
 *  - Web: el navegador sí maneja grosores; lo resuelve una regla CSS en
 *    public/index.html (Inter de Google Fonts) y el tema de Paper.
 *
 * No toca textos con una fuente explícita distinta (íconos, monoespaciada).
 */

export const INTER_FAMILIES = {
  400: "Inter_400Regular",
  500: "Inter_500Medium",
  600: "Inter_600SemiBold",
  700: "Inter_700Bold",
  800: "Inter_800ExtraBold",
} as const;

/** Familia CSS para web (con todos sus grosores). */
export const WEB_FONT_STACK = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Familias "de sistema" que se sustituyen por Inter. */
const REPLACEABLE = /^(System|sans-serif(-medium|-light|-thin|-condensed)?|Roboto|Helvetica|-apple-system|Inter.*)$/i;

function weightNumber(weight: unknown): keyof typeof INTER_FAMILIES {
  if (weight === "bold") return 700;
  const n = Number(weight);
  if (!Number.isFinite(n) || n <= 400) return 400;
  if (n <= 500) return 500;
  if (n <= 600) return 600;
  if (n <= 700) return 700;
  return 800;
}

/**
 * Estilo con la familia de Inter que corresponde a su grosor, o el mismo
 * estilo si tiene otra fuente o hereda de un texto padre.
 */
function interStyle(style: any, insideText: boolean) {
  const flat = StyleSheet.flatten(style) ?? {};
  const family = flat.fontFamily as string | undefined;
  if (family && !REPLACEABLE.test(family)) return style;

  // Texto anidado sin grosor propio: hereda familia (y grosor) del padre.
  if (insideText && flat.fontWeight == null && !family) return style;

  return [style, { fontFamily: INTER_FAMILIES[weightNumber(flat.fontWeight)], fontWeight: "normal" as const }];
}

let applied = false;

export function applyGlobalFont(): void {
  if (applied || Platform.OS === "web") return;
  applied = true;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require("react-native");
  const BaseText = RN.Text;
  const BaseTextInput = RN.TextInput;
  const TextAncestor = RN.unstable_TextAncestorContext;

  function Text(props: any) {
    const insideText = TextAncestor ? React.useContext(TextAncestor) : false;
    return React.createElement(BaseText, { ...props, style: interStyle(props.style, !!insideText) });
  }
  Text.displayName = "Text";

  function TextInput(props: any) {
    return React.createElement(BaseTextInput, { ...props, style: interStyle(props.style, false) });
  }
  TextInput.displayName = "TextInput";
  // Conserva TextInput.State y demás estáticos que usan algunas librerías.
  Object.assign(TextInput, BaseTextInput);

  Object.defineProperty(RN, "Text", { configurable: true, enumerable: true, get: () => Text });
  Object.defineProperty(RN, "TextInput", { configurable: true, enumerable: true, get: () => TextInput });
}
