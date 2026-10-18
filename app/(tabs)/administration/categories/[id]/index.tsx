/**
 * Detalle de una categoría: el nombre, si está activa y para qué es. Antes
 * era el formulario en solo lectura, con «Empresa» y «Categoría Activa: Sí».
 */

import CatalogDetail, { DetailHint, DetailText } from "@/components/Administration/Catalogs/CatalogDetail";
import { ListSection } from "@/components/App/ListGroup";
import StatusBadge from "@/components/App/StatusBadge";
import { activeStatus } from "@/constants/statuses";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React from "react";

const BASE = "/(tabs)/administration/categories";

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <CatalogDetail<App.Entities.Category>
      id={Number(id)}
      service={Services.categories}
      permissionPrefix="categories"
      editHref={(category) => `${BASE}/${category.id}/edit`}
      listHref={BASE}
      texts={{
        notFound: "No se encontró la categoría",
        loadError: "No se pudo cargar la categoría",
        deleteLabel: "Eliminar categoría",
        // Lo mismo que revisa el backend antes de eliminar.
        deleteMessage:
          "Se elimina y no se puede deshacer. Si tiene productos, no se puede eliminar: muévelos a otra categoría o desactívala desde Editar.",
        deleted: "Categoría eliminada",
      }}
      header={(category) => ({
        title: category.name,
        badges: [<StatusBadge key="active" {...activeStatus(category.is_active !== false, true)} />],
      })}
    >
      {(category) => (
        <ListSection title="Descripción">
          {category.description?.trim() ? (
            <DetailText>{category.description.trim()}</DetailText>
          ) : (
            <DetailHint>Sin descripción.</DetailHint>
          )}
        </ListSection>
      )}
    </CatalogDetail>
  );
}
