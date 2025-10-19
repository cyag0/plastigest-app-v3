import { useLocalSearchParams } from "expo-router";
import React from "react";
import ProductsForm from "../form";

export default function EditProduct() {
  const { id } = useLocalSearchParams();

  return <ProductsForm id={parseInt(id as string)} />;
}
