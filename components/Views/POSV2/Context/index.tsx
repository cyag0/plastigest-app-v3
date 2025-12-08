import { useAlerts } from "@/hooks/useAlerts";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { RefCartSidebar } from "../Components/CartSidebar";

export interface CartItem {
  id: number;
  product_id?: number;
  name: string;
  code: string;
  price: number;
  unit_price?: number;
  quantity: number;
  total: number;
  total_price?: number;
  current_stock?: number;
  product_type?: string;
  main_image?: { uri: string };
  unit_id?: number;
  unit_name?: string;
  unit_abbreviation?: string;
  available_units?: Array<{
    id: number;
    name: string;
    abbreviation: string;
    factor_to_base: number;
    is_base: boolean;
  }>;
}

export type CartEventType =
  | "add"
  | "update"
  | "remove"
  | "clear"
  | "change_unit";

export interface CartEventData {
  type: CartEventType;
  item?: CartItem;
  productId?: number;
  quantity?: number;
  unitId?: number;
}

type CartEventListener = (event: CartEventData) => void;

interface POSContextType {
  products: App.Entities.Product[];
  setProducts: (products: App.Entities.Product[]) => void;
  categories: App.Entities.Category[];
  setCategories: (categories: App.Entities.Category[]) => void;
  cartItems: React.MutableRefObject<CartItem[]>;
  groupedUnits: Record<number, Array<any>>;
  setGroupedUnits: (units: Record<number, Array<any>>) => void;
  initializeCart: (items: CartItem[]) => void;
  addToCart: (product: App.Entities.Product, quantity?: number) => void;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => void;
  updateUnit: (productId: number, unitId: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemsCount: () => number;
  updateCart: () => void;
  cartRef: React.RefObject<RefCartSidebar | null>;
  onCartEvent: (listener: CartEventListener) => () => void;
  type: "sales" | "purchases";
}

const POSContext = createContext<POSContextType | undefined>(undefined);

interface POSProviderProps {
  children: React.ReactNode;
  type?: "sales" | "purchases";
}

export function POSProvider({ children, type = "sales" }: POSProviderProps) {
  const [products, setProducts] = useState<App.Entities.Product[]>([]);
  const [categories, setCategories] = useState<App.Entities.Category[]>([]);
  const [groupedUnits, setGroupedUnits] = useState<Record<number, Array<any>>>(
    {}
  );
  const alerts = useAlerts();

  const cartItems = useRef<CartItem[]>([]);
  const cartRef = useRef<RefCartSidebar | null>(null);
  const eventListeners = useRef<CartEventListener[]>([]);

  const updateCart = () => {
    cartRef.current?.updateItems();
  };

  // Sistema de eventos
  const emitEvent = (event: CartEventData) => {
    eventListeners.current.forEach((listener) => listener(event));
  };

  const onCartEvent = (listener: CartEventListener) => {
    eventListeners.current.push(listener);
    // Retornar función para desuscribirse
    return () => {
      eventListeners.current = eventListeners.current.filter(
        (l) => l !== listener
      );
    };
  };

  const addToCart = (product: App.Entities.Product, quantity: number = 1) => {
    try {
      // Validar cantidad
      if (quantity <= 0) {
        alerts.error("La cantidad debe ser mayor a 0");
        return;
      }

      const existingItemIndex = cartItems.current.findIndex(
        (item) => item.id === product.id
      );

      if (existingItemIndex >= 0) {
        const newQuantity =
          cartItems.current[existingItemIndex].quantity + quantity;

        // Solo validar stock en ventas
        if (
          type === "sales" &&
          product.current_stock !== undefined &&
          newQuantity > product.current_stock
        ) {
          alerts.error(
            `Stock insuficiente. Disponible: ${product.current_stock}, en carrito: ${cartItems.current[existingItemIndex].quantity}`
          );
          return;
        }

        cartItems.current[existingItemIndex].quantity = newQuantity;
        cartItems.current[existingItemIndex].total =
          newQuantity * cartItems.current[existingItemIndex].price;
        cartItems.current[existingItemIndex].total_price =
          cartItems.current[existingItemIndex].total;

        updateCart();
        emitEvent({
          type: "update",
          item: cartItems.current[existingItemIndex],
        });
        alerts.success(`Se actualizó la cantidad de ${product.name}`);
      } else {
        // Obtener las unidades disponibles para este producto
        const productUnitId = product.unit_id;
        const availableUnits =
          productUnitId && groupedUnits[productUnitId]
            ? groupedUnits[productUnitId]
            : [];

        // Buscar la unidad actual del producto
        const currentUnit = availableUnits.find(
          (u: any) => u.id === productUnitId
        );

        // Solo validar stock en ventas
        if (
          type === "sales" &&
          product.current_stock !== undefined &&
          quantity > product.current_stock
        ) {
          alerts.error(
            `Stock insuficiente. Disponible: ${product.current_stock}`
          );
          return;
        }

        const newItem: CartItem = {
          id: product.id,
          product_id: product.id,
          name: product.name,
          code: product.code || "",
          price: product.sale_price
            ? parseFloat(product.sale_price.toString())
            : 0,
          unit_price: product.sale_price
            ? parseFloat(product.sale_price.toString())
            : 0,
          quantity,
          total: product.sale_price
            ? parseFloat(product.sale_price.toString()) * quantity
            : 0,
          total_price: product.sale_price
            ? parseFloat(product.sale_price.toString()) * quantity
            : 0,
          current_stock: product.current_stock ?? undefined,
          product_type: product.product_type?.toString(),
          main_image: product.main_image,
          unit_id: productUnitId ?? undefined,
          unit_name: currentUnit?.name,
          unit_abbreviation: currentUnit?.abbreviation,
          available_units: availableUnits,
        };
        cartItems.current.push(newItem);

        updateCart();
        emitEvent({ type: "add", item: newItem });
        alerts.success(`${product.name} se agregó al carrito`);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alerts.error("No se pudo agregar el producto al carrito");
    }
  };

  const removeFromCart = async (productId: number) => {
    const item = cartItems.current.find((i) => i.id === productId);
    if (!item) return;

    const confirmed = await alerts.confirm(
      `¿Eliminar ${item.name} del carrito?`,
      {
        title: "Confirmar eliminación",
        okText: "Eliminar",
        cancelText: "Cancelar",
      }
    );

    if (!confirmed) return;

    cartItems.current = cartItems.current.filter((i) => i.id !== productId);

    updateCart();
    emitEvent({ type: "remove", item, productId });
    alerts.info("Producto eliminado del carrito");
  };

  const updateQuantity = (productId: number, quantity: number) => {
    try {
      if (quantity <= 0) {
        alerts.error("La cantidad debe ser mayor a 0");
        return;
      }

      const itemIndex = cartItems.current.findIndex(
        (item) => item.id === productId
      );

      if (itemIndex >= 0) {
        const item = cartItems.current[itemIndex];

        // Solo validar stock en ventas
        if (
          type === "sales" &&
          item.current_stock !== undefined &&
          quantity > item.current_stock
        ) {
          alerts.error(`Stock insuficiente. Disponible: ${item.current_stock}`);
          return;
        }

        cartItems.current[itemIndex].quantity = quantity;
        cartItems.current[itemIndex].total =
          quantity * cartItems.current[itemIndex].price;
        cartItems.current[itemIndex].total_price =
          cartItems.current[itemIndex].total;

        updateCart();
        emitEvent({
          type: "update",
          item: cartItems.current[itemIndex],
          quantity,
        });
        alerts.success("Cantidad actualizada");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      alerts.error("No se pudo actualizar la cantidad");
    }
  };

  const updateUnit = (productId: number, unitId: number) => {
    try {
      const itemIndex = cartItems.current.findIndex(
        (item) => item.id === productId
      );

      if (itemIndex >= 0) {
        const item = cartItems.current[itemIndex];
        const availableUnits = item.available_units || [];
        const newUnit = availableUnits.find((u) => u.id === unitId);

        if (newUnit) {
          const oldUnit = availableUnits.find((u) => u.id === item.unit_id);

          // Calcular el nuevo precio basado en el factor de conversión
          // Si cambias de unidad base (factor 1) a una derivada (factor > 1),
          // el precio se multiplica por el factor
          const oldFactor = oldUnit?.factor_to_base || 1;
          const newFactor = newUnit.factor_to_base || 1;

          // Precio unitario ajustado
          const basePricePerUnit = item.unit_price! / oldFactor;
          const newPrice = basePricePerUnit * newFactor;

          cartItems.current[itemIndex] = {
            ...item,
            unit_id: unitId,
            unit_name: newUnit.name,
            unit_abbreviation: newUnit.abbreviation,
            price: newPrice,
            unit_price: newPrice,
            total: newPrice * item.quantity,
            total_price: newPrice * item.quantity,
          };

          updateCart();
          emitEvent({
            type: "change_unit",
            item: cartItems.current[itemIndex],
            unitId,
          });
          alerts.success(`Unidad cambiada a ${newUnit.name}`);
        }
      }
    } catch (error) {
      console.error("Error updating unit:", error);
      alerts.error("No se pudo cambiar la unidad");
    }
  };

  const initializeCart = (items: CartItem[]) => {
    cartItems.current = items;
    //updateCart();
  };

  const clearCart = () => {
    cartItems.current = [];
    updateCart();
    emitEvent({ type: "clear" });
  };

  const getCartTotal = () => {
    return cartItems.current.reduce((sum, item) => sum + item.total, 0);
  };

  const getCartItemsCount = () => {
    return cartItems.current.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <POSContext.Provider
      value={{
        products,
        setProducts,
        categories,
        setCategories,
        cartItems,
        groupedUnits,
        setGroupedUnits,
        initializeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateUnit,
        clearCart,
        getCartTotal,
        getCartItemsCount,
        updateCart,
        cartRef,
        onCartEvent,
        type,
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOS debe usarse dentro de un POSProvider");
  }
  return context;
}
