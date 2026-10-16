import type { PosCustomer } from "@/components/Pos/CustomerPicker";
import {
  amountToCents,
  centsToAmount,
  lineTotalCents,
  roundMoney,
  roundQuantity,
  sumCents,
} from "@/utils/money";
import { newClientRequestId } from "@/utils/requestId";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = App.Entities.PosCatalogItem;

export type CheckoutMethod = "cash" | "card" | "mixed";

export interface PosLine {
  key: string;
  item: Item;
  quantity: number;
  unitPrice: number;
  discount: number;
}

/** Cambio del catálogo que afecta a un renglón del carrito. */
export type PosCatalogChange =
  | { kind: "price"; name: string; from: number; to: number }
  | { kind: "stock"; name: string; quantity: number; stock: number; unit: string }
  | { kind: "removed"; name: string };

/**
 * Pedido del kiosko que se cobra con este carrito (POS › Kiosko). Se guarda
 * con el carrito y viaja como kiosk_order_id en el cobro.
 */
export interface PosKioskLink {
  id: number;
  ticketNumber: number | null;
  customerName: string | null;
  /**
   * Lo que el pedido tiene apartado, en unidades base por producto
   * (product_id → cantidad). El catálogo del POS ya lo descuenta de la
   * existencia, pero al cobrar el servidor libera ese apartado antes de
   * revisarla: mientras el carrito está ligado cuenta como disponible (si no,
   * un pedido que apartó lo último no se podía cargar ni cambiar).
   */
  reserved: Record<string, number>;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Las piezas (unidad de tipo "quantity") y los paquetes se venden enteros;
 * peso, volumen y longitud admiten decimales (0.5 kg).
 */
export const allowsDecimalQuantity = (item: Item): boolean =>
  !item.package_id && !!item.unit?.type && item.unit.type !== "quantity";

/** Existencia para el carrito: la del catálogo más lo que aparta el pedido del kiosko ligado. */
export function availableStock(item: Item, link?: PosKioskLink | null): number {
  const reserved = link?.reserved[String(item.product_id)] ?? 0;
  if (!(reserved > 0)) return item.stock;
  if (!item.package_id) return round3(item.stock + reserved);
  // Paquetes completos: los que alcanzan con lo apartado se suman.
  const perPackage = Number(item.per_package) || 0;
  return perPackage > 0 ? item.stock + Math.floor(round3(reserved / perPackage)) : item.stock;
}

const stockMessage = (item: Item, available = item.stock) =>
  `Solo hay ${available} ${item.unit?.abbreviation ?? ""} de ${item.name}`.trim();

/** Importe del renglón en centavos (cantidad × precio − descuento), igual que el backend. */
export const lineCents = (line: Pick<PosLine, "quantity" | "unitPrice" | "discount">) =>
  lineTotalCents(line.quantity, line.unitPrice, line.discount);

/** El descuento no puede dejar el renglón en negativo. */
const clampDiscount = (quantity: number, unitPrice: number, discount: number) =>
  Math.min(Math.max(0, discount), centsToAmount(lineTotalCents(quantity, unitPrice)));

/* ───────────────────────── Carrito guardado en el equipo ───────────────────────── */

const STORAGE_PREFIX = "pos_cart:";
/** Carritos de otros usuarios que nadie volvió a abrir: se borran después de una semana. */
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** Llave del carrito guardado: uno por cajero, sucursal y turno. */
export const posCartStorageKey = (userId: number, locationId: number, sessionId: number) =>
  `${STORAGE_PREFIX}${userId}:${locationId}:${sessionId}`;

interface StoredCart {
  version: 1;
  lines: PosLine[];
  customer: PosCustomer | null;
  method: CheckoutMethod;
  requestId: string | null;
  requestUnknown: boolean;
  savedAt: number;
  /** Pedido del kiosko ligado (los carritos guardados antes no lo traen). */
  kioskOrder?: PosKioskLink | null;
}

const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function parseKioskLink(raw: any): PosKioskLink | null {
  if (!raw || typeof raw !== "object" || !isFiniteNumber(raw.id) || raw.id <= 0) return null;
  const reserved: Record<string, number> = {};
  if (raw.reserved && typeof raw.reserved === "object") {
    for (const [productId, quantity] of Object.entries(raw.reserved)) {
      if (isFiniteNumber(quantity) && quantity > 0) reserved[productId] = quantity;
    }
  }
  return {
    id: raw.id,
    ticketNumber: isFiniteNumber(raw.ticketNumber) ? raw.ticketNumber : null,
    customerName: typeof raw.customerName === "string" && raw.customerName ? raw.customerName : null,
    reserved,
  };
}

function isValidLine(line: any): line is PosLine {
  const item = line?.item;
  return (
    typeof line?.key === "string" &&
    item &&
    typeof item === "object" &&
    item.key === line.key &&
    isFiniteNumber(item.product_id) &&
    typeof item.name === "string" &&
    isFiniteNumber(item.price) &&
    isFiniteNumber(item.stock) &&
    isFiniteNumber(line.quantity) &&
    line.quantity > 0 &&
    isFiniteNumber(line.unitPrice) &&
    line.unitPrice >= 0 &&
    isFiniteNumber(line.discount) &&
    line.discount >= 0
  );
}

/** Lee lo guardado; cualquier cosa rara se descarta en lugar de romper el punto de venta. */
export function parseStoredCart(raw: string | null): StoredCart | null {
  if (!raw) return null;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.version !== 1 || !Array.isArray(data.lines)) return null;

  const requestId =
    typeof data.requestId === "string" && data.requestId.length > 0 && data.requestId.length <= 64
      ? data.requestId
      : null;
  const customer =
    data.customer && isFiniteNumber(data.customer.id) && typeof data.customer.name === "string"
      ? { id: data.customer.id, name: data.customer.name }
      : null;

  return {
    version: 1,
    lines: data.lines.filter(isValidLine),
    customer,
    method: ["cash", "card", "mixed"].includes(data.method) ? data.method : "cash",
    requestId,
    requestUnknown: !!requestId && data.requestUnknown === true,
    savedAt: isFiniteNumber(data.savedAt) ? data.savedAt : 0,
    kioskOrder: parseKioskLink(data.kioskOrder),
  };
}

/**
 * Borra los carritos guardados de turnos anteriores del mismo cajero (ya no
 * se pueden cobrar en ellos) y los de otros que llevan una semana sin usarse.
 */
async function pruneStoredCarts(keepKey: string) {
  const userPrefix = keepKey.slice(0, keepKey.indexOf(":", STORAGE_PREFIX.length) + 1);
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(STORAGE_PREFIX) && k !== keepKey);
  if (keys.length === 0) return;

  const now = Date.now();
  const entries = await AsyncStorage.multiGet(keys);
  const toRemove = entries
    .filter(([key, raw]) => key.startsWith(userPrefix) || now - (parseStoredCart(raw)?.savedAt ?? 0) > STALE_MS)
    .map(([key]) => key);
  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
}

/**
 * Renglones con el catálogo recién descargado (ver syncWithCatalog del
 * hook): `changed` indica si hay que reemplazar los renglones. `link`: el
 * pedido del kiosko ligado, cuyo apartado cuenta como existencia.
 */
export function syncLinesWithCatalog(
  lines: PosLine[],
  items: Item[],
  link?: PosKioskLink | null,
): { next: PosLine[]; changes: PosCatalogChange[]; changed: boolean } {
  const byKey = new Map(items.map((i) => [i.key, i]));
  const changes: PosCatalogChange[] = [];
  const next: PosLine[] = [];
  let changed = false;

  for (const line of lines) {
    const fresh = byKey.get(line.key);
    if (!fresh) {
      changes.push({ kind: "removed", name: line.item.name });
      changed = true;
      continue;
    }

    let unitPrice = line.unitPrice;
    const oldPrice = amountToCents(line.item.price);
    if (amountToCents(fresh.price) !== oldPrice && amountToCents(line.unitPrice) === oldPrice) {
      unitPrice = fresh.price;
      changes.push({ kind: "price", name: fresh.name, from: line.item.price, to: fresh.price });
    }
    const available = availableStock(fresh, link);
    if (line.quantity > available) {
      changes.push({
        kind: "stock",
        name: fresh.name,
        quantity: line.quantity,
        stock: available,
        unit: fresh.unit?.abbreviation ?? "",
      });
    }

    const discount = clampDiscount(line.quantity, unitPrice, line.discount);
    if (fresh !== line.item || unitPrice !== line.unitPrice || discount !== line.discount) changed = true;
    next.push({ ...line, item: fresh, unitPrice, discount });
  }

  return { next, changes, changed };
}

/* ─────────────────────────────────── Hook ─────────────────────────────────── */

/**
 * Carrito del punto de venta: renglones, renglón seleccionado (para los
 * atajos de teclado), cliente, método de pago, totales y armado del pago para
 * la API.
 *
 * Los totales se calculan en centavos enteros con el mismo algoritmo que el
 * backend (utils/money): antes se sumaban decimales y se redondeaba al final,
 * y cobros de producto a granel se rechazaban por un centavo.
 *
 * Con `storageKey` el carrito se guarda en el equipo (por cajero, sucursal y
 * turno) y se recupera al volver a entrar: un F5, un "Salir" o un cierre de la
 * app ya no obligan a escanear todo otra vez.
 *
 * Llave de cobro (client_request_id): se crea en el primer intento de cobro y
 * se conserva con el carrito (también guardada) hasta que la venta queda
 * registrada o se descarta el carrito. Reintentar con la misma llave nunca
 * cobra dos veces: si la venta ya existía, el servidor la devuelve.
 * `requestUnknown` indica que el último envío se quedó sin respuesta y hay
 * que verificar en qué quedó antes de cobrar otra vez.
 *
 * `carryFromKey`: carrito guardado de un turno que resultó cerrado a media
 * venta. Si este turno empieza vacío, ese carrito (con su llave de cobro) pasa
 * aquí en lugar de borrarse con los de turnos anteriores.
 *
 * `kioskOrder`: pedido del kiosko que se trajo al carrito (loadKioskOrder).
 * Se guarda con el carrito y se suelta al vaciarlo o con unlinkKioskOrder.
 */
export function usePosCart(storageKey?: string | null, carryFromKey?: string | null) {
  const [lines, setLinesState] = useState<PosLine[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customer, setCustomerState] = useState<PosCustomer | null>(null);
  const [method, setMethodState] = useState<CheckoutMethod>("cash");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestUnknown, setRequestUnknown] = useState(false);
  const [kioskOrder, setKioskOrderState] = useState<PosKioskLink | null>(null);
  // Llave cuyo carrito guardado ya se leyó. Sin almacenamiento no hay nada
  // que recuperar.
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const restored = !storageKey || restoredKey === storageKey;
  /** Renglones recuperados al entrar (0 si el carrito empezó vacío). */
  const [restoredLines, setRestoredLines] = useState(0);
  /** Lo recuperado venía del turno anterior (ver carryFromKey). */
  const [carriedOver, setCarriedOver] = useState(false);

  // Copia síncrona de los renglones: con un lector de códigos dos escaneos
  // pueden llegar antes de que React vuelva a renderizar y el segundo leía la
  // cantidad vieja (se perdía una pieza o se saltaba la validación de stock).
  const linesRef = useRef<PosLine[]>([]);
  // Copia síncrona del resto, para guardar en el momento de cobrar.
  const draftRef = useRef<{
    customer: PosCustomer | null;
    method: CheckoutMethod;
    requestId: string | null;
    requestUnknown: boolean;
    kioskOrder: PosKioskLink | null;
  }>({ customer: null, method: "cash", requestId: null, requestUnknown: false, kioskOrder: null });

  const setLines = useCallback((updater: (prev: PosLine[]) => PosLine[]) => {
    const next = updater(linesRef.current);
    linesRef.current = next;
    setLinesState(next);
    // Sin renglones el carrito ya no es el pedido del kiosko (los quitaron a
    // mano o los sacó el catálogo): si siguiera ligado, la siguiente venta,
    // de otro cliente, cerraría ese pedido como cobrado.
    if (next.length === 0 && draftRef.current.kioskOrder) {
      draftRef.current.kioskOrder = null;
      setKioskOrderState(null);
    }
  }, []);

  const setCustomer = useCallback((value: PosCustomer | null) => {
    draftRef.current.customer = value;
    setCustomerState(value);
  }, []);

  const setMethod = useCallback((value: CheckoutMethod) => {
    draftRef.current.method = value;
    setMethodState(value);
  }, []);

  const setRequest = useCallback((id: string | null, unknown: boolean) => {
    draftRef.current.requestId = id;
    draftRef.current.requestUnknown = !!id && unknown;
    setRequestId(id);
    setRequestUnknown(!!id && unknown);
  }, []);

  const setKioskOrder = useCallback((value: PosKioskLink | null) => {
    draftRef.current.kioskOrder = value;
    setKioskOrderState(value);
  }, []);

  /** Guarda (o borra, si no queda nada pendiente) el carrito en el equipo. */
  const writeStorage = useCallback(() => {
    if (!storageKey) return;
    const draft = draftRef.current;
    const current = linesRef.current;
    const write =
      current.length === 0 && !draft.requestId && !draft.kioskOrder
        ? AsyncStorage.removeItem(storageKey)
        : AsyncStorage.setItem(
            storageKey,
            JSON.stringify({ version: 1, lines: current, ...draft, savedAt: Date.now() } satisfies StoredCart),
          );
    // Sin almacenamiento (modo privado, cuota llena) el carrito sigue en memoria.
    write.catch(() => undefined);
  }, [storageKey]);

  // Recuperar lo guardado al entrar.
  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    (async () => {
      let stored: StoredCart | null = null;
      try {
        stored = parseStoredCart(await AsyncStorage.getItem(storageKey));
      } catch {
        stored = null;
      }
      // El turno anterior se cerró a media venta y este empieza vacío: su
      // carrito pasa aquí con la misma llave de cobro (si ese cobro llegara a
      // registrarse, el reintento devuelve la venta en lugar de duplicarla; con
      // un envío sin respuesta, primero se verifica).
      let carried = false;
      if ((!stored || stored.lines.length === 0) && carryFromKey && carryFromKey !== storageKey) {
        try {
          const previous = parseStoredCart(await AsyncStorage.getItem(carryFromKey));
          if (previous && previous.lines.length > 0) {
            stored = previous;
            carried = true;
          }
        } catch {
          // Sin almacenamiento no hay carrito que pasar.
        }
      }
      if (cancelled) return;

      // Lo escaneado mientras se leía el almacenamiento se respeta, salvo que
      // haya un cobro sin confirmar: ese manda, para verificarlo.
      const adopt = !!stored && (linesRef.current.length === 0 || stored.requestUnknown);
      if (stored && adopt) {
        linesRef.current = stored.lines;
        setLinesState(stored.lines);
        setSelectedKey(stored.lines[stored.lines.length - 1]?.key ?? null);
        setCustomer(stored.customer);
        setMethod(stored.method);
        setRequest(stored.requestId, stored.requestUnknown);
        setKioskOrder(stored.kioskOrder ?? null);
        setRestoredLines(stored.lines.length);
        setCarriedOver(carried);
      }
      setRestoredKey(storageKey);
      // Un carrito que pasó de turno se guarda con la llave nueva antes de
      // borrar los de turnos anteriores; si no se adoptó, se deja como está.
      if (carried && !adopt) return;
      const saveCarried =
        carried && stored
          ? AsyncStorage.setItem(storageKey, JSON.stringify({ ...stored, savedAt: Date.now() } satisfies StoredCart))
          : Promise.resolve();
      saveCarried.then(() => pruneStoredCarts(storageKey)).catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, carryFromKey, setCustomer, setMethod, setRequest, setKioskOrder]);

  // Guardar cada cambio (después de recuperar, para no pisar lo guardado).
  useEffect(() => {
    if (restored) writeStorage();
  }, [restored, lines, customer, method, requestId, requestUnknown, kioskOrder, writeStorage]);

  /** Agrega o suma. Devuelve un mensaje si la existencia no alcanza. */
  const add = useCallback(
    (item: Item, quantity = 1): string | null => {
      const current =
        linesRef.current.find((l) => l.key === item.key)?.quantity ?? 0;
      const next = round3(current + quantity);
      const available = availableStock(item, draftRef.current.kioskOrder);
      if (next > available) {
        return stockMessage(item, available);
      }
      setLines((prev) =>
        prev.some((l) => l.key === item.key)
          ? prev.map((l) =>
              l.key === item.key
                ? { ...l, quantity: next, discount: clampDiscount(next, l.unitPrice, l.discount) }
                : l,
            )
          : [...prev, { key: item.key, item, quantity: next, unitPrice: item.price, discount: 0 }],
      );
      setSelectedKey(item.key);
      return null;
    },
    [setLines],
  );

  /**
   * Cambia la cantidad de un renglón (0 o menos lo quita). Devuelve un
   * mensaje si la cantidad no es válida o la existencia no alcanza.
   */
  const setQuantity = useCallback(
    (key: string, quantity: number): string | null => {
      const line = linesRef.current.find((l) => l.key === key);
      if (!line) return null;
      if (!Number.isFinite(quantity)) {
        return "Cantidad inválida";
      }
      if (quantity <= 0) {
        setLines((prev) => prev.filter((l) => l.key !== key));
        return null;
      }
      if (!allowsDecimalQuantity(line.item) && !Number.isInteger(quantity)) {
        return `${line.item.name} se vende por pieza: usa una cantidad entera.`;
      }
      const next = round3(quantity);
      const available = availableStock(line.item, draftRef.current.kioskOrder);
      if (next > available) {
        return stockMessage(line.item, available);
      }
      // Con menos cantidad, un descuento fijo podía dejar el renglón en
      // negativo y el cobro no cuadraba con el del servidor.
      setLines((prev) =>
        prev.map((l) =>
          l.key === key ? { ...l, quantity: next, discount: clampDiscount(next, l.unitPrice, l.discount) } : l,
        ),
      );
      return null;
    },
    [setLines],
  );

  const remove = useCallback((key: string) => {
    const index = linesRef.current.findIndex((l) => l.key === key);
    setLines((prev) => prev.filter((l) => l.key !== key));
    // La selección pasa al renglón vecino para seguir borrando con Supr.
    const next = linesRef.current;
    setSelectedKey(next[Math.min(index, next.length - 1)]?.key ?? null);
  }, [setLines]);

  const updatePrice = useCallback(
    (key: string, changes: { unitPrice?: number; discount?: number }) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.key !== key) return l;
          const unitPrice = Math.max(0, roundMoney(changes.unitPrice ?? l.unitPrice));
          const discount = clampDiscount(l.quantity, unitPrice, roundMoney(changes.discount ?? l.discount));
          return { ...l, unitPrice, discount };
        }),
      );
    },
    [setLines],
  );

  /** Vacía el carrito: renglones, cliente, método, la llave de cobro y el pedido del kiosko ligado. */
  const clear = useCallback(() => {
    setLines(() => []);
    setSelectedKey(null);
    setCustomer(null);
    setMethod("cash");
    setRequest(null, false);
    setKioskOrder(null);
  }, [setLines, setCustomer, setMethod, setRequest, setKioskOrder]);

  /**
   * Trae un pedido del kiosko: el carrito se reemplaza con sus renglones (al
   * precio de hoy del catálogo) y queda ligado al pedido. Empieza como un
   * carrito nuevo: Público en general, en efectivo y sin llave de cobro.
   * Quien llama ya preguntó si reemplazar lo que había.
   */
  const loadKioskOrder = useCallback(
    (link: PosKioskLink, entries: { item: Item; quantity: number }[]) => {
      const byKey = new Map<string, PosLine>();
      for (const { item, quantity } of entries) {
        const total = round3((byKey.get(item.key)?.quantity ?? 0) + quantity);
        byKey.set(item.key, { key: item.key, item, quantity: total, unitPrice: item.price, discount: 0 });
      }
      const next = [...byKey.values()];
      setCustomer(null);
      setMethod("cash");
      setRequest(null, false);
      setKioskOrder(link);
      setLines(() => next);
      setSelectedKey(next[next.length - 1]?.key ?? null);
    },
    [setLines, setCustomer, setMethod, setRequest, setKioskOrder],
  );

  /** Suelta el pedido del kiosko: los renglones se quedan y se cobran como venta normal. */
  const unlinkKioskOrder = useCallback(() => setKioskOrder(null), [setKioskOrder]);

  /** Pedido del kiosko ligado, leído al momento (no el del último render). */
  const getKioskOrder = useCallback(() => draftRef.current.kioskOrder, []);

  /**
   * Antes de mandar el cobro: devuelve la llave del carrito (la crea en el
   * primer intento) y lo deja marcado como "sin confirmar" ya guardado, por
   * si la app se cierra antes de que llegue la respuesta.
   */
  const beginAttempt = useCallback((): string => {
    const id = draftRef.current.requestId ?? newClientRequestId();
    setRequest(id, true);
    writeStorage();
    return id;
  }, [setRequest, writeStorage]);

  /**
   * El servidor respondió que no registró la venta (la rechazó o la búsqueda
   * no la encontró): se puede corregir el carrito y cobrar de nuevo. La llave
   * se conserva: si el primer envío llegara a registrarse tarde, el
   * reintento devolvería esa venta en lugar de crear otra.
   */
  const markNotCharged = useCallback(() => {
    if (!draftRef.current.requestId) return;
    setRequest(draftRef.current.requestId, false);
    // Guardado ya: si la pantalla se desmonta enseguida (turno cerrado), lo
    // guardado no debe seguir marcado como "sin confirmar".
    writeStorage();
  }, [setRequest, writeStorage]);

  /**
   * El servidor rechazó la llave porque ya se usó en otra operación
   * (client_request_conflict): no se registró nada y el siguiente intento
   * lleva una llave nueva (con la misma se rechazaría otra vez).
   */
  const renewRequestId = useCallback(() => {
    setRequest(null, false);
    writeStorage();
  }, [setRequest, writeStorage]);

  /** Llave actual, leída al momento (no la del último render). */
  const getRequestId = useCallback(() => draftRef.current.requestId, []);

  /**
   * Aplica el catálogo recién descargado: precio y existencia al día en cada
   * renglón. El precio de un renglón que nadie editó se actualiza (si no, se
   * mandaría como precio cambiado y el servidor lo rechaza o cobra el viejo);
   * uno editado a mano se respeta. Los que ya no están a la venta se quitan.
   * Devuelve qué cambió para avisarle al cajero.
   *
   * No toca un carrito con un cobro sin confirmar: lo que se mandó tiene que
   * seguir igual hasta saber si se registró.
   */
  const syncWithCatalog = useCallback(
    (items: Item[]): PosCatalogChange[] => {
      if (items.length === 0 || linesRef.current.length === 0 || draftRef.current.requestUnknown) {
        return [];
      }
      const { next, changes, changed } = syncLinesWithCatalog(linesRef.current, items, draftRef.current.kioskOrder);

      if (changed) {
        setLines(() => next);
        setSelectedKey((key) => (next.some((l) => l.key === key) ? key : next[next.length - 1]?.key ?? null));
      }
      return changes;
    },
    [setLines],
  );

  const totals = useMemo(() => {
    const subtotalCents = sumCents(lines.map((l) => lineTotalCents(l.quantity, l.unitPrice)));
    const discountCents = sumCents(lines.map((l) => amountToCents(l.discount)));
    const totalCents = subtotalCents - discountCents;
    return {
      subtotal: centsToAmount(subtotalCents),
      discount: centsToAmount(discountCents),
      total: centsToAmount(totalCents),
      totalCents,
      items: round3(lines.reduce((s, l) => s + l.quantity, 0)),
    };
  }, [lines]);

  /**
   * Renglones para la API, con cantidad y precio ya redondeados como los
   * redondea el servidor. El precio solo viaja si se cambió: un cajero sin
   * permiso nunca manda precios (y el backend rechaza si lo hiciera).
   */
  const toDetails = useCallback(
    (): App.Entities.PosSalePayload["details"] =>
      linesRef.current.map((l) => ({
        product_id: l.item.product_id,
        package_id: l.item.package_id,
        quantity: roundQuantity(l.quantity),
        ...(amountToCents(l.unitPrice) !== amountToCents(l.item.price) ? { unit_price: roundMoney(l.unitPrice) } : {}),
        ...(amountToCents(l.discount) > 0 ? { discount: roundMoney(l.discount) } : {}),
      })),
    [],
  );

  return {
    lines,
    selectedKey,
    setSelectedKey,
    selected: lines.find((l) => l.key === selectedKey) ?? null,
    add,
    setQuantity,
    remove,
    updatePrice,
    clear,
    totals,
    toDetails,
    customer,
    setCustomer,
    method,
    setMethod,
    requestId,
    requestUnknown,
    getRequestId,
    beginAttempt,
    markNotCharged,
    renewRequestId,
    syncWithCatalog,
    restored,
    restoredLines,
    carriedOver,
    kioskOrder,
    getKioskOrder,
    loadKioskOrder,
    unlinkKioskOrder,
  };
}

export const formatMoney = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
