import UserDetailScreen from "@/components/Administration/Users/UserDetailScreen";
import { useLocalSearchParams } from "expo-router";

export default function CompanyUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <UserDetailScreen id={Number(id)} scope="company" />;
}
