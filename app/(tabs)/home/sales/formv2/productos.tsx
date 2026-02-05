import ListProducts from "@/components/Views/POSV3/components/ListProducts";
import React from "react";
import { useSale } from "./SaleContext";

export default function ProductosScreen() {
  const saleContext = useSale();

  return (
    <ListProducts
      products={saleContext.products}
      categories={saleContext.categories}
      groupedUnits={saleContext.groupedUnits}
      onAddProduct={saleContext.handleAddProduct}
      loading={saleContext.loading}
    />
  );
}
