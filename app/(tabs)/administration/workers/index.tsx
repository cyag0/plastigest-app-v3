import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import FilterModal from "@/components/Feedback/Modal/FilterModal";
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
          description: `${item.department || "Sin departamento"} • ${
            item.company_name || "Sin empresa"
          }`,
          bottomText:
            item.roles && item.roles.length > 0
              ? `Roles: ${item.roles.map((role: any) => role.name).join(", ")}`
              : undefined,
        })}
        onItemPress={(entity) => {
          navigation.push(`/(tabs)/administration/workers/${entity.id}` as any);
        }}
        onPressCreate={() => {
          navigation.push("/(tabs)/administration/workers/form" as any);
        }}
        searchPlaceholder="Buscar trabajadores..."
      />

      <FilterModal ref={modalRef} />
    </>
  );
}
