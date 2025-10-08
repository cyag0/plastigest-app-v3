import AppList from "@/components/App/AppList/AppList";
import { AppModalRef } from "@/components/Modal/AppModal";
import FilterModal from "@/components/Modal/FilterModal";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import * as React from "react";

export default function UserIndexScreen() {
  const navigation = useRouter();
  const modalRef = React.useRef<AppModalRef>(null);

  return (
    <>
      <AppList
        title="Users"
        service={Services.admin.roles}
        renderCard={({ item }) => ({})}
        onItemPress={(entity) => {
          navigation.push("/(tabs)/home/users/form");
        }}
        onPressCreate={() => {
          /* console.log("hola");
          modalRef.current?.show(); */

          navigation.push("/(tabs)/home/roles/form");
        }}
        searchPlaceholder="Buscar roles..."
      />

      <FilterModal ref={modalRef} />
    </>
  );
}
