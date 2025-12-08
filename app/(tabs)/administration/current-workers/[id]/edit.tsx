import { useLocalSearchParams } from "expo-router";
import CurrentWorkerForm from "../form";

export default function CurrentWorkerEditScreen() {
  const params = useLocalSearchParams();
  const { id } = params;

  return <CurrentWorkerForm id={parseInt(id as string)} readonly={false} />;
}
