import type { PosKioskLink } from "@/hooks/usePosCart";
import { amountToCents } from "@/utils/money";
import type { KioskOrder, KioskOrderItem } from "@/utils/services/kioskOrders";

type Item = App.Entities.PosCatalogItem;

/** Clave del catálogo del POS: `p{product_id}` suelto, `k{package_id}` paquete. */
export const posCatalogKey = (productId: number, packageId: number | null | undefined) =>
  packageId ? `k${packageId}` : `p${productId}`;

/** "Agua de coco 1 L" o, si es paquete, "Agua de coco 1 L · Paquete 12". */
export function kioskItemName(line: KioskOrderItem): string {
  return line.package_id && line.option ? `${line.name} · ${line.option}` : line.name;
}

export interface KioskCartPlan {
  link: PosKioskLink;
  /** Renglones del carrito, con el ítem del catálogo del POS. */
  entries: { item: Item; quantity: number }[];
  /** Lo que ya no está en el catálogo del POS de esta sucursal: no se carga. */
  missing: string[];
  /** Renglones cuyo precio de hoy no es el que vio el cliente en el kiosko. */
  priceChanges: { name: string; from: number; to: number }[];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Arma el carrito de un pedido del kiosko con los ítems del catálogo del POS
 * (el precio es el de hoy: el servidor cobra el del catálogo). También calcula
 * lo que el pedido tiene apartado por producto, en unidades base (paquetes ×
 * contenido), para que el carrito lo cuente como disponible.
 */
export function planKioskCart(order: KioskOrder, catalog: Item[]): KioskCartPlan {
  const byKey = new Map(catalog.map((item) => [item.key, item]));
  const entries: KioskCartPlan["entries"] = [];
  const missing: string[] = [];
  const priceChanges: KioskCartPlan["priceChanges"] = [];
  const reserved: Record<string, number> = {};

  for (const line of order.items ?? []) {
    const quantity = Number(line.quantity) || 0;
    if (quantity <= 0) continue;
    const item = byKey.get(posCatalogKey(line.product_id, line.package_id));
    if (!item) {
      missing.push(kioskItemName(line));
      continue;
    }
    entries.push({ item, quantity });

    const base = line.package_id ? quantity * (Number(item.per_package) || 0) : quantity;
    if (base > 0) {
      const productId = String(line.product_id);
      reserved[productId] = round3((reserved[productId] ?? 0) + base);
    }

    const ordered = Number(line.unit_price);
    if (Number.isFinite(ordered) && amountToCents(ordered) !== amountToCents(item.price)) {
      priceChanges.push({ name: kioskItemName(line), from: ordered, to: item.price });
    }
  }

  return {
    link: {
      id: order.id,
      ticketNumber: order.ticket_number ?? null,
      customerName: order.customer_name?.trim() || null,
      reserved,
    },
    entries,
    missing,
    priceChanges,
  };
}
