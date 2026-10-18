import { useLocalSearchParams } from "expo-router";
import React from "react";
import CategoriesForm from "../form";

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CategoriesForm id={parseInt(id, 10)} />;
}
