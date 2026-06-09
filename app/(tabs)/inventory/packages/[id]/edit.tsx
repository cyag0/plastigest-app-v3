import { useLocalSearchParams } from "expo-router";
import PackagesForm from "../form";

export default function EditPackageScreen() {
  const params = useLocalSearchParams();
  const packageId = parseInt(params.id as string);

  return <PackagesForm id={packageId} />;
}
