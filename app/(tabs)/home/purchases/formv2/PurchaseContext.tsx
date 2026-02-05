import { AppFormRef } from "@/components/Form/AppForm/AppForm";
import {
  ProductCategory,
  ProductListItem,
} from "@/components/Views/POSV3/components";
import { Unit } from "@/components/Views/POSV3/components/ListProducts";
import { useAlerts } from "@/hooks/useAlerts";
import { useDebounce } from "@/hooks/useDebounce";
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

interface PurchaseContextType {
  // Data
  products: ProductListItem[];
  units: Unit[];
  categories: ProductCategory[];
  groupedUnits: GroupedUnits;
  loading: boolean;
  selectedProducts: SelectedProducts;
  cartItems: any[]; // CartItemData[]
  currentPurchaseId: number | null;
  supplierId: number | null;

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
  setSupplier: (supplierId: number | null) => void;
  confirmPurchase: (data?: {
    expected_delivery_date?: string;
    document_number?: string;
  }) => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(
  undefined,
);

interface PurchaseProviderProps {
  children: React.ReactNode;
}

export function PurchaseProvider({ children }: PurchaseProviderProps) {
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

  const [currentPurchaseId, setCurrentPurchaseId] = useState<number | null>(
    null,
  );
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const alerts = useAlerts();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const res = await loadDraft();

    loadData(res.supplier_id);
  }

  const loadData = async (supplier_id?: number | null) => {
    try {
      setLoading(true);

      // Cargar productos excluyendo los de tipo 'processed' (producción)
      // y trayendo sus paquetes disponibles
      const productsResponse = await Services.products.index({
        product_type: ["raw_material", "commercial"],
        is_active: "1",
        supplier_id: supplier_id || 0,
      });

      // Cargar unidades y organizarlas por tipo
      const unitsResponse = await Services.home.unidades.getGroupedByType();

      const categoriesResponse = await Services.categories.index();

      if (
        categoriesResponse &&
        "data" in categoriesResponse &&
        categoriesResponse.data
      ) {
        const categoriesData = Array.isArray(categoriesResponse.data)
          ? categoriesResponse.data
          : (categoriesResponse.data as any).data || [];

        const categories: ProductCategory[] = categoriesData.map(
          (cat: any) => ({
            id: cat.id,
            name: cat.name,
          }),
        );

        setCategories(categories);
      }

      if (
        productsResponse &&
        "data" in productsResponse &&
        productsResponse.data
      ) {
        const productsData = Array.isArray(productsResponse.data)
          ? productsResponse.data
          : (productsResponse.data as any).data || [];

        const products = productsData as App.Entities.Product[];
        const expandedProducts: ProductListItem[] = [];

        products.forEach((product: App.Entities.Product) => {
          // Obtener unidades disponibles para este producto
          const availableUnits = product.unit?.unit_type
            ? unitsResponse.data[product.unit.unit_type as unitType] || []
            : [];

          // Agregar el producto base
          expandedProducts.push({
            price: parseFloat(product.purchase_price || "0").toFixed(2),
            unit_id: product.unit_id || 0,
            unit_type: product.unit?.unit_type || null,
            code: product.code || "",
            id: `product_${product.id}`,
            name: product.name,
            current_stock: product.current_stock || undefined,
            category_id: product.category_id || undefined,
            main_image: product.main_image,
            available_units: availableUnits,
            is_package: false,
          });

          // Agregar cada paquete como un producto separado
          product.active_packages?.forEach((pkg) => {
            expandedProducts.push({
              price: parseFloat(pkg.purchase_price || "0").toFixed(2),
              unit_id: product.unit?.id || 0,
              unit_type: product.unit?.unit_type || null,
              code: pkg.barcode,
              id: `package_${pkg.id}`,
              name: `${product.name} - ${pkg.package_name}`,
              current_stock: product.current_stock
                ? Math.floor(product.current_stock / pkg.quantity_per_package)
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

      if (unitsResponse.data) {
        setGroupedUnits(unitsResponse.data);
        const allUnits = Object.values(unitsResponse.data).flat();
        setUnits(allUnits as Unit[]);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDraft = async () => {
    try {
      const response = await Services.purchasesV2.getDraft();
      if (response.data) {
        setCurrentPurchaseId(response.data.id);
        setSupplierId(response.data.supplier_id);

        // Convertir detalles a selectedProducts
        const loadedProducts: SelectedProducts = {};
        response.data.details?.forEach(
          (detail: App.Entities.PurchaseDetailV2) => {
            const itemId = detail.package_id
              ? `package_${detail.package_id}`
              : `product_${detail.product_id}`;

            loadedProducts[itemId] = {
              id: itemId,
              product_id: detail.product_id,
              package_id: detail.package_id,
              quantity: parseFloat(detail.quantity),
              unit_id: detail.unit_id,
              price: parseFloat(detail.unit_price),
              detail_id: detail.id,
            };
          },
        );

        setSelectedProducts(loadedProducts);

        // Cargar datos del formulario usando formRef
        if (formRef?.current) {
          formRef.current.setValues({
            supplier_id: response.data.supplier_id?.toString() || "",
            purchase_date:
              response.data.purchase_date ||
              new Date().toISOString().split("T")[0],
            notes: response.data.notes || "",
            document_number: response.data.document_number || "",
          });
        }
      }

      return {
        supplier_id: response.data?.supplier_id || null,
      };
    } catch (error) {
      console.error("Error cargando draft:", error);
      return { supplier_id: null };
    }
  };

  const handleAddProduct = async (product: ProductListItem, unitId: number) => {
    const defaultUnit = product.available_units?.[0];
    if (!defaultUnit && !product.is_package) return;

    const selectedUnit =
      product.available_units?.find((u) => u.id === unitId) || defaultUnit;
    const basePrice = parseFloat(product.price.toString());

    // Calcular precio según la unidad seleccionada
    const calculatedPrice =
      selectedUnit?.is_base_unit || !selectedUnit?.factor_to_base
        ? basePrice
        : basePrice * selectedUnit.factor_to_base;

    // Determinar product_id y package_id según si es paquete o producto base
    let productId: number;
    let packageId: number | undefined;

    if (product.is_package) {
      // Para paquetes: product_id es base_product_id, package_id es el ID del paquete
      productId = (product as any).base_product_id;
      packageId = (product as any).package_id;
    } else {
      // Para productos base: product_id es el ID del producto, package_id es undefined
      const productIdStr = product.id.toString();
      productId = parseInt(productIdStr.replace(/^product_/, ""));
      packageId = undefined;
    }

    try {
      const response = await Services.purchasesV2.addDetail({
        purchase_id: currentPurchaseId || undefined,
        supplier_id: supplierId || undefined,
        product_id: productId,
        package_id: packageId,
        quantity: 1,
        unit_id: product.is_package
          ? product.unit_id
          : unitId || defaultUnit?.id || 0,
        price: calculatedPrice,
      });

      if (response.success) {
        setSelectedProducts((prev) => ({
          ...prev,
          [product.id]: {
            id: product.id,
            product_id: productId,
            quantity: 1,
            unit_id: unitId || defaultUnit?.id || 0,
            price: calculatedPrice,
            package_id: packageId,
            detail_id: response.data.detail_id,
          },
        }));
        alerts.success("Producto agregado");
      }
    } catch (error) {
      console.error("Error agregando producto:", error);
      alerts.error("Error al agregar producto");
    }
  };

  const handleRemoveProduct = async (productId: number | string) => {
    const product = selectedProducts[productId];
    if (!product?.detail_id) {
      // Si no tiene detail_id, solo eliminar localmente
      setSelectedProducts((prev) => {
        const { [productId]: removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    try {
      const response = await Services.purchasesV2.removeDetail(
        product.detail_id,
      );
      if (response.success) {
        setSelectedProducts((prev) => {
          const { [productId]: removed, ...rest } = prev;
          return rest;
        });
        alerts.success("Producto eliminado");
      }
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alerts.error("Error al eliminar producto");
    }
  };

  // Debounce para actualizar detalles
  const { run: debouncedUpdateDetail } = useDebounce(
    async (detailId: number, data: any) => {
      try {
        console.log("Updating detail debounced:", detailId, data);

        const response = await Services.purchasesV2.updateDetail(
          detailId,
          data,
        );
        if (response.success) {
          alerts.success("Actualizado");
        }
      } catch (error) {
        console.error("Error actualizando detalle:", error);
        alerts.error("Error al actualizar");
      }
    },
    { time: 500 },
  );

  const handleItemChange = async (
    productId: number | string,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => {
    const current = selectedProducts[productId];
    if (!current) return;

    console.log("current", current);

    let updateData: any = {};
    let newQuantity: number;
    let newSelectedProducts = { ...selectedProducts };

    switch (action) {
      case "increment":
        newQuantity = current.quantity + 1;
        newSelectedProducts[productId] = {
          ...current,
          quantity: newQuantity,
        };
        updateData = { quantity: newQuantity };
        break;

      case "decrement":
        if (current.quantity <= 1) {
          handleRemoveProduct(productId);
          return;
        }
        newQuantity = current.quantity - 1;
        newSelectedProducts[productId] = {
          ...current,
          quantity: newQuantity,
        };
        updateData = { quantity: newQuantity };
        break;

      case "unit":
        const unitId = typeof data === "number" ? data : (data as Unit)?.id;

        // Buscar el producto y la unidad para calcular el nuevo precio
        const product = products.find(
          (p) => p.id.toString() === productId.toString(),
        );
        const newUnit = product?.available_units?.find((u) => u.id === unitId);
        const basePrice = parseFloat(product?.price?.toString() || "0");

        // Calcular precio según la nueva unidad
        const newPrice =
          newUnit?.is_base_unit || !newUnit?.factor_to_base
            ? basePrice
            : basePrice * newUnit.factor_to_base;

        newSelectedProducts[productId] = {
          ...current,
          unit_id: unitId,
          price: newPrice,
        };
        updateData = { unit_id: unitId, price: newPrice };
        break;

      default:
        return;
    }

    setSelectedProducts(newSelectedProducts);

    // Actualizar en backend con debounce
    if (current.detail_id) {
      console.log("Updating detail:", current.detail_id, updateData);

      debouncedUpdateDetail(current.detail_id, updateData);
    }
  };

  const clearCart = async () => {
    setSelectedProducts({});
    setCurrentPurchaseId(null);
    setSupplierId(null);
  };

  const setSupplier = (id: number | null) => {
    setSupplierId(id);
  };

  const confirmPurchase = async (data?: {
    expected_delivery_date?: string;
    document_number?: string;
  }) => {
    if (!currentPurchaseId) {
      throw new Error("No hay compra para confirmar");
    }

    try {
      await Services.purchasesV2.confirm(currentPurchaseId, data);
      clearCart();
    } catch (error) {
      console.error("Error confirmando compra:", error);
      throw error;
    }
  };

  // Convertir selectedProducts a formato de CartItemData con indexación optimizada
  const cartItems = useMemo(() => {
    // Crear un Map para búsquedas O(1)
    const productsMap = new Map(products.map((p) => [p.id.toString(), p]));

    return Object.entries(selectedProducts).map(([productId, item]) => {
      const product = productsMap.get(productId);
      const selectedUnit = product?.available_units?.find(
        (u) => u.id === item.unit_id,
      );

      return {
        id: item.product_id,
        product_id: item.product_id,
        code: product?.code || "",
        name: product?.name || "",
        price: item.price,
        quantity: item.quantity,
        total: item.quantity * item.price,
        unit_id: item.unit_id,
        unit_name: selectedUnit?.name,
        unit_abbreviation: selectedUnit?.abbreviation,
        main_image: product?.main_image,
        available_units: product?.available_units?.map((u) => ({
          id: u.id,
          name: u.name,
          abbreviation: u.abbreviation,
          price: item.price,
        })),
      };
    });
  }, [selectedProducts, products]);

  const value = useMemo(
    () => ({
      products,
      units,
      categories,
      groupedUnits,
      loading,
      selectedProducts,
      cartItems,
      currentPurchaseId,
      supplierId,
      loadData,
      handleAddProduct,
      handleRemoveProduct,
      handleItemChange,
      clearCart,
      setSupplier,
      confirmPurchase,
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
      currentPurchaseId,
      supplierId,
    ],
  );

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchase() {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error("usePurchase must be used within a PurchaseProvider");
  }
  return context;
}
