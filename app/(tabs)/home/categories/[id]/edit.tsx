import { useLocalSearchParams } from "expo-router";
import CategoriesForm from "../form";

export default function EditCategoryScreen() {
  const params = useLocalSearchParams();
  const categoryId = parseInt(params.id as string);

  return <CategoriesForm id={categoryId} />;
}
