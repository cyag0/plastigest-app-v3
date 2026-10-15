import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { HelpImageKey } from "./images";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Bloques con los que se escribe un artículo de ayuda. El texto acepta
 * **negritas** para resaltar etiquetas de botones o campos tal como se ven
 * en la app.
 */
export type HelpBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | {
      type: "image";
      /** Clave de `help/images.ts` (lo genera scripts/help-screenshots). */
      image: HelpImageKey;
      caption?: string;
    }
  /** Varias capturas seguidas (los pasos de un flujo), en carrusel horizontal. */
  | { type: "gallery"; images: { image: HelpImageKey; caption?: string }[] }
  | { type: "callout"; tone: "tip" | "warning" | "info"; text: string }
  /** Recorrido de estados en línea: Pendiente → Aprobada → … */
  | { type: "flow"; items: string[]; note?: string }
  /** Términos con descripción, opcionalmente con un punto de color. */
  | {
      type: "definitions";
      items: { term: string; description: string; color?: string }[];
    }
  | { type: "links"; items: HelpLink[] };

export type HelpLink =
  | { label: string; topic: string; section?: string }
  | { label: string; route: string };

export interface HelpSection {
  /** Ancla de la sección: `/help/<topic>?section=<id>`. */
  id: string;
  title: string;
  blocks: HelpBlock[];
}

export interface HelpTopic {
  /** Segmento de la URL: `/help/<id>`. */
  id: string;
  title: string;
  summary: string;
  icon: IconName;
  /** Agrupa los temas en el centro de ayuda (Inventario, Ventas, …). */
  group: string;
  /** Cualquiera de estos permisos muestra el tema en el centro de ayuda. */
  permission?: string | string[];
  /** Pantalla del módulo, para el botón "Ir al módulo". */
  moduleRoute?: string;
  /**
   * Pantallas que abren este tema con el botón de ayuda del AppBar, y la
   * sección a la que llevan. Se escriben como el pathname de expo-router
   * (sin grupos): `/home/transfers/[id]`. Un `*` final cubre las subrutas.
   */
  routes: Record<string, string | null>;
  sections: HelpSection[];
}
