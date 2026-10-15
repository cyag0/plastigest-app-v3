/**
 * Centro de ayuda: registro de temas y resolución "pantalla → tema".
 *
 * Para documentar un módulo nuevo:
 * 1. Crear `help/topics/<modulo>.ts` con un `HelpTopic` y agregarlo a
 *    `HELP_TOPICS`.
 * 2. Declarar en `routes` las pantallas del módulo: el AppBar muestra el
 *    botón de ayuda en ellas sin tocar las pantallas.
 * 3. Las capturas se declaran en `scripts/help-screenshots/shots.mjs` y se
 *    generan con `npm run help:screenshots`.
 */

import { router, useFocusEffect, usePathname, type Href } from "expo-router";
import { useCallback, useSyncExternalStore } from "react";
import { transferencias } from "./topics/transferencias";
import type { HelpBlock, HelpTopic } from "./types";

export type { HelpBlock, HelpLink, HelpSection, HelpTopic } from "./types";

export const HELP_TOPICS: HelpTopic[] = [transferencias];

export function getHelpTopic(id: string | undefined): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.id === id);
}

export interface HelpTarget {
  topic: string;
  section?: string;
}

export function helpHref(topic: string, section?: string | null): Href {
  return (section
    ? { pathname: "/(stacks)/help/[topic]", params: { topic, section } }
    : { pathname: "/(stacks)/help/[topic]", params: { topic } }) as Href;
}

export function openHelp(topic: string, section?: string | null) {
  router.push(helpHref(topic, section));
}

function splitPath(path: string) {
  return path.split(/[?#]/)[0].split("/").filter(Boolean);
}

/**
 * Qué tan bien describe `pattern` a `segments`; -1 si no aplica. Los
 * segmentos literales pesan más que los dinámicos ([id]) y una ruta exacta
 * gana a una con `*`, así la pantalla más específica decide la sección.
 */
function matchScore(pattern: string, segments: string[]) {
  const parts = splitPath(pattern);
  const wildcard = parts[parts.length - 1] === "*";
  if (wildcard) parts.pop();

  if (wildcard ? segments.length < parts.length : segments.length !== parts.length) {
    return -1;
  }

  let score = 0;
  for (let i = 0; i < parts.length; i++) {
    if (/^\[.+\]$/.test(parts[i])) {
      score += 1;
    } else if (parts[i] === segments[i]) {
      score += 2;
    } else {
      return -1;
    }
  }

  return wildcard ? score : score + 1;
}

/** Tema y sección que documentan la pantalla `pathname`, si hay. */
export function findHelpForPath(pathname: string): HelpTarget | null {
  const segments = splitPath(pathname);
  let best: HelpTarget | null = null;
  let bestScore = -1;

  for (const topic of HELP_TOPICS) {
    for (const [pattern, section] of Object.entries(topic.routes)) {
      const score = matchScore(pattern, segments);
      if (score > bestScore) {
        bestScore = score;
        best = { topic: topic.id, section: section ?? undefined };
      }
    }
  }

  return best;
}

// --- Sección elegida por la pantalla ---------------------------------------
// Una pantalla puede afinar a dónde lleva el botón del AppBar según su estado
// (ej. el detalle de una transferencia lleva a "Recibir" cuando está en
// camino). Se guarda por pathname para que la pantalla anterior del stack no
// la pise.

let screenOverride: (HelpTarget & { pathname: string }) | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setScreenOverride(next: typeof screenOverride) {
  screenOverride = next;
  listeners.forEach((listener) => listener());
}

/**
 * Hace que el botón de ayuda de esta pantalla abra `section` (y `topic`, si
 * es de otro tema que el de la ruta). Con `null` vuelve a la sección de la
 * ruta.
 */
export function useHelpSection(section: string | null | undefined, topic?: string) {
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      if (!section) return;
      const target = topic ?? findHelpForPath(pathname)?.topic;
      if (!target) return;

      setScreenOverride({ pathname, topic: target, section });
      return () => {
        if (screenOverride?.pathname === pathname) setScreenOverride(null);
      };
    }, [pathname, section, topic]),
  );
}

/** Tema y sección que abre el botón de ayuda en la pantalla actual. */
export function useHelpTarget(): HelpTarget | null {
  const pathname = usePathname();
  const override = useSyncExternalStore(subscribe, () => screenOverride, () => screenOverride);

  if (override && override.pathname === pathname) {
    return { topic: override.topic, section: override.section };
  }

  return findHelpForPath(pathname);
}

// --- Búsqueda ---------------------------------------------------------------

export interface HelpSearchEntry {
  topicId: string;
  topicTitle: string;
  sectionId: string;
  sectionTitle: string;
  text: string;
}

function blockText(block: HelpBlock): string {
  switch (block.type) {
    case "p":
    case "callout":
      return block.text;
    case "steps":
    case "list":
      return block.items.join(" ");
    case "image":
      return block.caption ?? "";
    case "gallery":
      return block.images.map((image) => image.caption ?? "").join(" ");
    case "flow":
      return [...block.items, block.note ?? ""].join(" ");
    case "definitions":
      return block.items.map((item) => `${item.term} ${item.description}`).join(" ");
    case "links":
      return block.items.map((item) => item.label).join(" ");
  }
}

/** Una entrada por sección, con todo su texto plano, para fuse.js. */
export function buildHelpSearchIndex(topics: HelpTopic[]): HelpSearchEntry[] {
  return topics.flatMap((topic) =>
    topic.sections.map((section) => ({
      topicId: topic.id,
      topicTitle: topic.title,
      sectionId: section.id,
      sectionTitle: section.title,
      text: section.blocks.map(blockText).join(" ").replace(/\*\*/g, ""),
    })),
  );
}
