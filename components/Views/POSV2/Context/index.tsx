import { useAlerts } from "@/hooks/useAlerts";
import React, { createContext, useContext, useRef, useState } from "react";
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
  unit_type?: string;
  unit_name?: string;
  unit_abbreviation?: string;
  packages?: Array<{
    id: number;
    package_name: string;
    barcode: string;
    quantity_per_package: number;
    purchase_price: number;
    sale_price: number;
    display_name: string;
    available_stock: number;
  }>;
  selected_package_id?: number | null;
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
  unitsByType: Record<string, Array<any>>;
  setUnitsByType: (units: Record<string, Array<any>>) => void;
  initializeCart: (items: CartItem[]) => void;
  addToCart: (product: App.Entities.Product, quantity?: number) => void;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => void;
  updateUnit: (productId: number, unitId: number) => void;
  updatePackage: (productId: number, packageId: number | null) => void;
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
  const [unitsByType, setUnitsByType] = useState<Record<string, Array<any>>>(
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

        // Asegurar que price sea un número válido
        const price =
          typeof cartItems.current[existingItemIndex].price === "number"
            ? cartItems.current[existingItemIndex].price
            : parseFloat(
                String(cartItems.current[existingItemIndex].price || 0)
              );

        cartItems.current[existingItemIndex].quantity = newQuantity;
        cartItems.current[existingItemIndex].price = price;
        cartItems.current[existingItemIndex].total = newQuantity * price;
        cartItems.current[existingItemIndex].total_price = newQuantity * price;

        updateCart();
        emitEvent({
          type: "update",
          item: cartItems.current[existingItemIndex],
        });
        alerts.success(`Se actualizó la cantidad de ${product.name}`);
      } else {
        // Obtener el tipo de unidad del producto y las unidades disponibles de ese tipo
        const productUnitType = product.unit_type;
        const availableUnits =
          productUnitType && unitsByType[productUnitType]
            ? unitsByType[productUnitType]
            : [];

        // Buscar la unidad actual del producto
        const currentUnit = availableUnits.find(
          (u: any) => u.id === product.unit_id
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

        // Usar el precio correcto según el tipo de operación
        const basePrice =
          type === "sales"
            ? product.sale_price
              ? parseFloat(product.sale_price.toString())
              : 0
            : product.purchase_price
            ? parseFloat(product.purchase_price.toString())
            : 0;

        const newItem: CartItem = {
          id: product.id,
          product_id: product.id,
          name: product.name,
          code: product.code || "",
          price: basePrice,
          unit_price: basePrice,
          quantity,
          total: basePrice * quantity,
          total_price: basePrice * quantity,
          current_stock: product.current_stock ?? undefined,
          product_type: product.product_type?.toString(),
          main_image: product.main_image,
          unit_id: product.unit_id ?? undefined,
          unit_type: productUnitType,
          unit_name: currentUnit?.name,
          unit_abbreviation: currentUnit?.abbreviation,
          packages: product.packages || [],
          selected_package_id: null,
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

        // Asegurar que price sea un número válido
        const price =
          typeof item.price === "number"
            ? item.price
            : parseFloat(String(item.price || 0));

        cartItems.current[itemIndex].quantity = quantity;
        cartItems.current[itemIndex].price = price;
        cartItems.current[itemIndex].total = quantity * price;
        cartItems.current[itemIndex].total_price = quantity * price;

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

        // No permitir cambio de unidad si hay un paquete seleccionado
        if (item.selected_package_id) {
          alerts.warning(
            "No puedes cambiar la unidad cuando hay un paquete seleccionado"
          );
          return;
        }

        // Obtener las unidades disponibles del mismo tipo
        const availableUnits =
          item.unit_type && unitsByType[item.unit_type]
            ? unitsByType[item.unit_type]
            : [];

        const newUnit = availableUnits.find((u: any) => u.id === unitId);

        if (newUnit) {
          const oldUnit = availableUnits.find(
            (u: any) => u.id === item.unit_id
          );

          // Calcular el nuevo precio basado en el factor de conversión - convertir a números
          const oldFactor = Number(oldUnit?.factor_to_base || 1);
          const newFactor = Number(newUnit.factor_to_base || 1);

          // Precio unitario ajustado
          const unitPrice = Number(item.unit_price || 0);
          const basePricePerUnit = unitPrice / oldFactor;
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

  const updatePackage = (productId: number, packageId: number | null) => {
    try {
      const itemIndex = cartItems.current.findIndex(
        (item) => item.id === productId
      );

      if (itemIndex >= 0) {
        const item = cartItems.current[itemIndex];
        const packages = item.packages || [];

        if (packageId === null) {
          // Deseleccionar paquete - volver al precio original del producto
          const unitPrice = Number(item.unit_price || 0);

          cartItems.current[itemIndex] = {
            ...item,
            selected_package_id: null,
            price: unitPrice,
            total: unitPrice * item.quantity,
            total_price: unitPrice * item.quantity,
          };

          updateCart();
          alerts.success("Paquete deseleccionado");
        } else {
          const selectedPackage = packages.find((p) => p.id === packageId);

          if (selectedPackage) {
            // Usar el precio correcto según el tipo de operación y convertir a número
            const packagePrice =
              Number(
                type === "sales"
                  ? selectedPackage.sale_price
                  : selectedPackage.purchase_price
              ) || 0;

            cartItems.current[itemIndex] = {
              ...item,
              selected_package_id: packageId,
              price: packagePrice,
              total: packagePrice * item.quantity,
              total_price: packagePrice * item.quantity,
            };

            updateCart();
            alerts.success(
              `Paquete seleccionado: ${selectedPackage.package_name}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error updating package:", error);
      alerts.error("No se pudo cambiar el paquete seleccionado");
    }
  };

  const initializeCart = (items: CartItem[]) => {
    // Normalizar los datos para asegurar que price y total sean números
    cartItems.current = items.map((item) => ({
      ...item,
      price: Number(item.price || 0),
      unit_price: Number(item.unit_price || 0),
      total: Number(item.total || 0),
      total_price: Number(item.total_price || 0),
      quantity: Number(item.quantity || 0),
    }));
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
        unitsByType,
        setUnitsByType,
        initializeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateUnit,
        updatePackage,
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
