import { useLocalSearchParams } from "expo-router";
import React from "react";
import CategoriesForm from "../form";

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams();
  const categoryId = parseInt(params.id as string);

  return <CategoriesForm id={categoryId} readonly />;
}
