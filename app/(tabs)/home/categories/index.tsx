import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";

export default function CategoriesIndex() {
  const router = useRouter();

  useAsync(async () => {
    console.log("Loading categories...");

    const response = await Services.categories.index({
      all: true,
    });

    console.log("Categories loaded:", response.data);
  });

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
        onItemPress={(entity: any) => {
          router.push(`/(tabs)/home/categories/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/home/categories/form" as any);
        }}
        fabLabel="Nueva Categoría"
      />
    </>
  );
}
