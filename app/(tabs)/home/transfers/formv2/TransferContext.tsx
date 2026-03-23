import {
  ProductListItem as BaseProductListItem,
  ProductCategory,
} from "@/components/Views/POSV3/components";
import { Unit } from "@/components/Views/POSV3/components/ListProducts";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import transferService from "@/utils/services/transferService";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Extender ProductListItem con propiedades necesarias para transferencias
interface ProductListItem extends BaseProductListItem {
  package_id?: number;
  base_product_id?: number;
  quantity_per_package?: number;
  locations?: Array<{
    id: number;
    pivot?: { current_stock: number };
  }>;
}

type unitType = "mass" | "volume" | "quantity";
type GroupedUnits = Record<unitType, Unit[]>;

interface SelectedProduct {
  id: string | number;
  product_id: number;
  quantity: number;
  unit_id: number;
  price: number;
  unit_cost: number;
  package_id?: number;
}

type SelectedProducts = Record<number | string, SelectedProduct>;

interface TransferContextType {
  // Data
  products: ProductListItem[];
  units: Unit[];
  categories: ProductCategory[];
  groupedUnits: GroupedUnits;
  loading: boolean;
  selectedProducts: SelectedProducts;
  cartItems: any[];
  fromLocationId: number | null;
  toLocationId: number | null;

  // Actions
  loadProductsByLocation: (locationId: number) => Promise<void>;
  handleAddProduct: (product: ProductListItem, unitId: number) => void;
  handleRemoveProduct: (productId: number | string) => void;
  handleItemChange: (
    productId: number | string,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => void;
  clearCart: () => void;
  setFromLocation: (locationId: number | null) => void;
  setToLocation: (locationId: number | null) => void;
  confirmTransfer: (data?: { notes?: string }) => Promise<void>;
}

const TransferContext = createContext<TransferContextType | undefined>(
  undefined,
);

interface TransferProviderProps {
  children: React.ReactNode;
}

export function TransferProvider({ children }: TransferProviderProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [groupedUnits, setGroupedUnits] = useState<GroupedUnits>(
    {} as GroupedUnits,
  );
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>(
    {},
  );
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const alerts = useAlerts();

  // Cargar productos cuando cambia la ubicación origen
  useEffect(() => {
    if (fromLocationId) {
      loadProductsByLocation(fromLocationId);
    } else {
      setProducts([]);
      setSelectedProducts({});
    }
  }, [fromLocationId]);

  const loadProductsByLocation = async (locationId: number) => {
    try {
      setLoading(true);

      // Cargar datos iniciales desde el endpoint (usa el mismo que ventas)
      const response = await Services.sales.getInitialData({
        location_id: locationId,
      });

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

        // Procesar productos - filtrar solo los de la ubicación seleccionada
        if (productsData) {
          const products = productsData as App.Entities.Product[];
          const expandedProducts: ProductListItem[] = [];

          products.forEach((product: App.Entities.Product) => {
            // Buscar stock en la ubicación específica
            const locationStock = product.locations?.find(
              (loc: { id: number; pivot?: { current_stock: number } }) =>
                loc.id === locationId,
            );

            if (!locationStock || !locationStock.pivot?.current_stock) {
              // Si no hay stock en esta ubicación, no mostrar el producto
              return;
            }

            const currentStock = locationStock.pivot.current_stock;

            // Obtener unidades disponibles para este producto
            const availableUnits = product.unit?.unit_type
              ? unitsData[product.unit.unit_type as unitType] || []
              : [];

            // Agregar el producto base
            expandedProducts.push({
              price: parseFloat(
                product.purchase_price || product.sale_price || "0",
              ).toFixed(2), // Usar precio de compra como costo
              unit_id: product.unit_id || 0,
              unit_type: product.unit?.unit_type || null,
              code: product.code || "",
              id: `product_${product.id}`,
              name: product.name,
              current_stock: currentStock,
              category_id: product.category_id || undefined,
              main_image: product.main_image,
              available_units: availableUnits,
              is_package: false,
            });

            // Agregar cada paquete como un producto separado
            product.active_packages?.forEach((pkg) => {
              const stockInPackages = Math.floor(
                currentStock / pkg.quantity_per_package,
              );

              if (stockInPackages > 0) {
                expandedProducts.push({
                  price: parseFloat(
                    pkg.purchase_price || pkg.sale_price || "0",
                  ).toFixed(2),
                  unit_id: product.unit?.id || 0,
                  unit_type: product.unit?.unit_type || null,
                  code: pkg.barcode,
                  id: `package_${pkg.id}`,
                  name: `${product.name} - ${pkg.package_name}`,
                  current_stock: stockInPackages,
                  category_id: product.category_id || undefined,
                  main_image: product.main_image,
                  package_id: pkg.id,
                  base_product_id: product.id,
                  quantity_per_package: pkg.quantity_per_package,
                  is_package: true,
                  available_units: [],
                });
              }
            });
          });

          setProducts(expandedProducts);
        }
      }
    } catch (error) {
      console.error("Error loading transfer data:", error);
      alerts.error("Error al cargar productos de la ubicación");
    } finally {
      setLoading(false);
    }
  };

  // Calcular stock total usado para un producto base (en unidades base)
  const calculateUsedStock = (baseProductId: number) => {
    let totalUsed = 0;

    Object.entries(selectedProducts).forEach(([key, item]) => {
      if (item.product_id === baseProductId) {
        const productData = products.find((p) => p.id === key);
        if (productData?.is_package && productData.quantity_per_package) {
          totalUsed += item.quantity * Number(productData.quantity_per_package);
        } else {
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

  const getUnitCost = (
    productData: ProductListItem | undefined,
    unitId: number,
    fallback = 0,
  ) => {
    if (!productData) return fallback;

    const basePrice = Number(productData.price || fallback || 0);
    if (productData.is_package) return basePrice;

    const selectedUnit = productData.available_units?.find(
      (u) => u.id === unitId,
    );
    const factorToBase = Number(selectedUnit?.factor_to_base || 1);
    return basePrice * factorToBase;
  };

  const handleAddProduct = (product: ProductListItem, unitId: number) => {
    if (!fromLocationId) {
      alerts.error("Primero selecciona la ubicación de origen");
      return;
    }

    const productId = product.id;
    const numericProductId = product.is_package
      ? product.base_product_id!
      : parseInt(productId.toString().replace("product_", ""));

    const baseProduct = products.find(
      (p) => p.id === `product_${numericProductId}`,
    );
    const availableStock = Number(baseProduct?.current_stock || 0);

    const finalUnitId = product.is_package ? baseProduct?.unit_id || 0 : unitId;

    const usedStock = calculateUsedStock(numericProductId);

    let requiredStock = 1;
    if (product.is_package && product.quantity_per_package) {
      requiredStock = Number(product.quantity_per_package);
    } else {
      const selectedUnit = baseProduct?.available_units?.find(
        (u) => u.id === finalUnitId,
      );
      const factorToBase = Number(selectedUnit?.factor_to_base || 1);
      requiredStock = factorToBase;
    }

    if (usedStock + requiredStock > availableStock) {
      const productBaseUnit = baseProduct?.available_units?.find(
        (u) => u.id === baseProduct.unit_id,
      );
      const remaining = availableStock - usedStock;
      alerts.error(
        `Stock insuficiente en ubicación de origen. Disponible: ${availableStock.toFixed(3)} ${productBaseUnit?.abbreviation || ""}, En carrito: ${usedStock.toFixed(3)} ${productBaseUnit?.abbreviation || ""}, Restante: ${remaining.toFixed(3)} ${productBaseUnit?.abbreviation || ""}`,
      );
      return;
    }

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
      price: getUnitCost(product, finalUnitId, Number(product.price)),
      unit_cost: getUnitCost(product, finalUnitId, Number(product.price)),
    };

    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: newProduct,
    }));

    alerts.success("Producto agregado a la solicitud");
  };

  const handleRemoveProduct = (productId: number | string) => {
    setSelectedProducts((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });

    alerts.success("Producto eliminado de la solicitud");
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
            `Stock insuficiente. Disponible: ${availableStock.toFixed(3)} ${productBaseUnit?.abbreviation || ""}, Restante: ${remaining.toFixed(3)} ${productBaseUnit?.abbreviation || ""}`,
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
          alerts.success("Producto eliminado de la solicitud");
        }
      } else if (action === "unit" && data) {
        const unitId =
          typeof data === "object" && data !== null
            ? Number(data.unit_id)
            : Number(data);

        if (!unitId) {
          return prev;
        }

        const productData = products.find((p) => p.id === productId);
        const baseProduct = products.find(
          (p) => p.id === `product_${product.product_id}`,
        );
        const newUnit = productData?.available_units?.find(
          (u) => u.id === unitId,
        );

        if (newUnit) {
          const availableStock = Number(baseProduct?.current_stock || 0);

          // Stock usado por el mismo producto base, excluyendo la línea actual
          let usedStockExcludingCurrent = 0;
          Object.entries(prev).forEach(([key, selectedItem]) => {
            if (
              selectedItem.product_id !== product.product_id ||
              key === String(productId)
            ) {
              return;
            }

            const selectedProductData = products.find((p) => p.id === key);
            if (
              selectedProductData?.is_package &&
              selectedProductData.quantity_per_package
            ) {
              usedStockExcludingCurrent +=
                selectedItem.quantity *
                Number(selectedProductData.quantity_per_package);
              return;
            }

            const selectedUnitData = selectedProductData?.available_units?.find(
              (u) => u.id === selectedItem.unit_id,
            );
            const factorToBase = Number(selectedUnitData?.factor_to_base || 1);
            usedStockExcludingCurrent += selectedItem.quantity * factorToBase;
          });

          const newFactorToBase = Number(newUnit.factor_to_base || 1);
          const requiredStockForCurrentLine =
            product.quantity * newFactorToBase;

          if (
            usedStockExcludingCurrent + requiredStockForCurrentLine >
            availableStock
          ) {
            const productBaseUnit = baseProduct?.available_units?.find(
              (u) => u.id === baseProduct?.unit_id,
            );
            const remaining = availableStock - usedStockExcludingCurrent;

            alerts.error(
              `No se puede cambiar unidad. Stock disponible: ${availableStock.toFixed(3)} ${productBaseUnit?.abbreviation || ""}, ya usado: ${usedStockExcludingCurrent.toFixed(3)} ${productBaseUnit?.abbreviation || ""}, restante: ${remaining.toFixed(3)} ${productBaseUnit?.abbreviation || ""}`,
            );
            return prev;
          }

          updated[productId] = {
            ...product,
            unit_id: unitId,
            unit_cost: getUnitCost(productData, unitId, product.unit_cost),
            price: getUnitCost(productData, unitId, product.price),
          };
        }
      }

      return updated;
    });
  };

  const clearCart = () => {
    setSelectedProducts({});
    alerts.success("Carrito limpiado");
  };

  const setFromLocation = (locationId: number | null) => {
    setFromLocationId(locationId);
    // Limpiar carrito al cambiar ubicación
    setSelectedProducts({});
  };

  const setToLocation = (locationId: number | null) => {
    setToLocationId(locationId);
  };

  const confirmTransfer = async (data?: { notes?: string }) => {
    if (!fromLocationId || !toLocationId) {
      alerts.error("Debes seleccionar ubicación de origen y destino");
      return;
    }

    if (fromLocationId === toLocationId) {
      alerts.error("Las ubicaciones de origen y destino deben ser diferentes");
      return;
    }

    const items = Object.values(selectedProducts);
    if (items.length === 0) {
      alerts.error("Debes agregar al menos un producto");
      return;
    }

    try {
      // Preparar los detalles de la transferencia
      const details = items.map((item) => {
        const productData = products.find((p) => p.id === item.id);

        return {
          product_id: item.product_id,
          package_id: item.package_id || null,
          unit_id: item.unit_id,
          quantity_requested: item.quantity,
          unit_cost: item.unit_cost,
          notes: null,
        };
      });

      const transferData = {
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        notes: data?.notes || null,
        details: details,
      };

      // Crear la transferencia
      await transferService.store(transferData);

      alerts.success("Solicitud de transferencia creada exitosamente");

      // Limpiar el formulario
      setSelectedProducts({});
      setFromLocationId(null);
      setToLocationId(null);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Error al crear la transferencia";
      alerts.error(errorMessage);
      throw error;
    }
  };

  // Convertir selectedProducts a cartItems para el componente Cart
  const cartItems = useMemo(() => {
    return Object.values(selectedProducts).map((item) => {
      const productData = products.find((p) => p.id === item.id);
      return {
        ...item,
        name: productData?.name || "",
        code: productData?.code || "",
        main_image: productData?.main_image,
        is_package: productData?.is_package || false,
        unit: productData?.available_units?.find((u) => u.id === item.unit_id),
        available_units: productData?.available_units || [],
      };
    });
  }, [selectedProducts, products]);

  const value: TransferContextType = {
    products,
    units,
    categories,
    groupedUnits,
    loading,
    selectedProducts,
    cartItems,
    fromLocationId,
    toLocationId,
    loadProductsByLocation,
    handleAddProduct,
    handleRemoveProduct,
    handleItemChange,
    clearCart,
    setFromLocation,
    setToLocation,
    confirmTransfer,
  };

  return (
    <TransferContext.Provider value={value}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransferContext() {
  const context = useContext(TransferContext);
  if (!context) {
    throw new Error(
      "useTransferContext must be used within a TransferProvider",
    );
  }
  return context;
}
