import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Modal/AppModal";
import FilterModal from "@/components/Modal/FilterModal";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";

export default function WorkerIndexScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  return (
    <>
      <AppList
        title="Trabajadores"
        service={Services.admin.workers}
        renderCard={({ item }) => ({
          title: item.user_name || "Sin nombre",
          subtitle: item.position || "Sin cargo asignado",
          description: `${item.department || "Sin departamento"} • ${
            item.company_name || "Sin empresa"
          }`,
          badge: item.is_active ? "Activo" : "Inactivo",
          badgeColor: item.is_active ? "#4caf50" : "#f44336",
          rightText: item.salary
            ? `$${parseFloat(item.salary).toLocaleString()}`
            : undefined,
          bottomText:
            item.roles && item.roles.length > 0
              ? `Roles: ${item.roles.map((role: any) => role.name).join(", ")}`
              : undefined,
        })}
        onItemPress={(entity) => {
          navigation.push(`/(tabs)/home/workers/${entity.id}` as any);
        }}
        onPressCreate={() => {
          navigation.push("/(tabs)/home/workers/form" as any);
        }}
        searchPlaceholder="Buscar trabajadores..."
      />

      <FilterModal ref={modalRef} />
    </>
  );
}
