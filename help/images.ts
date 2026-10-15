// Generado por scripts/help-screenshots/run.mjs. No editar a mano: se
// reescribe al regenerar las capturas (npm run help:screenshots).

export interface HelpImage {
  source: number;
  width: number;
  height: number;
}

export const helpImages = {
  "transferencias/aprobar": { source: require("../assets/help/transferencias/aprobar.webp"), width: 780, height: 1688 },
  "transferencias/carrito": { source: require("../assets/help/transferencias/carrito.webp"), width: 780, height: 1688 },
  "transferencias/diferencias": { source: require("../assets/help/transferencias/diferencias.webp"), width: 780, height: 1688 },
  "transferencias/enviar": { source: require("../assets/help/transferencias/enviar.webp"), width: 780, height: 1688 },
  "transferencias/menu": { source: require("../assets/help/transferencias/menu.webp"), width: 780, height: 1688 },
  "transferencias/nueva": { source: require("../assets/help/transferencias/nueva.webp"), width: 780, height: 1688 },
  "transferencias/pendientes": { source: require("../assets/help/transferencias/pendientes.webp"), width: 780, height: 1688 },
  "transferencias/recibir": { source: require("../assets/help/transferencias/recibir.webp"), width: 780, height: 1688 },
  "transferencias/resumen": { source: require("../assets/help/transferencias/resumen.webp"), width: 780, height: 1688 },
} satisfies Record<string, HelpImage>;

export type HelpImageKey = keyof typeof helpImages;
