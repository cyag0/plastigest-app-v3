/**
 * Alta y edición de una unidad: nombre y abreviatura, y a cuánto equivale.
 *
 * Casi toda unidad nueva equivale a otra (una caja de 12 piezas, un costal de
 * 25 kg), así que eso es lo primero que se pregunta: la cantidad y la unidad,
 * con la equivalencia escrita debajo ("1 cj = 12 pz"). Apagándolo se elige
 * solo el tipo de medida. Antes la casilla «¿Es una unidad de conversión?»
 * venía apagada y con «Cantidad (piezas)» ya elegido: una caja se guardaba
 * como 1 pieza sin que nadie lo notara.
 *
 * Al editar se ve la equivalencia de hoy (la API no regresa de qué unidad se
 * creó) y «Cambiar la equivalencia» pide la nueva. El tipo ya no se ofrece:
 * el backend no lo cambia al editar.
 */

import FormValueWatcher from "@/components/Administration/FormValueWatcher";
import { useLeaveScreen } from "@/components/Administration/Catalogs/useLeaveScreen";
import {
  baseUnitOf,
  equivalenceText,
  formatFactor,
  UNIT_TYPES,
  unitFactor,
  unitTypeName,
  useUnitsCatalog,
  type UnitRecord,
} from "@/components/Administration/Catalogs/units";
import { LIST_TEXT_INSET, ListGroup, ListValueRow } from "@/components/App/ListGroup";
import AppDependency from "@/components/Form/AppDependency";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormRow, FormSection } from "@/components/Form/FormLayout";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useFormikContext } from "formik";
import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import * as Yup from "yup";

const BASE = "/(tabs)/administration/unidades";

/** Lo mismo que valida el backend (UnitControllerV2). */
const LIMITS = { name: 100, abbreviation: 20 };

const tooLong = (max: number) => `Máximo ${max} caracteres`;

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Escribe el nombre de la unidad")
    .max(LIMITS.name, tooLong(LIMITS.name)),
  abbreviation: Yup.string()
    .trim()
    .required("Escribe la abreviatura, como cj")
    .max(LIMITS.abbreviation, tooLong(LIMITS.abbreviation)),
  conversion: Yup.boolean(),
  base_unit_id: Yup.number()
    .nullable()
    .when("conversion", {
      is: true,
      then: (schema) => schema.required("Elige a qué unidad equivale"),
    }),
  factor_to_base: Yup.number()
    .nullable()
    .typeError("Escribe un número")
    .when("conversion", {
      is: true,
      then: (schema) =>
        schema.required("Escribe cuánto es").min(0.000001, "Tiene que ser mayor que 0"),
    }),
  // Una unidad sin equivalencia necesita su tipo: la columna no admite nulos.
  unit_type: Yup.string()
    .nullable()
    .when("conversion", {
      is: false,
      then: (schema) => schema.required("Elige el tipo de medida"),
    }),
});

interface UnidadFormProps {
  id?: number;
}

const UnidadForm = ({ id }: UnidadFormProps) => {
  const isEditing = !!id;
  const { company } = useSelectedCompany();
  const units = useUnitsCatalog();
  // A la lista o al detalle de donde se vino (o, si se recargó, a uno de ellos).
  const leave = useLeaveScreen(isEditing ? `${BASE}/${id}` : BASE);
  // Empresa de la unidad cargada: las globales (company_id null) solo las
  // modifica un administrador del sistema (el backend responde 403).
  const [unitCompanyId, setUnitCompanyId] = useState<unknown>(undefined);
  const isGlobalUnit = isEditing && unitCompanyId === null;

  // Memorizado: AppForm vuelve a cargar el formulario cada vez que cambia la
  // identidad de initialValues (antes era un objeto nuevo en cada render, y
  // sin empresa se avisaba un error en cada render). La empresa la pone el
  // backend si no llega.
  const initialValues = useMemo(
    () => ({
      name: "",
      abbreviation: "",
      company_id: company?.id,
      conversion: true,
      base_unit_id: null,
      factor_to_base: null,
      unit_type: "quantity",
    }),
    [company?.id],
  );

  return (
    <AppForm
      permissionPrefix="units"
      submitPermission={isGlobalUnit ? "system_admin" : undefined}
      deletePermission={isGlobalUnit ? "system_admin" : undefined}
      api={Services.home.unidades}
      id={id}
      initialValues={initialValues}
      validationSchema={validationSchema}
      submitButtonText={isEditing ? "Guardar cambios" : "Guardar unidad"}
      successMessage={isEditing ? "Cambios guardados" : "Unidad guardada"}
      onSuccess={leave}
      onCancel={leave}
    >
      <FormValueWatcher name="company_id" onChange={setUnitCompanyId} />
      <ResetWhenNoConversion />

      <FormRow widths={[2, 1]}>
        <FormInput name="name" label="Nombre" placeholder="Caja" maxLength={LIMITS.name} />
        <FormInput
          name="abbreviation"
          label="Abreviatura"
          placeholder="cj"
          hint="Va junto a las cantidades: 12 cj."
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={LIMITS.abbreviation}
        />
      </FormRow>

      <FormSection title="Equivalencia">
        {isEditing && <CurrentEquivalence units={units} />}

        <FormSwitch
          name="conversion"
          text={isEditing ? "Cambiar la equivalencia" : "Equivale a otra unidad"}
          description={
            isEditing
              ? "Solo si todavía no tiene existencia ni movimientos."
              : "Como 1 caja = 12 piezas o 1 costal = 25 kg."
          }
        />

        <AppDependency name="conversion">
          {(conversion) =>
            conversion ? (
              <>
                <FormRow widths={[1, 2]}>
                  <FormNumeric name="factor_to_base" label="Cantidad" placeholder="12" />
                  <FormProSelect
                    name="base_unit_id"
                    label="Unidad"
                    model="home.unidades"
                    placeholder="Elige la unidad"
                    // Por nombre: por omisión salían de la más nueva a la más
                    // vieja (Galón, Mililitro, Litro… y Pieza hasta abajo).
                    fetchParams={{ sort_by: "name", sort_direction: "asc" }}
                    // Una unidad no puede equivaler a sí misma.
                    filterItem={id ? (item: any) => item.id !== id : undefined}
                  />
                </FormRow>
                <EquivalencePreview units={units} />
              </>
            ) : isEditing ? null : (
              <FormSelectSimple
                name="unit_type"
                label="Tipo de medida"
                data={UNIT_TYPES}
                hideSearchBox
                hint="Sin equivalencia, cuenta 1 a 1 con la unidad base de su tipo."
              />
            )
          }
        </AppDependency>
      </FormSection>
    </AppForm>
  );
};

/**
 * Al apagar la equivalencia se olvida lo que se escribió: antes la unidad
 * elegida se mandaba aunque el interruptor estuviera apagado (y se guardaba
 * como conversión), y al editar se cambiaba el factor sin querer. Al
 * prenderla al editar, la cantidad empieza vacía: la de hoy ya se ve arriba
 * (y venía como "12.000000").
 */
function ResetWhenNoConversion() {
  const { values, initialValues, setFieldValue } = useFormikContext<any>();
  const conversion = !!values?.conversion;
  useEffect(() => {
    if (conversion) {
      if (initialValues?.id && values?.factor_to_base === initialValues?.factor_to_base) {
        setFieldValue("factor_to_base", null, false);
      }
      return;
    }
    if (values?.base_unit_id != null) setFieldValue("base_unit_id", null, false);
    if (values?.factor_to_base !== initialValues?.factor_to_base) {
      setFieldValue("factor_to_base", initialValues?.factor_to_base ?? null, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversion]);
  return null;
}

/**
 * Lo que dice hoy la unidad que se edita: su tipo y su equivalencia (la
 * guardada, aunque se esté escribiendo una nueva abajo).
 */
function CurrentEquivalence({ units }: { units: UnitRecord[] }) {
  const { values, initialValues } = useFormikContext<any>();
  if (!initialValues?.id) return null;
  const base = baseUnitOf(initialValues.unit_type, units);
  const text = equivalenceText(
    {
      id: initialValues.id,
      abbreviation: values?.abbreviation?.trim() || initialValues.abbreviation || "",
      factor_to_base: initialValues.factor_to_base,
    },
    base,
  );
  return (
    <View style={{ marginBottom: 18 }}>
      <ListGroup inset={LIST_TEXT_INSET}>
        <ListValueRow label="Tipo" value={unitTypeName(initialValues.unit_type)} />
        {units.length > 0 && (
          <ListValueRow label="Conversión" value={text ?? "Es la unidad base"} />
        )}
      </ListGroup>
    </View>
  );
}

/** "1 cj = 12 pz" con lo que se lleva escrito. */
function EquivalencePreview({ units }: { units: UnitRecord[] }) {
  const { values } = useFormikContext<any>();
  const styles = useThemedStyles((c) => ({
    preview: { fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: -6, marginBottom: 18 },
    strong: { fontWeight: "600", color: c.text },
  }));
  const reference = units.find((u) => u.id === Number(values?.base_unit_id));
  const factor = Number(values?.factor_to_base);
  if (!reference || !(factor > 0)) return null;

  const abbreviation = String(values?.abbreviation ?? "").trim() || "unidad";
  // Si la unidad elegida no es la base de su tipo, también en la base:
  // 1 cj = 12 dz (144 pz).
  const typeBase = baseUnitOf(reference.unit_type, units);
  const inBase =
    typeBase && typeBase.id !== reference.id
      ? ` (${formatFactor(factor * unitFactor(reference))} ${typeBase.abbreviation})`
      : "";

  return (
    <Text style={styles.preview}>
      Queda:{" "}
      <Text style={styles.strong}>
        1 {abbreviation} = {formatFactor(factor)} {reference.abbreviation}
      </Text>
      {inBase}
    </Text>
  );
}

export default UnidadForm;
