import UserFormShared from "@/components/screens/UserFormShared";
import { useLocalSearchParams } from "expo-router";

export default function BranchUserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <UserFormShared id={Number(id)} mode="location" />;
}
