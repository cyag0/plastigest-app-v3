/**
 * Detalle de una unidad: nombre, abreviatura, de dónde es y a cuánto
 * equivale ("1 dz = 12 pz", "1,000 g = 1 kg"). Antes era el formulario en
 * solo lectura: «Nombre *», «¿Es una unidad de conversión? No» (la API nunca
 * lo dice) y el tipo, sin la equivalencia.
 */

import CatalogDetail, { DetailHint } from "@/components/Administration/Catalogs/CatalogDetail";
import {
  baseUnitOf,
  equivalenceText,
  unitTypeName,
  useUnitsCatalog,
  type UnitRecord,
} from "@/components/Administration/Catalogs/units";
import IconLabel from "@/components/App/IconLabel";
import { LIST_TEXT_INSET, ListGroup, ListSection, ListValueRow } from "@/components/App/ListGroup";
import { useCan } from "@/hooks/useCan";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React from "react";

const BASE = "/(tabs)/administration/unidades";

export default function UnidadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useCan();
  const units = useUnitsCatalog();
  // Las del sistema las comparten todas las empresas: solo las cambia un
  // administrador del sistema (el backend responde 403).
  const canChange = (unit: UnitRecord) => unit.company_id != null || can("system_admin");

  return (
    <CatalogDetail<UnitRecord>
      id={Number(id)}
      service={Services.home.unidades}
      permissionPrefix="units"
      canChange={canChange}
      editHref={(unit) => `${BASE}/${unit.id}/edit`}
      listHref={BASE}
      texts={{
        notFound: "No se encontró la unidad",
        loadError: "No se pudo cargar la unidad",
        deleteLabel: "Eliminar unidad",
        // Lo mismo que revisa el backend antes de eliminar.
        deleteMessage: "Se elimina y no se puede deshacer. Si algún producto la usa, no se puede eliminar.",
        deleted: "Unidad eliminada",
      }}
      header={(unit) => {
        const system = unit.company_id == null;
        return {
          title: unit.name,
          subtitle: unit.abbreviation,
          badges: [
            <IconLabel
              key="origin"
              icon={system ? "earth" : "domain"}
              label={system ? "Del sistema" : "De la empresa"}
            />,
          ],
          hint: system
            ? canChange(unit)
              ? "La comparten todas las empresas: un cambio les afecta a todas."
              : "La comparten todas las empresas; solo un administrador del sistema la cambia."
            : null,
        };
      }}
    >
      {(unit) => {
        const base = baseUnitOf(unit.unit_type, units);
        const text = equivalenceText(unit, base);
        const isBase = units.length > 0 && !text;
        return (
          <ListSection title="Equivalencia">
            <ListGroup inset={LIST_TEXT_INSET}>
              <ListValueRow label="Tipo" value={unitTypeName(unit.unit_type)} />
              {units.length > 0 && (
                <ListValueRow label="Conversión" value={text ?? "Es la unidad base"} />
              )}
            </ListGroup>
            {isBase && (
              <DetailHint>
                Las demás unidades de {unitTypeName(unit.unit_type).toLowerCase()} se convierten a ella.
              </DetailHint>
            )}
          </ListSection>
        );
      }}
    </CatalogDetail>
  );
}
