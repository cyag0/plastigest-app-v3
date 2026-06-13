import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import React from "react";

const WASTE_REASONS = [
  { value: "damage", label: "Producto dañado" },
  { value: "quality", label: "Defecto de calidad" },
  { value: "expired", label: "Caducado / Vencido" },
  { value: "process_loss", label: "Merma de proceso" },
  { value: "spill", label: "Derrame / Desperdicio" },
  { value: "other", label: "Otro" },
];

const COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Producto",
    type: "product",
    width: 220,
    required: true,
    productFetchParams: { product_type: ["raw_material", "processed"] },
  },
  {
    key: "unit_id",
    label: "Unidad",
    type: "unit",
    width: 110,
    required: true,
  },
  {
    key: "quantity",
    label: "Cantidad",
    type: "number",
    width: 110,
    required: true,
  },
  {
    key: "reason",
    label: "Tipo de merma",
    type: "select",
    width: 170,
    required: true,
    options: WASTE_REASONS,
  },
  {
    key: "notes",
    label: "Observaciones",
    type: "text",
    width: 200,
  },
];

const DEFAULT_ROW = {
  product_id: 0,
  unit_id: 0,
  quantity: 0,
  reason: "other",
  notes: "",
};

interface Props {
  name?: string;
}

export default function MermasTable({ name = "wastes" }: Props) {
  return (
    <EditableTable
      name={name}
      label="Mermas"
      columns={COLUMNS}
      defaultRow={DEFAULT_ROW}
      addLabel="Agregar merma"
      emptyMessage="Sin mermas registradas. Agrega una si hubo pérdidas durante la producción."
      borderLeft
      highlightColor="#EF4444"
    />
  );
}

export { WASTE_REASONS };
