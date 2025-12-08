import { useLocalSearchParams } from "expo-router";
import CurrentWorkerForm from "../form";

export default function CurrentWorkerDetailScreen() {
  const params = useLocalSearchParams();

  return <CurrentWorkerForm readonly id={Number(params.id)} />;
}
