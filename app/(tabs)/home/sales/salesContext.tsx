import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import React, { createContext, ReactNode, useContext } from "react";

const SalesContext = createContext<SalesContextProps | undefined>(undefined);

interface CartItem {
  id: number;
  product_id?: number; // Para compatibilidad con backend de compras
  name: string;
  code: string;
  price: number;
  unit_price?: number; // Para compatibilidad con backend de compras
  quantity: number;
  total: number;
  total_price?: number; // Para compatibilidad con backend de compras
  current_stock?: number;
  product_type?: string;
}

interface SalesContextProps {
  categories: App.Entities.Category[];
  setCategories: React.Dispatch<React.SetStateAction<App.Entities.Category[]>>;
  selectedCategories: number[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<number[]>>;
  productsByCategory: Record<number, App.Entities.Product[]>;
  products: App.Entities.Product[];
  loading: boolean;
  categoriesIds: number[];
  // Search functionality
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  // Cart functionality
  cart: CartItem[];
  addToCart: (product: App.Entities.Product, quantity?: number) => void;
  updateQuantity: (productId: number, newQuantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;
  getCartQuantity: (productId: number) => number;
  onConfirm?: (cart: any[], total: number) => void;
  type: "sales" | "purchases";
}

interface SalesProviderProps {
  children: ReactNode;
  type: "sales" | "purchases";
  supplierId?: number;
  initialCart?: any[];
  onCartChange?: (cart: any[], total: number) => void;
  onConfirm?: (cart: any[], total: number) => void;
}

export const SalesProvider = ({
  children,
  type = "sales",
  supplierId,
  initialCart,
  onCartChange,
  onConfirm,
}: SalesProviderProps) => {
  const [categories, setCategories] = React.useState<App.Entities.Category[]>(
    []
  );
  const [selectedCategories, setSelectedCategories] = React.useState<number[]>(
    []
  );
  const [productsByCategory, setProductsByCategory] = React.useState<
    Record<number, any[]>
  >({});
  const [products, setProducts] = React.useState<App.Entities.Product[]>([]);
  const [allProducts, setAllProducts] = React.useState<any[]>([]);
  const [searchText, setSearchText] = React.useState<string>("");
  const [cart, setCart] = React.useState<CartItem[]>(initialCart || []);

  const [loading, setLoading] = React.useState<boolean>(false);

  const auth = useAuth();

  useAsync(async () => {
    setLoading(true);
    try {
      const productParams = {
        all: true,
        location_id: auth.location?.id,
      };

      if (type === "purchases") {
        productParams["product_type"] = ["raw_material", "commercial"];
      }

      const [categoriesRes, productsRes] = await Promise.all([
        Services.categories.index({
          all: true,
        }),
        Services.products.index(productParams),
      ]);

      // Handle both array and paginated response for categories
      const categoriesData = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : categoriesRes.data.data;

      // Handle both array and paginated response for products
      const productsData = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data.data;

      // Agrupar productos por categoría (por category_id o category.id)
      // Filtrar solo productos disponibles para venta
      const groupedProducts: Record<number, any[]> = {};
      (productsData || [])
        .filter(
          (product: any) => product.for_sale === true || product.for_sale === 1
        )
        .forEach((product: any) => {
          const catId =
            // @ts-ignore - soportar distintas formas de modelo
            product.category_id ?? // id directo
            // @ts-ignore
            product.category?.id ?? // relación anidada
            -1; // fallback si no tiene categoría
          if (!groupedProducts[catId]) groupedProducts[catId] = [];
          groupedProducts[catId].push(product);
        });

      console.log("productsData:", productsData);

      const productsDataByCategory = groupedProducts;
      setCategories(categoriesData || []);
      setAllProducts(productsData || []);
      setProducts(productsData || []);
      setProductsByCategory(productsDataByCategory || {});
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  });

  const categoriesIds = React.useMemo<number[]>(
    () =>
      (categories || [])
        .map((c) => c?.id)
        .filter((id): id is number => typeof id === "number"),
    [categories]
  );

  // Cart functionality
  const addToCart = React.useCallback(
    (product: any, quantity: number = 1) => {
      const price =
        type === "sales"
          ? product.sale_price || product.price || 0
          : product.purchase_price || product.price || 0;

      setCart((currentCart) => {
        const existingItemIndex = currentCart.findIndex(
          (item) => item.id === product.id
        );

        if (existingItemIndex >= 0) {
          // Si ya existe, verificar stock para ventas
          const currentCartQuantity = currentCart[existingItemIndex].quantity;
          const newQuantity = currentCartQuantity + quantity;

          if (
            type === "sales" &&
            product.current_stock !== undefined &&
            newQuantity > product.current_stock
          ) {
            // No permitir agregar más que el stock disponible
            alert(
              `No se puede agregar más cantidad. Stock disponible: ${product.current_stock}, ya tienes: ${currentCartQuantity} en el carrito.`
            );
            return currentCart;
          }

          // Si ya existe, actualizar cantidad
          const updatedCart = [...currentCart];
          updatedCart[existingItemIndex].quantity = newQuantity;
          updatedCart[existingItemIndex].total = newQuantity * price;
          updatedCart[existingItemIndex].total_price = newQuantity * price; // Para compatibilidad con backend
          return updatedCart;
        } else {
          // Verificar stock para ventas antes de agregar nuevo producto
          if (
            type === "sales" &&
            product.current_stock !== undefined &&
            quantity > product.current_stock
          ) {
            alert(
              `No se puede agregar esta cantidad. Stock disponible: ${product.current_stock}`
            );
            return currentCart;
          }

          // Agregar nuevo item
          const newItem: CartItem = {
            id: product.id,
            product_id: product.id, // Para compatibilidad con backend
            name: product.name,
            code: product.code || "",
            price,
            unit_price: price, // Para compatibilidad con backend
            quantity,
            total: price * quantity,
            total_price: price * quantity, // Para compatibilidad con backend
            current_stock: product.current_stock,
            product_type: product.product_type,
          };
          return [...currentCart, newItem];
        }
      });
    },
    [type]
  );

  const updateQuantity = React.useCallback(
    (productId: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
      }

      setCart((currentCart) =>
        currentCart.map((item) => {
          if (item.id === productId) {
            // Validar stock para ventas
            if (
              type === "sales" &&
              item.current_stock !== undefined &&
              newQuantity > item.current_stock
            ) {
              alert(
                `No se puede establecer esta cantidad. Stock disponible: ${item.current_stock}`
              );
              return item; // No cambiar la cantidad
            }

            return {
              ...item,
              quantity: newQuantity,
              total: item.price * newQuantity,
              total_price: item.price * newQuantity, // Para compatibilidad con backend
            };
          }
          return item;
        })
      );
    },
    [type]
  );

  const removeFromCart = React.useCallback((productId: number) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  }, []);

  const clearCart = React.useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const cartItemsCount = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const getCartQuantity = React.useCallback(
    (productId: number) => {
      const item = cart.find((item) => item.id === productId);
      return item?.quantity || 0;
    },
    [cart]
  );

  // Notificar cambios en el carrito
  React.useEffect(() => {
    if (onCartChange) {
      onCartChange(cart, cartTotal);
    }
  }, [cart, cartTotal, onCartChange]);

  // Filter products by search text
  React.useEffect(() => {
    if (!searchText.trim()) {
      // Si no hay texto de búsqueda, mostrar todos los productos filtrados según el tipo
      const filteredProducts = (allProducts || []).filter((product: any) => {
        if (type === "sales") {
          // Para ventas: solo productos marcados para venta
          return product.for_sale === true || product.for_sale === 1;
        } else {
          // Para compras: solo materias primas y comerciales (no procesados)
          const allowedTypes = ["raw_material", "commercial"];
          const productType = product.product_type;
          const matchesType = allowedTypes.includes(productType);

          // Si hay supplier_id, filtrar también por proveedor
          if (supplierId) {
            return matchesType && product.supplier_id === supplierId;
          }
          return matchesType;
        }
      });

      // Re-agrupar productos
      const groupedProducts: Record<number, any[]> = {};
      filteredProducts.forEach((product: any) => {
        const catId = product.category_id ?? product.category?.id ?? -1;
        if (!groupedProducts[catId]) groupedProducts[catId] = [];
        groupedProducts[catId].push(product);
      });

      setProducts(filteredProducts);
      setProductsByCategory(groupedProducts);
    } else {
      // Filtrar productos por texto de búsqueda
      const searchLower = searchText.toLowerCase();
      const filteredProducts = (allProducts || []).filter((product: any) => {
        const matchesSearch =
          product.name?.toLowerCase().includes(searchLower) ||
          product.code?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower);

        let matchesType = false;
        if (type === "sales") {
          // Para ventas: solo productos marcados para venta
          matchesType = product.for_sale === true || product.for_sale === 1;
        } else {
          // Para compras: solo materias primas y comerciales (no procesados)
          const allowedTypes = ["raw_material", "commercial"];
          const productType = product.product_type;
          matchesType = allowedTypes.includes(productType);

          // Si hay supplier_id, filtrar también por proveedor
          if (supplierId) {
            matchesType = matchesType && product.supplier_id === supplierId;
          }
        }

        return matchesSearch && matchesType;
      });

      // Re-agrupar productos filtrados
      const groupedProducts: Record<number, any[]> = {};
      filteredProducts.forEach((product: any) => {
        const catId = product.category_id ?? product.category?.id ?? -1;
        if (!groupedProducts[catId]) groupedProducts[catId] = [];
        groupedProducts[catId].push(product);
      });

      setProducts(filteredProducts);
      setProductsByCategory(groupedProducts);
    }
  }, [searchText, allProducts]);

  const value = {
    categories,
    setCategories,
    selectedCategories,
    setSelectedCategories,
    productsByCategory,
    loading,
    categoriesIds,
    products,
    // Search functionality
    searchText,
    setSearchText,
    // Cart functionality
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartItemsCount,
    getCartQuantity,
    onConfirm,
    type,
  };

  return (
    <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
  );
};

export function useSales() {
  const ctx = useContext(SalesContext);
  if (!ctx) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return ctx;
}
