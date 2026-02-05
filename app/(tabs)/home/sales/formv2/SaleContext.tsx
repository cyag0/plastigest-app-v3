import { AppFormRef } from "@/components/Form/AppForm/AppForm";
import {
    ProductCategory,
    ProductListItem,
} from "@/components/Views/POSV3/components";
import { Unit } from "@/components/Views/POSV3/components/ListProducts";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import React, {
    createContext,
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

interface SaleContextType {
  // Data
  products: ProductListItem[];
  units: Unit[];
  categories: ProductCategory[];
  groupedUnits: GroupedUnits;
  loading: boolean;
  selectedProducts: SelectedProducts;
  cartItems: any[]; // CartItemData[]
  currentSaleId: number | null;
  customerId: number | null;

  // Actions
  loadData: () => Promise<void>;
  handleAddProduct: (product: ProductListItem, unitId: number) => void;
  handleRemoveProduct: (productId: number | string) => void;
  handleItemChange: (
    productId: number | string,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => void;
  clearCart: () => void;
  setCustomer: (customerId: number | null) => void;
  confirmSale: (data?: {
    payment_method?: string;
    paid_amount?: number;
    notes?: string;
  }) => Promise<void>;
}

const SaleContext = createContext<SaleContextType | undefined>(undefined);

interface SaleProviderProps {
  children: React.ReactNode;
}

export function SaleProvider({ children }: SaleProviderProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [groupedUnits, setGroupedUnits] = useState<GroupedUnits>(
    {} as GroupedUnits,
  );
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>(
    {},
  );

  const formRef = useRef<AppFormRef<{}>>(null);

  const [currentSaleId, setCurrentSaleId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const alerts = useAlerts();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar datos iniciales desde el endpoint
      const response = await Services.sales.getInitialData();

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
          const expandedProducts: ProductListItem[] = [];

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
                  ? product.locations[0].pivot?.current_stock
                  : undefined,
              category_id: product.category_id || undefined,
              main_image: product.main_image,
              available_units: availableUnits,
              is_package: false,
            });

            // Agregar cada paquete como un producto separado
            product.active_packages?.forEach((pkg) => {
              const currentStock =
                product.locations && product.locations[0]
                  ? product.locations[0].pivot?.current_stock
                  : 0;

              expandedProducts.push({
                price: parseFloat(pkg.sale_price || "0").toFixed(2),
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
  };

  // Calcular stock total usado para un producto base (en unidades base)
  const calculateUsedStock = (baseProductId: number) => {
    let totalUsed = 0;

    Object.entries(selectedProducts).forEach(([key, item]) => {
      if (item.product_id === baseProductId) {
        // Si es un paquete, multiplicar por quantity_per_package
        const productData = products.find((p) => p.id === key);
        if (productData?.is_package && productData.quantity_per_package) {
          totalUsed += item.quantity * productData.quantity_per_package;
        } else {
          // Producto individual - considerar el factor de conversión de la unidad
          const selectedUnit = productData?.available_units?.find(
            (u) => u.id === item.unit_id,
          );
          const factorToBase = selectedUnit?.factor_to_base || 1;
          totalUsed += item.quantity * factorToBase;
        }
      }
    });

    return totalUsed;
  };

  const handleAddProduct = (product: ProductListItem, unitId: number) => {
    const productId = product.id;

    // Determinar el product_id correcto
    const numericProductId = product.is_package
      ? product.base_product_id!
      : parseInt(productId.toString().replace("product_", ""));

    // Obtener el stock actual del producto base
    const baseProduct = products.find(
      (p) => p.id === `product_${numericProductId}`,
    );
    const availableStock = baseProduct?.current_stock || 0;

    // Calcular cuánto stock ya está siendo usado en el carrito
    const usedStock = calculateUsedStock(numericProductId);

    // Calcular cuánto stock adicional se requiere para esta operación (en unidades base)
    let requiredStock = 1;
    if (product.is_package && product.quantity_per_package) {
      requiredStock = product.quantity_per_package;
    } else {
      // Para productos individuales, considerar el factor de conversión
      const selectedUnit = product.available_units?.find(
        (u) => u.id === unitId,
      );
      const factorToBase = selectedUnit?.factor_to_base || 1;
      requiredStock = factorToBase;
    }

    // Validar que hay stock suficiente (usedStock ya incluye lo que está en el carrito)
    if (usedStock + requiredStock > availableStock) {
      const selectedUnit = product.available_units?.find(
        (u) => u.id === unitId,
      );
      alerts.error(
        `Stock insuficiente. Disponible: ${availableStock} ${baseProduct?.available_units?.[0]?.abbreviation || ""}, En carrito: ${usedStock}, Requiere adicional: ${requiredStock}`,
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
      unit_id: unitId,
      price: parseFloat(product.price),
      detail_id: undefined,
    };

    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: newProduct,
    }));

    alerts.success("Producto agregado al carrito");
  };

  const handleRemoveProduct = (productId: number | string) => {
    setSelectedProducts((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });

    alerts.success("Producto eliminado del carrito");
  };

  const handleItemChange = (
    productId: number | string,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => {
    setSelectedProducts((prev) => {
      const product = prev[productId];
      if (!product) return prev;

      const updated = { ...prev };

      if (action === "increment") {
        // Validar stock antes de incrementar
        const productData = products.find((p) => p.id === productId);
        const baseProduct = products.find(
          (p) => p.id === `product_${product.product_id}`,
        );
        const availableStock = baseProduct?.current_stock || 0;
        const usedStock = calculateUsedStock(product.product_id);

        let requiredStock = 1;
        if (productData?.is_package && productData.quantity_per_package) {
          requiredStock = productData.quantity_per_package;
        } else {
          // Para productos individuales, considerar el factor de conversión
          const selectedUnit = productData?.available_units?.find(
            (u) => u.id === product.unit_id,
          );
          const factorToBase = selectedUnit?.factor_to_base || 1;
          requiredStock = factorToBase;
        }

        if (usedStock + requiredStock > availableStock) {
          alerts.error(
            `Stock insuficiente. Disponible: ${availableStock} ${baseProduct?.available_units?.[0]?.abbreviation || ""}, En uso: ${usedStock}`,
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
      } else if (action === "unit" && data?.unit_id) {
        // Validar que con la nueva unidad no se exceda el stock
        const productData = products.find((p) => p.id === productId);
        const baseProduct = products.find(
          (p) => p.id === `product_${product.product_id}`,
        );
        const availableStock = baseProduct?.current_stock || 0;

        // Obtener la nueva unidad
        const newUnit = productData?.available_units?.find(
          (u) => u.id === data.unit_id,
        );

        // Calcular cuánto stock en unidad base requiere la cantidad actual con la nueva unidad
        const factorToBase = newUnit?.factor_to_base || 1;
        const requiredStockInBaseUnit = product.quantity * factorToBase;

        // Calcular cuánto stock está usando actualmente este producto
        const currentUnit = productData?.available_units?.find(
          (u) => u.id === product.unit_id,
        );
        const currentFactorToBase = currentUnit?.factor_to_base || 1;
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

        updated[productId] = {
          ...product,
          unit_id: data.unit_id,
        };
      }

      return updated;
    });
  };

  const clearCart = () => {
    setSelectedProducts({});
    setCurrentSaleId(null);
    alerts.success("Carrito limpiado");
  };

  const setCustomer = (customerId: number | null) => {
    setCustomerId(customerId);
  };

  const confirmSale = async (data?: {
    payment_method?: string;
    paid_amount?: number;
  }) => {
    try {
      if (Object.keys(selectedProducts).length === 0) {
        alerts.error("No hay productos en el carrito");
        return;
      }

      // Preparar los detalles de la venta
      const details = Object.values(selectedProducts).map((item) => ({
        product_id: item.product_id,
        package_id: item.package_id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const saleData = {
        payment_method: data?.payment_method || "cash",
        paid_amount: data?.paid_amount,
        details,
      };

      console.log("Sale data to be submitted:", saleData);

      // Crear la venta
      const response = await Services.sales.store(saleData);

      clearCart();

      // Recargar datos para actualizar el stock
      await loadData();

      alerts.success("Venta registrada exitosamente");
    } catch (error: any) {
      console.error("Error confirming sale:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error al confirmar la venta";
      alerts.error(errorMessage);
      throw error;
    }
  };

  const cartItems = useMemo(() => {
    return Object.values(selectedProducts).map((item) => {
      const product = products.find((p) => p.id === item.id);
      const unit = units.find((u) => u.id === item.unit_id);

      return {
        id: item.id,
        name: product?.name || "Producto desconocido",
        code: product?.code || "",
        image: product?.main_image,
        quantity: item.quantity,
        unit: unit?.abbreviation || "",
        unit_id: item.unit_id,
        price: item.price,
      };
    });
  }, [selectedProducts, products, units]);

  const value = useMemo(
    () => ({
      products,
      units,
      categories,
      groupedUnits,
      loading,
      selectedProducts,
      cartItems,
      currentSaleId,
      customerId,
      loadData,
      handleAddProduct,
      handleRemoveProduct,
      handleItemChange,
      clearCart,
      setCustomer,
      confirmSale,
      formRef,
    }),
    [
      products,
      units,
      categories,
      groupedUnits,
      loading,
      selectedProducts,
      cartItems,
      currentSaleId,
      customerId,
    ],
  );

  return <SaleContext.Provider value={value}>{children}</SaleContext.Provider>;
}

export function useSale() {
  const context = useContext(SaleContext);
  if (context === undefined) {
    throw new Error("useSale must be used within a SaleProvider");
  }
  return context;
}
