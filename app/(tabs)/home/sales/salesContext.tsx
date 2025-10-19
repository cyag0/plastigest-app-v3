import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import React, { createContext, ReactNode, useContext } from "react";

const SalesContext = createContext<SalesContextProps | undefined>(undefined);

interface SalesContextProps {
  categories: App.Entities.Category[];
  setCategories: React.Dispatch<React.SetStateAction<App.Entities.Category[]>>;
}

export const SalesProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = React.useState<App.Entities.Category[]>(
    []
  );

  useAsync(async () => {
    try {
      const [categoriesRes] = await Promise.all([
        Services.categories.index({
          all: true,
        }),
      ]);

      setCategories((categoriesRes.data.data as App.Entities.Category[]) || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  });

  const value = { categories, setCategories };

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
