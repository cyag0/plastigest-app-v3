import { formatQuantity, parseQuantity } from "@/utils/format";
import { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { isOutcomeUnknown } from "@/components/Pos/saleErrors";
import {
  ProductCategory,
  ProductListItem,
} from "@/components/Views/POSV3/components";
import { Unit } from "@/components/Views/POSV3/components/ListProducts";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import {
  centsToAmount,
  lineTotalCents,
  roundMoney,
  roundQuantity,
  sumCents,
} from "@/utils/money";
import { newClientRequestId } from "@/utils/requestId";
import services from "@/utils/services";
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
  quantity: number;
  unit_id: number;
  price: number;
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
 *   `recovered` se encontró por su llave después de perder la respuesta).
 * - rejected: el servidor la rechazó y no registró nada.
 * - not_charged: no llegó respuesta y la búsqueda confirmó que no se registró.
 * - unknown: no llegó respuesta y no se pudo confirmar en qué quedó.
 */
export type SaleAttempt =
  | { status: "charged"; sale: any; recovered?: boolean }
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
  return own > 0 ? own : roundMoney(unitPrice * Number(pkg.quantity_per_package ?? 0));
};

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
  const { hasPermission } = useAuth();
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

  // Calcular stock total usado para un producto base (en unidades base)
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
          // Producto individual - considerar el factor de conversión de la unidad
          const selectedUnit = productData?.available_units?.find(
            (u) => u.id === item.unit_id,
          );

          const factorToBase = Number(selectedUnit?.factor_to_base || 1);
          totalUsed += item.quantity * factorToBase;
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
    const defaultUnit = product.available_units?.[0];
    const basePrice = parseFloat(product.price.toString());

    // Determinar el product_id correcto
    const numericProductId = product.is_package
      ? product.base_product_id!
      : parseInt(productId.toString().replace("product_", ""));

    // Obtener el stock actual del producto base
    const baseProduct = products.find(
      (p) => p.id === `product_${numericProductId}`,
    );
    const availableStock = Number(baseProduct?.current_stock || 0);

    // Para paquetes, usar el unit_id del producto base
    const finalUnitId = product.is_package 
      ? (baseProduct?.unit_id || 0)
      : unitId || defaultUnit?.id || 0;

    const selectedUnit = product.available_units?.find(
      (unit) => unit.id === finalUnitId,
    ) || defaultUnit;

    const calculatedPrice =
      product.is_package || selectedUnit?.is_base_unit || !selectedUnit?.factor_to_base
        ? basePrice
        : basePrice * Number(selectedUnit.factor_to_base);

    // Calcular cuánto stock ya está siendo usado en el carrito
    const usedStock = calculateUsedStock(numericProductId);

    // Calcular cuánto stock adicional se requiere para esta operación (en unidades base)
    let requiredStock = 1;
    if (product.is_package && product.quantity_per_package) {
      requiredStock = Number(product.quantity_per_package);
    } else {
      // Para productos individuales, considerar el factor de conversión
      const selectedUnit = baseProduct?.available_units?.find(
        (u) => u.id === finalUnitId,
      );
      const factorToBase = Number(selectedUnit?.factor_to_base || 1);
      requiredStock = factorToBase;
    }

    // Validar que hay stock suficiente (usedStock ya incluye lo que está en el carrito)
    if (usedStock + requiredStock > availableStock) {
      const productBaseUnit = baseProduct?.available_units?.find(
        (u) => u.id === baseProduct.unit_id,
      );
      const remaining = availableStock - usedStock;
      alerts.error(
        `Stock insuficiente. Disponible: ${formatQuantity(availableStock)} ${productBaseUnit?.abbreviation || ""}, En carrito: ${formatQuantity(usedStock)} ${productBaseUnit?.abbreviation || ""}, Restante: ${formatQuantity(remaining)} ${productBaseUnit?.abbreviation || ""}, Requiere: ${formatQuantity(requiredStock)} ${productBaseUnit?.abbreviation || ""}`,
      );
      return;
    }

    // Si el producto ya existe en el carrito, incrementar cantidad
    if (selectedProducts[productId]) {
      handleItemChange(productId, "increment");
      return;
    }

    const newProduct: SelectedProduct = {
      id: productId,
      product_id: numericProductId,
      package_id: product.package_id,
      quantity: 1,
      unit_id: finalUnitId,
      price: calculatedPrice,
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

        let requiredStock = 1;
        if (productData?.is_package && productData.quantity_per_package) {
          requiredStock = Number(productData.quantity_per_package);
        } else {
          // Para productos individuales, considerar el factor de conversión
          const selectedUnit = productData?.available_units?.find(
            (u) => u.id === product.unit_id,
          );
          const factorToBase = Number(selectedUnit?.factor_to_base || 1);
          requiredStock = factorToBase;
        }

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
        if (product.quantity > 1) {
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

        // Stock (en unidad base) que consume una unidad de este renglón.
        let perUnit = 1;
        if (productData?.is_package && productData.quantity_per_package) {
          perUnit = Number(productData.quantity_per_package);
        } else {
          const selectedUnit = productData?.available_units?.find(
            (u) => u.id === product.unit_id,
          );
          perUnit = Number(selectedUnit?.factor_to_base || 1);
        }

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
        const baseProduct = products.find(
          (p) => p.id === `product_${product.product_id}`,
        );
        const availableStock = baseProduct?.current_stock || 0;

        // Obtener la nueva unidad
        const newUnit = productData?.available_units?.find(
          (u) => u.id === unitId,
        );

        // Calcular cuánto stock en unidad base requiere la cantidad actual con la nueva unidad
        const factorToBase = Number(newUnit?.factor_to_base || 1);
        const requiredStockInBaseUnit = product.quantity * factorToBase;

        // Calcular cuánto stock está usando actualmente este producto
        const currentUnit = productData?.available_units?.find(
          (u) => u.id === product.unit_id,
        );
        const currentFactorToBase = Number(currentUnit?.factor_to_base || 1);
        const currentUsedStock = product.quantity * currentFactorToBase;

        // Calcular stock usado por otros productos (excluyendo este)
        const usedStockByOthers =
          calculateUsedStock(product.product_id) - currentUsedStock;

        // Validar que no se exceda el stock
        if (usedStockByOthers + requiredStockInBaseUnit > availableStock) {
          const maxQuantityInNewUnit = Math.floor(
            (availableStock - usedStockByOthers) / factorToBase,
          );
          alerts.error(
            `Stock insuficiente para esta unidad. Máximo disponible: ${maxQuantityInNewUnit} ${newUnit?.abbreviation || "unidades"}`,
          );
          return prev;
        }

        // Calcular el nuevo precio basado en el precio base del producto y el factor de conversión
        const basePrice = parseFloat(String(productData?.price ?? "0"));
        const newPrice =
          newUnit?.is_base_unit || !newUnit?.factor_to_base
            ? basePrice
            : basePrice * Number(factorToBase);

        updated[productId] = {
          ...product,
          unit_id: unitId,
          price: newPrice,
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
    setPendingUnknown(false);
  };

  const clearCart = async () => {
    if (pendingUnknown) {
      const ok = await alerts.confirm(
        "No se pudo confirmar si la última venta quedó registrada. Si vacías el carrito y vuelves a cobrar estos productos podría quedar dos veces: revísala en Ventas.",
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
      // Cantidad y precio redondeados como el servidor: el total que ve el
      // usuario es el que se registra.
      const details = Object.values(selectedProducts).map((item) => ({
        product_id: item.product_id,
        package_id: item.package_id,
        unit_id: item.unit_id,
        quantity: roundQuantity(item.quantity),
        unit_price: roundMoney(item.price),
      }));

      const clientRequestId = requestIdRef.current ?? newClientRequestId();
      requestIdRef.current = clientRequestId;
      setPendingUnknown(true);

      const charged = (sale: any, recovered = false): SaleAttempt => {
        resetCart();
        // Recargar datos para actualizar el stock
        loadData();
        return { status: "charged", sale, recovered };
      };

      try {
        const response = await services.sales.store({
          payment_method: data?.payment_method || "cash",
          paid_amount: data?.paid_amount,
          details,
          client_request_id: clientRequestId,
        });
        const body: any = response.data;
        return charged(body?.data ?? body);
      } catch (error) {
        if (!isOutcomeUnknown(error)) {
          setPendingUnknown(false);
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
            setPendingUnknown(false);
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
          lineTotalCents(item.quantity, item.price),
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
        price: item.price,
        quantity: item.quantity,
        // Redondeado a centavos como el servidor (la suma es el total cobrado).
        total: centsToAmount(lineTotalCents(item.quantity, item.price)),
        unit: selectedUnit?.abbreviation || "",
        unit_id: item.unit_id,
        unit_name: selectedUnit?.name,
        unit_abbreviation: selectedUnit?.abbreviation,
        main_image: product?.main_image,
        available_units: product?.available_units?.map((unit) => ({
          id: unit.id,
          name: unit.name,
          abbreviation: unit.abbreviation,
          price: item.price,
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
