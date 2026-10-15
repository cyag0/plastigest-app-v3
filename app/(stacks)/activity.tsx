import ActivityTimeline from "@/components/Activity/ActivityTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";

/**
 * Bitácora. Sin parámetros: "Mi actividad". Con ?user_id=12&name=Ana: la de
 * ese usuario. Con ?user_id=all: la de toda la empresa. Con &scope=location:
 * solo lo ocurrido en la sucursal actual.
 */
export default function ActivityScreen() {
  const { user_id, name, scope } = useLocalSearchParams<{ user_id?: string; name?: string; scope?: string }>();
  const navigation = useNavigation();
  const { location } = useAuth();

  const userId: number | "me" | "all" =
    user_id === "all" ? "all" : user_id && !Number.isNaN(Number(user_id)) ? Number(user_id) : "me";
  const branchOnly = scope === "location";

  const title =
    userId === "all"
      ? branchOnly
        ? `Bitácora · ${location?.name ?? "sucursal"}`
        : "Bitácora"
      : userId === "me"
        ? "Mi actividad"
        : `Actividad de ${name ?? "usuario"}`;

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return <ActivityTimeline userId={userId} title={title} scope={branchOnly ? "location" : undefined} />;
}
