import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import React, { createContext, ReactNode, useContext } from "react";

const SalesContext = createContext<SalesContextProps | undefined>(undefined);

interface SalesContextProps {
  categories: App.Entities.Category[];
  setCategories: React.Dispatch<React.SetStateAction<App.Entities.Category[]>>;
  selectedCategories: number[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<number[]>>;
  productsByCategory: Record<number, App.Entities.Product[]>;
  products: App.Entities.Product[];
  loading: boolean;
  categoriesIds: number[];
}

export const SalesProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = React.useState<App.Entities.Category[]>(
    []
  );
  const [selectedCategories, setSelectedCategories] = React.useState<number[]>(
    []
  );
  const [productsByCategory, setProductsByCategory] = React.useState<
    Record<number, App.Entities.Product[]>
  >({});
  const [products, setProducts] = React.useState<App.Entities.Product[]>([]);

  const [loading, setLoading] = React.useState<boolean>(false);

  useAsync(async () => {
    setLoading(true);
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        Services.categories.index({
          all: true,
        }),
        Services.products.index({
          all: true,
        }),
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
      const groupedProducts: Record<number, App.Entities.Product[]> = {};
      (productsData || []).forEach((product) => {
        const catId =
          // @ts-ignore - soportar distintas formas de modelo
          product.category_id ?? // id directo
          // @ts-ignore
          product.category?.id ?? // relación anidada
          -1; // fallback si no tiene categoría
        if (!groupedProducts[catId]) groupedProducts[catId] = [];
        groupedProducts[catId].push(product);
      });

      const productsDataByCategory = groupedProducts;
      setCategories(categoriesData || []);
      setProductsByCategory(productsDataByCategory || {});
      setProducts(productsData || []);
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

  const value = {
    categories,
    setCategories,
    selectedCategories,
    setSelectedCategories,
    productsByCategory,
    loading,
    categoriesIds,
    products,
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
