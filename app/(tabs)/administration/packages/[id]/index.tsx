import { useLocalSearchParams } from "expo-router";
import React from "react";
import PackagesForm from "../form";

export default function PackageDetailScreen() {
  const params = useLocalSearchParams();
  const packageId = parseInt(params.id as string);

  return <PackagesForm id={packageId} readonly />;
}
