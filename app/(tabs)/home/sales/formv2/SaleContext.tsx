import { formatQuantity, parseQuantity } from "@/utils/format";
import { AppFormRef } from "@/components/Form/AppForm/AppForm";
import {
  apiErrorCode,
  isOutcomeUnknown,
  SALE_ERROR_CODES,
} from "@/components/Pos/saleErrors";
import {
  ProductCategory,
  ProductListItem,
} from "@/components/Views/POSV3/components";
import { Unit } from "@/components/Views/POSV3/components/ListProducts";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { centsToAmount, lineTotalCents, roundQuantity, sumCents } from "@/utils/money";
import { newClientRequestId } from "@/utils/requestId";
import {
  NormalizedSaleLine,
  normalizedLineCents,
  normalizeSaleLine,
  unitDisplayPrice,
  unitRatio,
} from "@/utils/saleUnits";
import services from "@/utils/services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type unitType = "mass" | "volume" | "quantity";
type GroupedUnits = Record<unitType, Unit[]>;

interface SelectedProduct {
  id: string | number;
  product_id: number;
  /** Cantidad en la unidad elegida (la que ve el usuario). */
  quantity: number;
  /** Unidad elegida; la del producto para un paquete. */
  unit_id: number;
  /**
   * Precio de catálogo por unidad del producto (o el del paquete). El precio
   * por la unidad elegida solo se muestra (unitDisplayPrice).
   */
  price: number;
  /** Unidad del producto: el renglón se manda y se cobra en ella. */
  product_unit_id: number;
  /** Unidades del producto en una de la elegida (gramo de uno por kilo: 0.001); 1 en un paquete. */
  ratio: number;
  package_id?: number;
  detail_id?: number; // ID del detalle en el backend
}

type SelectedProducts = Record<number | string, SelectedProduct>;

/**
 * Renglón de la lista. El del producto base de uno con for_sale = false se
 * guarda (de él salen la existencia y la unidad de sus paquetes) pero no se
 * ofrece: esa pieza no se vende suelta, solo sus paquetes.
 */
type SaleListItem = ProductListItem & { for_sale?: boolean };

/**
 * Resultado de confirmar la venta:
 * - charged: quedó registrada (`sale` es la respuesta del servidor; con
 *   `recovered` se encontró por su llave después de perder la respuesta;
 *   `payment`, el pago que se mandó).
 * - rejected: el servidor la rechazó y no registró nada.
 * - not_charged: no llegó respuesta y la búsqueda confirmó que no se registró.
 * - unknown: no llegó respuesta y no se pudo confirmar en qué quedó.
 */
export type SaleAttempt =
  | { status: "charged"; sale: any; recovered?: boolean; payment: PendingPayment }
  | { status: "rejected"; error: unknown }
  | { status: "not_charged" }
  | { status: "unknown"; error: unknown };

interface SaleContextType {
  // Data
  products: ProductListItem[];
  units: Unit[];
  categories: ProductCategory[];
  groupedUnits: GroupedUnits;
  loading: boolean;
  selectedProducts: SelectedProducts;
  cartItems: any[]; // CartItemData[]
  /** Total del carrito en centavos, calculado como lo calcula el servidor. */
  totalCents: number;
  currentSaleId: number | null;
  customerId: number | null;
  /** Hay una venta en envío: no se debe salir de la pantalla. */
  submitting: boolean;
  /** La última venta se quedó sin respuesta: no se sabe si se registró. */
  pendingUnknown: boolean;
  /**
   * Cobro en duda recuperado del equipo al volver a la pantalla, con el pago
   * que llevaba: la pantalla lo vuelve a mostrar (bloqueado) para reintentar
   * con la misma llave.
   */
  restoredPending: PendingPayment | null;

  // Actions
  loadData: () => Promise<void>;
  handleAddProduct: (product: ProductListItem, unitId: number) => void;
  handleRemoveProduct: (productId: number | string) => void;
  handleItemChange: (
    productId: number | string,
    action: "increment" | "decrement" | "unit" | "set",
    data?: any,
  ) => void;
  clearCart: () => Promise<void>;
  setCustomer: (customerId: number | null) => void;
  confirmSale: (data?: {
    payment_method?: string;
    paid_amount?: number;
    notes?: string;
  }) => Promise<SaleAttempt | undefined>;
}

/** Espera antes de buscar una venta cuya respuesta se perdió: pudo seguir en proceso. */
const VERIFY_DELAY_MS = 1500;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Precio de un paquete como lo cobra el servidor: el suyo si tiene, si no el
 * del producto por su contenido. Antes un paquete sin precio propio entraba
 * al carrito en $0.00.
 */
const packagePrice = (pkg: { sale_price?: string | number | null; quantity_per_package?: string | number }, unitPrice: number) => {
  const own = Number(pkg.sale_price ?? 0);
  // Contenido × precio en centavos enteros, como el servidor (catalogPrice).
  return own > 0 ? own : centsToAmount(lineTotalCents(Number(pkg.quantity_per_package ?? 0), unitPrice));
};

/** Pago de un cobro en duda: el reintento lleva el mismo. */
export interface PendingPayment {
  payment_method: string;
  paid_amount?: number;
}

/**
 * Unidades del producto en una de `unitId`, con las unidades de su tipo que
 * trae el renglón base de la lista (1 si es la del producto; NaN si no se
 * puede convertir).
 */
function ratioFor(baseProduct: SaleListItem | undefined, unitId: number): number {
  if (!baseProduct) return NaN;
  if (unitId === baseProduct.unit_id) return 1;
  const units = baseProduct.available_units ?? [];
  return unitRatio(
    units.find((u) => u.id === unitId),
    units.find((u) => u.id === baseProduct.unit_id),
  );
}

/** El renglón como se manda y se cobra: en la unidad del producto. */
const lineOf = (item: SelectedProduct): NormalizedSaleLine =>
  normalizeSaleLine(item.quantity, item.ratio, item.price, item.product_unit_id);

/** Menos de una milésima de la unidad del producto (0.4 g de uno por kilo) no se registra. */
const belowMinimum = (quantity: number, ratio: number) => !(roundQuantity(quantity * ratio) > 0);

/* ─────────────── Cobro en duda guardado en el equipo ─────────────── */

// Si no se sabe en qué quedó un cobro, el carrito, su llave y su pago se
// guardan en el equipo: al salir de la pantalla y volver (o cerrar la app) el
// reintento usa la misma llave y no se cobra dos veces. Uno por usuario,
// empresa y sucursal (la llave de otra sucursal se rechazaría).
const PENDING_PREFIX = "sale_form_pending:";
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PAYMENT_METHODS = ["cash", "card", "transfer", "credit"];

interface StoredPending {
  version: 1;
  requestId: string;
  items: SelectedProducts;
  payment: PendingPayment;
  savedAt: number;
}

const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function isValidItem(item: any): item is SelectedProduct {
  return (
    !!item &&
    (typeof item.id === "string" || isFiniteNumber(item.id)) &&
    isFiniteNumber(item.product_id) &&
    isFiniteNumber(item.unit_id) &&
    isFiniteNumber(item.product_unit_id) &&
    isFiniteNumber(item.quantity) &&
    item.quantity > 0 &&
    isFiniteNumber(item.price) &&
    item.price >= 0 &&
    isFiniteNumber(item.ratio) &&
    item.ratio > 0 &&
    (item.package_id === undefined || item.package_id === null || isFiniteNumber(item.package_id))
  );
}

/** Lee lo guardado; algo incompleto, raro o de hace más de una semana se descarta. */
function parseStoredPending(raw: string | null): StoredPending | null {
  if (!raw) return null;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !data ||
    data.version !== 1 ||
    typeof data.requestId !== "string" ||
    data.requestId.length === 0 ||
    data.requestId.length > 64 ||
    !isFiniteNumber(data.savedAt) ||
    Date.now() - data.savedAt > PENDING_MAX_AGE_MS ||
    !data.items ||
    typeof data.items !== "object"
  ) {
    return null;
  }
  const items = Object.values(data.items);
  // El reintento tiene que llevar exactamente el mismo carrito.
  if (items.length === 0 || !items.every(isValidItem)) return null;

  const paid = data.payment?.paid_amount;
  return {
    version: 1,
    requestId: data.requestId,
    items: data.items as SelectedProducts,
    payment: {
      payment_method: PAYMENT_METHODS.includes(data.payment?.payment_method)
        ? data.payment.payment_method
        : "cash",
      paid_amount: isFiniteNumber(paid) && paid >= 0 ? paid : undefined,
    },
    savedAt: data.savedAt,
  };
}

const SaleContext = createContext<SaleContextType | undefined>(undefined);

interface SaleProviderProps {
  children: React.ReactNode;
}

export function SaleProvider({ children }: SaleProviderProps) {
  const [products, setProducts] = useState<SaleListItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [groupedUnits, setGroupedUnits] = useState<GroupedUnits>(
    {} as GroupedUnits,
  );
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>(
    {},
  );

  const formRef = useRef<AppFormRef<object>>(null);

  const [currentSaleId, setCurrentSaleId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const alerts = useAlerts();
  const { hasPermission, user, selectedCompany, location } = useAuth();
  const { submitting, run } = useSubmitGuard();
  // Llave de cobro (client_request_id) del carrito: la misma en cada
  // reintento hasta que la venta queda registrada o se vacía el carrito. Si
  // el primer envío sí se registró, el servidor devuelve esa venta en lugar
  // de cobrarla dos veces.
  const requestIdRef = useRef<string | null>(null);
  const [pendingUnknown, setPendingUnknown] = useState(false);
  // Mientras un cobro siga en duda (o en envío) el carrito no se cambia: el
  // reintento con la misma llave debe llevar lo mismo, porque si el primero
  // sí se registró el servidor devuelve esa venta y lo agregado después se
  // iría sin cobrar. Ref: las tarjetas de producto pueden llamar a un
  // handler de un render anterior.
  const pendingUnknownRef = useRef(false);
  useEffect(() => {
    pendingUnknownRef.current = pendingUnknown;
  }, [pendingUnknown]);
  // Pago del cobro en duda: el reintento lleva el mismo (la pantalla lo bloquea).
  const pendingPaymentRef = useRef<PendingPayment | null>(null);
  const [restoredPending, setRestoredPending] = useState<PendingPayment | null>(null);

  const storageKey = user?.id
    ? `${PENDING_PREFIX}${user.id}:${selectedCompany?.id ?? "none"}:${location?.id ?? "none"}`
    : null;

  /** Guarda el cobro en duda en el equipo (sin almacenamiento sigue en memoria). */
  const savePending = (pending: Omit<StoredPending, "version" | "savedAt">) => {
    if (!storageKey) return;
    AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ version: 1, ...pending, savedAt: Date.now() } satisfies StoredPending),
    ).catch(() => undefined);
  };

  const clearPending = () => {
    if (!storageKey) return;
    AsyncStorage.removeItem(storageKey).catch(() => undefined);
  };

  // Al entrar: si quedó un cobro en duda, vuelve el carrito con su llave y su
  // pago, bloqueado hasta reintentarlo (o vaciarlo).
  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(storageKey);
      } catch {
        return;
      }
      if (cancelled || !raw) return;
      const stored = parseStoredPending(raw);
      if (!stored) {
        AsyncStorage.removeItem(storageKey).catch(() => undefined);
        return;
      }
      requestIdRef.current = stored.requestId;
      pendingPaymentRef.current = stored.payment;
      pendingUnknownRef.current = true;
      setSelectedProducts(stored.items);
      setPendingUnknown(true);
      setRestoredPending(stored.payment);
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  /** true (y avisa) si el carrito está bloqueado por un cobro sin confirmar. */
  const cartLocked = () => {
    if (!pendingUnknownRef.current) return false;
    alerts.warning(
      submitting
        ? "Espera a que termine de registrarse la venta."
        : "No se pudo confirmar si la última venta quedó registrada: vuelve a confirmarla antes de cambiar el carrito, o vacíalo para empezar otra.",
    );
    return true;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Cargar datos iniciales desde el endpoint
      const response = await services.sales.getInitialData();

      if (response && "data" in response && response.data) {
        const {
          products: productsData,
          units: unitsData,
          categories: categoriesData,
        } = response.data;

        // Procesar categorías
        if (categoriesData) {
          const categories: ProductCategory[] = categoriesData.map(
            (cat: any) => ({
              id: cat.id,
              name: cat.name,
            }),
          );
          setCategories(categories);
        }

        // Procesar unidades
        if (unitsData) {
          setGroupedUnits(unitsData as GroupedUnits);
          const allUnits = Object.values(unitsData).flat();
          setUnits(allUnits as Unit[]);
        }

        // Procesar productos
        if (productsData) {
          const products = productsData as App.Entities.Product[];
          const expandedProducts: SaleListItem[] = [];

          products.forEach((product: App.Entities.Product) => {
            // Obtener unidades disponibles para este producto
            const availableUnits = product.unit?.unit_type
              ? unitsData[product.unit.unit_type as unitType] || []
              : [];

            // Agregar el producto base
            expandedProducts.push({
              price: parseFloat(product.sale_price || "0").toFixed(2),
              unit_id: product.unit_id || 0,
              unit_type: product.unit?.unit_type || null,
              code: product.code || "",
              id: `product_${product.id}`,
              name: product.name,
              current_stock:
                product.locations && product.locations[0]
                  ? product.locations[0].pivot?.current_stock ?? undefined
                  : undefined,
              category_id: product.category_id || undefined,
              main_image: product.main_image,
              available_units: availableUnits,
              is_package: false,
              for_sale: product.for_sale !== false,
            });

            // Agregar cada paquete como un producto separado
            product.active_packages?.forEach((pkg) => {
              const currentStock =
                product.locations && product.locations[0]
                  ? product.locations[0].pivot?.current_stock
                  : 0;

              expandedProducts.push({
                price: packagePrice(pkg, parseFloat(product.sale_price || "0")).toFixed(2),
                unit_id: product.unit?.id || 0,
                unit_type: product.unit?.unit_type || null,
                code: pkg.barcode,
                id: `package_${pkg.id}`,
                name: `${product.name} - ${pkg.package_name}`,
                current_stock: currentStock
                  ? Math.floor(currentStock / pkg.quantity_per_package)
                  : 0,
                category_id: product.category_id || undefined,
                main_image: product.main_image,
                package_id: pkg.id,
                base_product_id: product.id,
                quantity_per_package: pkg.quantity_per_package,
                is_package: true,
                available_units: [],
              });
            });
          });

          setProducts(expandedProducts);
        }
      }
    } catch (error) {
      console.error("Error loading sale data:", error);
      alerts.error("Error al cargar datos de venta");
    } finally {
      setLoading(false);
    }
  }, [alerts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stock usado de un producto base (en la unidad del producto)
  const calculateUsedStock = (baseProductId: number) => {
    let totalUsed = 0;

    Object.entries(selectedProducts).forEach(([key, item]) => {
      if (item.product_id === baseProductId) {
        // Si es un paquete, multiplicar por quantity_per_package
        const productData = products.find((p) => p.id === key);
        if (productData?.is_package && productData.quantity_per_package) {
          const qtyPerPkg = Number(productData.quantity_per_package);
          totalUsed += item.quantity * qtyPerPkg;
        } else {
          // En la unidad del producto, la de su existencia.
          totalUsed += item.quantity * item.ratio;
        }
      }
    });

    return totalUsed;
  };

  const handleAddProduct = (product: SaleListItem, unitId: number) => {
    if (cartLocked()) return;
    if (!product.is_package && product.for_sale === false) {
      alerts.error(`${product.name} solo se vende por paquete.`);
      return;
    }
    const productId = product.id;
    const basePrice = parseFloat(product.price.toString());

    // Determinar el product_id correcto
    const numericProductId = product.is_package
      ? product.base_product_id!
      : parseInt(productId.toString().replace("product_", ""));

    // Si el producto ya está en el carrito, se suma uno (con su unidad y su
    // validación de stock).
    if (selectedProducts[productId]) {
      handleItemChange(productId, "increment");
      return;
    }

    // Obtener el stock actual del producto base
    const baseProduct = products.find(
      (p) => p.id === `product_${numericProductId}`,
    );
    const availableStock = Number(baseProduct?.current_stock || 0);
    const productUnit = baseProduct?.available_units?.find(
      (u) => u.id === baseProduct.unit_id,
    );

    // Un paquete se vende en la unidad del producto; lo demás en la elegida
    // (por omisión, la del producto).
    const productUnitId = baseProduct?.unit_id || product.unit_id || 0;
    const finalUnitId = product.is_package ? productUnitId : unitId || productUnitId;
    const ratio = product.is_package ? 1 : ratioFor(baseProduct, finalUnitId);

    if (!(ratio > 0)) {
      alerts.error(`No se puede vender ${product.name} en esa unidad.`);
      return;
    }
    if (belowMinimum(1, ratio)) {
      alerts.error(
        `La cantidad es menor que la mínima que se registra de ${product.name} (0.001 ${productUnit?.abbreviation || "de su unidad"}).`,
      );
      return;
    }

    // Calcular cuánto stock ya está siendo usado en el carrito
    const usedStock = calculateUsedStock(numericProductId);

    // Stock que requiere (en la unidad del producto)
    const requiredStock =
      product.is_package && product.quantity_per_package
        ? Number(product.quantity_per_package)
        : ratio;

    // Validar que hay stock suficiente (usedStock ya incluye lo que está en el carrito)
    if (usedStock + requiredStock > availableStock) {
      const remaining = availableStock - usedStock;
      const abbr = productUnit?.abbreviation || "";
      alerts.error(
        `Stock insuficiente. Disponible: ${formatQuantity(availableStock)} ${abbr}, En carrito: ${formatQuantity(usedStock)} ${abbr}, Restante: ${formatQuantity(remaining)} ${abbr}, Requiere: ${formatQuantity(requiredStock)} ${abbr}`,
      );
      return;
    }

    const newProduct: SelectedProduct = {
      id: productId,
      product_id: numericProductId,
      package_id: product.package_id,
      quantity: 1,
      unit_id: finalUnitId,
      price: basePrice,
      product_unit_id: productUnitId,
      ratio,
      detail_id: undefined,
    };

    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: newProduct,
    }));

    alerts.success("Producto agregado al carrito");
  };

  const handleRemoveProduct = (productId: number | string) => {
    if (cartLocked()) return;
    setSelectedProducts((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });

    alerts.success("Producto eliminado del carrito");
  };

  const handleItemChange = (
    productId: number | string,
    action: "increment" | "decrement" | "unit" | "set",
    data?: any,
  ) => {
    if (cartLocked()) return;
    setSelectedProducts((prev) => {
      const product = prev[productId];
      if (!product) {
        return prev;
      }

      const updated = { ...prev };

      if (action === "increment") {
        // Validar stock antes de incrementar
        const productData = products.find((p) => p.id === productId);
        const baseProduct = products.find(
          (p) => p.id === `product_${product.product_id}`,
        );
        const availableStock = Number(baseProduct?.current_stock || 0);
        const usedStock = calculateUsedStock(product.product_id);

        // En la unidad del producto
        const requiredStock =
          productData?.is_package && productData.quantity_per_package
            ? Number(productData.quantity_per_package)
            : product.ratio;

        if (usedStock + requiredStock > availableStock) {
          const productBaseUnitId = baseProduct?.unit_id;
          const productBaseUnit = productData?.available_units?.find(
            (u) => u.id === productBaseUnitId,
          );
          const remaining = availableStock - usedStock;
          alerts.error(
            `Stock insuficiente. Disponible: ${formatQuantity(availableStock)} ${productBaseUnit?.abbreviation || ""}, En uso: ${formatQuantity(usedStock)} ${productBaseUnit?.abbreviation || ""}, Restante: ${formatQuantity(remaining)} ${productBaseUnit?.abbreviation || ""}, Requiere: ${formatQuantity(requiredStock)} ${productBaseUnit?.abbreviation || ""}`,
          );
          return prev;
        }

        updated[productId] = {
          ...product,
          quantity: product.quantity + 1,
        };
      } else if (action === "decrement") {
        if (product.quantity > 1 && belowMinimum(product.quantity - 1, product.ratio)) {
          alerts.error("La cantidad es menor que la mínima que se registra (0.001 de la unidad del producto).");
          return prev;
        } else if (product.quantity > 1) {
          updated[productId] = {
            ...product,
            quantity: product.quantity - 1,
          };
        } else {
          delete updated[productId];
          alerts.success("Producto eliminado del carrito");
        }
      } else if (action === "set") {
        // Cantidad escrita a mano en el carrito. Antes esta acción no se
        // manejaba y lo que el usuario tecleaba se ignoraba: solo +/-
        // cambiaban la cantidad.
        // El carrito ya decide si la unidad admite decimales (kg, L).
        // "1,500" se descarta: igual puede ser 1.5 kg que 1500 piezas.
        const qty =
          typeof data === "number" ? data : parseQuantity(String(data)) ?? NaN;
        if (!Number.isFinite(qty) || qty <= 0) {
          return prev;
        }

        const productData = products.find((p) => p.id === productId);
        const baseProduct = products.find(
          (p) => p.id === `product_${product.product_id}`,
        );
        const availableStock = Number(baseProduct?.current_stock || 0);

        if (belowMinimum(qty, product.ratio)) {
          alerts.error("La cantidad es menor que la mínima que se registra (0.001 de la unidad del producto).");
          return prev;
        }

        // Stock (en la unidad del producto) que consume una unidad de este renglón.
        const perUnit =
          productData?.is_package && productData.quantity_per_package
            ? Number(productData.quantity_per_package)
            : product.ratio;

        const usedByOthers =
          calculateUsedStock(product.product_id) - product.quantity * perUnit;

        if (usedByOthers + qty * perUnit > availableStock) {
          const maxQty = Math.max(
            0,
            Math.floor((availableStock - usedByOthers) / perUnit),
          );
          alerts.error(
            `Stock insuficiente. Máximo disponible para este producto: ${maxQty}`,
          );
          return prev;
        }

        updated[productId] = {
          ...product,
          quantity: qty,
        };
      } else if (action === "unit" && data) {
        const unitId =
          typeof data === "object" && data !== null
            ? Number(data.unit_id ?? data.id)
            : Number(data);

        if (!unitId) {
          return prev;
        }

        // Validar que con la nueva unidad no se exceda el stock
        const productData = products.find((p) => p.id === productId);
        if (productData?.is_package) {
          return prev;
        }
        const baseProduct = products.find(
          (p) => p.id === `product_${product.product_id}`,
        );
        const availableStock = Number(baseProduct?.current_stock || 0);

        // Obtener la nueva unidad
        const newUnit = productData?.available_units?.find(
          (u) => u.id === unitId,
        );

        // Unidades del producto en una de la nueva unidad
        const ratio = ratioFor(baseProduct, unitId);
        if (!(ratio > 0)) {
          alerts.error("No se puede vender este producto en esa unidad.");
          return prev;
        }
        if (belowMinimum(product.quantity, ratio)) {
          alerts.error(
            `La cantidad es menor que la mínima que se registra: aumenta la cantidad antes de cambiar a ${newUnit?.abbreviation || "esa unidad"}.`,
          );
          return prev;
        }

        // Stock (en la unidad del producto) con la nueva unidad y el que
        // usan los demás renglones del mismo producto
        const requiredStock = product.quantity * ratio;
        const usedStockByOthers =
          calculateUsedStock(product.product_id) - product.quantity * product.ratio;

        // Validar que no se exceda el stock
        if (usedStockByOthers + requiredStock > availableStock) {
          const maxQuantityInNewUnit = Math.floor(
            (availableStock - usedStockByOthers) / ratio,
          );
          alerts.error(
            `Stock insuficiente para esta unidad. Máximo disponible: ${maxQuantityInNewUnit} ${newUnit?.abbreviation || "unidades"}`,
          );
          return prev;
        }

        // El precio sigue siendo el del producto por su unidad: el de la
        // unidad elegida solo se muestra.
        updated[productId] = {
          ...product,
          unit_id: unitId,
          ratio,
        };
      }

      return updated;
    });
  };

  /** Carrito vacío y sin llave pendiente (la siguiente venta lleva una nueva). */
  const resetCart = () => {
    setSelectedProducts({});
    setCurrentSaleId(null);
    requestIdRef.current = null;
    pendingPaymentRef.current = null;
    setPendingUnknown(false);
    setRestoredPending(null);
    clearPending();
  };

  /** Ya se sabe en qué quedó el cobro: deja de estar en duda (la llave se conserva). */
  const settlePending = () => {
    pendingPaymentRef.current = null;
    setPendingUnknown(false);
    setRestoredPending(null);
    clearPending();
  };

  const clearCart = async () => {
    if (pendingUnknown) {
      const ok = await alerts.confirm(
        "No se pudo confirmar si la última venta quedó registrada. Si vacías el carrito y vuelves a cobrar estos productos podría quedar dos veces: primero vuelve a presionar «Confirmar venta» (si ya se registró no se cobra otra vez).",
        { title: "Vaciar carrito", okText: "Vaciar", cancelText: "Volver" },
      );
      if (!ok) return;
    }
    resetCart();
    alerts.success("Carrito limpiado");
  };

  const setCustomer = (customerId: number | null) => {
    setCustomerId(customerId);
  };

  /**
   * Registra la venta. No muestra mensajes: devuelve qué pasó y la pantalla
   * avisa una sola vez (antes cada error salía dos veces, una aquí y otra en
   * la pantalla, con el "Network Error" de axios en inglés).
   */
  const confirmSale = (data?: {
    payment_method?: string;
    paid_amount?: number;
  }): Promise<SaleAttempt | undefined> =>
    run(async (): Promise<SaleAttempt> => {
      // Cada renglón en la unidad del producto (500 g de uno por kilo van
      // como 0.5 kg a su precio por kilo), con la cantidad y el precio
      // redondeados como el servidor: el total que ve el usuario es el que se
      // registra.
      const details = Object.values(selectedProducts).map((item) => ({
        product_id: item.product_id,
        package_id: item.package_id,
        ...lineOf(item),
      }));

      // El reintento de un cobro en duda lleva el mismo pago que el primero
      // (la pantalla no deja cambiarlo mientras tanto).
      const payment: PendingPayment =
        pendingUnknownRef.current && pendingPaymentRef.current
          ? pendingPaymentRef.current
          : { payment_method: data?.payment_method || "cash", paid_amount: data?.paid_amount };

      const clientRequestId = requestIdRef.current ?? newClientRequestId();
      requestIdRef.current = clientRequestId;
      pendingPaymentRef.current = payment;
      setPendingUnknown(true);
      // En el equipo desde ahora: si se pierde la respuesta y se sale de la
      // pantalla, al volver se reintenta con la misma llave.
      savePending({ requestId: clientRequestId, items: selectedProducts, payment });

      const charged = (sale: any, recovered = false): SaleAttempt => {
        resetCart();
        // Recargar datos para actualizar el stock
        loadData();
        return { status: "charged", sale, recovered, payment };
      };

      try {
        const response = await services.sales.store({
          payment_method: payment.payment_method,
          paid_amount: payment.paid_amount,
          details,
          client_request_id: clientRequestId,
        });
        const body: any = response.data;
        return charged(body?.data ?? body);
      } catch (error) {
        if (!isOutcomeUnknown(error)) {
          settlePending();
          // La llave ya se usó en otra operación: el siguiente intento lleva
          // una nueva (con la misma se rechazaría otra vez).
          if (apiErrorCode(error) === SALE_ERROR_CODES.clientRequestConflict) {
            requestIdRef.current = null;
          }
          return { status: "rejected", error };
        }

        // Sin respuesta: la venta pudo registrarse. Quien puede usar el punto
        // de venta puede buscarla por su llave; si no, el reintento con la
        // misma llave tampoco la duplica.
        if (hasPermission("sales_pos")) {
          await wait(VERIFY_DELAY_MS);
          try {
            const found = await services.pos.findSaleByRequest(clientRequestId);
            if (found) return charged(found.data, true);
            settlePending();
            return { status: "not_charged" };
          } catch {
            // Tampoco se pudo consultar: sigue en duda.
          }
        }
        return { status: "unknown", error };
      }
    });

  const totalCents = useMemo(
    () =>
      sumCents(
        Object.values(selectedProducts).map((item) =>
          normalizedLineCents(lineOf(item)),
        ),
      ),
    [selectedProducts],
  );

  const cartItems = useMemo(() => {
    const productsMap = new Map(products.map((product) => [product.id.toString(), product]));

    return Object.entries(selectedProducts).map(([productId, item]) => {
      const product = productsMap.get(productId);
      const selectedUnit = product?.available_units?.find(
        (unit) => unit.id === item.unit_id,
      );

      return {
        id: item.id,
        product_id: item.product_id,
        code: product?.code || "",
        name: product?.name || "Producto desconocido",
        // Por la unidad elegida, solo para mostrarlo ($25/kg → $0.025/g).
        price: unitDisplayPrice(item.price, item.ratio),
        quantity: item.quantity,
        // El renglón en la unidad del producto, redondeado a centavos como el
        // servidor (la suma es el total cobrado).
        total: centsToAmount(normalizedLineCents(lineOf(item))),
        unit: selectedUnit?.abbreviation || "",
        unit_id: item.unit_id,
        unit_name: selectedUnit?.name,
        unit_abbreviation: selectedUnit?.abbreviation,
        // Peso y volumen admiten decimales (1.5 kg); piezas y paquetes, no.
        unit_type: product?.unit_type ?? undefined,
        is_package: !!item.package_id,
        main_image: product?.main_image,
        available_units: product?.available_units?.map((unit) => ({
          id: unit.id,
          name: unit.name,
          abbreviation: unit.abbreviation,
        })),
      };
    });
  }, [selectedProducts, products]);

  // Lo que se ofrece en la lista y el escáner: sin la pieza suelta de los
  // productos que solo se venden por paquete.
  const offeredProducts = useMemo(
    () => products.filter((product) => product.is_package || product.for_sale !== false),
    [products],
  );

  const value = {
    products: offeredProducts,
    units,
    categories,
    groupedUnits,
    loading,
    selectedProducts,
    cartItems,
    totalCents,
    currentSaleId,
    customerId,
    submitting,
    pendingUnknown,
    restoredPending,
    loadData,
    handleAddProduct,
    handleRemoveProduct,
    handleItemChange,
    clearCart,
    setCustomer,
    confirmSale,
    formRef,
  };

  return <SaleContext.Provider value={value}>{children}</SaleContext.Provider>;
}

export function useSale() {
  const context = useContext(SaleContext);
  if (context === undefined) {
    throw new Error("useSale must be used within a SaleProvider");
  }
  return context;
}
