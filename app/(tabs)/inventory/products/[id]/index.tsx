import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import ProductsForm from "../form";

export default function ProductDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string;

  return <ProductsForm id={parseInt(productId)} readonly />;
}
