import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";

export default function CategoriesIndex() {
  const router = useRouter();

  return (
    <>
      <AppList
        title="Categorías"
        service={Services.categories}
        renderCard={({ item }: { item: any }) => ({
          title: item.name,
          description: (
            <AppList.Description>
              {item.description || "Sin descripción"}
            </AppList.Description>
          ),
          right: (
            <AppList.Description
              style={{
                fontWeight: "bold",
                color: item.is_active ? palette.success : palette.red,
              }}
            >
              {item.is_active ? "Activo" : "Inactiva"}
            </AppList.Description>
          ),
          bottom: [
            {
              label: "Creado el",
              value: item.created_at || 0,
            },
          ],
        })}
        onPressCreate={() => {
          router.push("/(tabs)/administration/categories/form" as any);
        }}
        menu={{
          onEdit(item) {
            router.push(
              `/(tabs)/administration/categories/${item.id}/edit` as any
            );
          },
        }}
        onItemPress={(item) => {
          router.push(`/(tabs)/administration/categories/${item.id}` as any);
        }}
      />
    </>
  );
}
