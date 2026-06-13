import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Svg, { Path, Rect, Text as SvgText, TSpan } from "react-native-svg";

/**
 * Logo de GCStock.
 *
 * Construido con react-native-svg (no hay svg-transformer configurado en
 * el proyecto) a partir del logo de marca `logo_gcstock_app_movil.svg`.
 *
 * Variantes:
 *  - "mark": solo el ícono (cubo de inventario sobre fondo verde). Úsalo
 *    cuando ya hay un texto "GCStock" al lado, para no duplicar el nombre
 *    (ej. header del sidebar, splash).
 *  - "full": ícono + wordmark "GCStock" + tagline. Úsalo cuando el logo va
 *    solo como marca (ej. pantalla de login, encabezados).
 *
 * Colores fijos de marca: verde #4F7A3A y caras del cubo. El color del
 * texto neutro ("GC") es configurable (`wordmarkColor`) para adaptarse a
 * temas claro/oscuro; el acento "tock"/"Stock" siempre es el verde de marca.
 */

const BRAND_GREEN = "#4F7A3A";
const CUBE_TOP = "#FFFFFF";
const CUBE_LEFT = "#CFE3C2";
const CUBE_RIGHT = "#A9CE93";

export interface LogoProps {
  variant?: "mark" | "full";
  /** Para "mark" es el ancho/alto. Para "full" es el ancho (el alto escala). */
  size?: number;
  /** Color del texto neutro ("GC"). Por defecto oscuro; pásalo según el tema. */
  wordmarkColor?: string;
  /** Color de la tagline. */
  taglineColor?: string;
  /** Mostrar la tagline en la variante "full". */
  showTagline?: boolean;
  style?: StyleProp<ViewStyle>;
}

function Mark() {
  return (
    <>
      <Rect x={150} y={300} width={86} height={86} rx={21} fill={BRAND_GREEN} />
      <Path d="M193 318 L218 330 L193 342 L168 330 Z" fill={CUBE_TOP} />
      <Path d="M168 330 L193 342 L193 370 L168 358 Z" fill={CUBE_LEFT} />
      <Path d="M218 330 L193 342 L193 370 L218 358 Z" fill={CUBE_RIGHT} />
    </>
  );
}

export default function Logo({
  variant = "full",
  size = 160,
  wordmarkColor = "#0F172A",
  taglineColor = "#64748B",
  showTagline = true,
  style,
}: LogoProps) {
  if (variant === "mark") {
    return (
      <Svg width={size} height={size} viewBox="150 300 86 86" style={style}>
        <Mark />
      </Svg>
    );
  }

  // viewBox amplio para incluir el wordmark y la tagline sin recortes.
  const VB_WIDTH = 360;
  const VB_HEIGHT = 90;
  const height = (size * VB_HEIGHT) / VB_WIDTH;

  return (
    <Svg
      width={size}
      height={height}
      viewBox={`150 300 ${VB_WIDTH} ${VB_HEIGHT}`}
      style={style}
    >
      <Mark />
      <SvgText x={258} y={356} fontSize={44} fontWeight="600">
        <TSpan fill={wordmarkColor}>GC</TSpan>
        <TSpan fill={BRAND_GREEN}>Stock</TSpan>
      </SvgText>
      {showTagline && (
        <SvgText x={260} y={380} fontSize={13} fill={taglineColor}>
          Gestión de inventario y sucursales
        </SvgText>
      )}
    </Svg>
  );
}
