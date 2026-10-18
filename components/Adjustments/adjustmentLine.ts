/**
 * Un producto en el registro de ajustes y lo que se calcula de él mientras se
 * captura: hacia dónde se mueve la existencia (sale del motivo; solo "Otro"
 * pregunta), cuánto, cuánto queda y qué falta.
 *
 * "El conteo no cuadra" pide cuánto hay en realidad: la app dice qué se va a
 * registrar (antes había que hacer la resta a mano) y manda
 * counted_quantity; el servidor vuelve a calcular la diferencia con la
 * existencia bloqueada.
 */

import type { UploadedFile } from "@/components/Form/AppUpload";
import { toNumber } from "@/components/Production/productionFormat";
import { formatQuantity } from "@/utils/format";
import { REASONS, round3, type Direction, type ReasonCode } from "./adjustmentFormat";
import type { UnitOption } from "./adjustmentRequests";

export interface DraftLine {
  productId: number;
  name: string;
  code: string | null;
  /** Unidad del producto (en la que está la existencia). */
  unitId: number;
  unitAbbr: string;
  unitType: string | null;
  /** Existencia en la sucursal, en la unidad del producto. */
  stock: number;
  /** Unidades en que se puede capturar (la del producto primero); vacío mientras cargan. */
  units: UnitOption[];
  /** Unidad en que se captura la cantidad. */
  captureUnitId: number;
  reason: ReasonCode | null;
  /** Solo para "Otro": ¿sale o entra? */
  direction: Direction | null;
  qty: string;
  notes: string;
  photos: UploadedFile[];
  showNotes: boolean;
  showPhotos: boolean;
}

export type LineField = "reason" | "direction" | "quantity";

export interface LineProblem {
  field: LineField;
  message: string;
  /** Se ve mientras se captura (no hay que esperar a "Registrar"). */
  live: boolean;
}

export interface LineCheck {
  /** Hacia dónde se mueve la existencia (por el motivo o por el conteo). */
  direction: Direction | null;
  /** Lo que se mueve, en la unidad del producto. */
  moved: number | null;
  /** Lo que se muestra debajo de la cantidad ("Quedarán 21 pz"). */
  summary: string | null;
  problem: LineProblem | null;
}

export const MAX_PHOTOS = 6;

export const captureUnit = (line: DraftLine): UnitOption | undefined =>
  line.units.find((u) => u.id === line.captureUnitId);

/** Abreviatura de la unidad en que se captura. */
export const captureAbbr = (line: DraftLine): string => captureUnit(line)?.abbreviation ?? line.unitAbbr;

/** ¿Cuántos hay? (piezas) · ¿Cuánto hay? (kilos, litros). */
export const countQuestion = (line: DraftLine): string =>
  line.unitType && line.unitType !== "quantity" ? "¿Cuánto hay?" : "¿Cuántos hay?";

/** Factor de la unidad capturada a la del producto. */
function toProductUnit(line: DraftLine): number {
  const capture = captureUnit(line);
  const own = line.units.find((u) => u.id === line.unitId);
  return capture && own ? capture.factor / own.factor : 1;
}

export function checkLine(line: DraftLine): LineCheck {
  const fmt = (n: number) => formatQuantity(n, line.unitAbbr);
  const value = toNumber(line.qty);
  const factor = toProductUnit(line);

  if (line.reason === "count_diff") {
    if (value === null) {
      return {
        direction: null,
        moved: null,
        summary: null,
        problem: { field: "quantity", message: "Escribe cuánto hay.", live: false },
      };
    }
    const counted = round3(value * factor);
    const difference = round3(counted - line.stock);
    if (difference === 0) {
      return {
        direction: null,
        moved: null,
        summary: null,
        problem: {
          field: "quantity",
          message: `Coincide con el sistema (${fmt(line.stock)}): no hay nada que ajustar.`,
          live: true,
        },
      };
    }
    const direction: Direction = difference > 0 ? "in" : "out";
    return {
      direction,
      moved: Math.abs(difference),
      summary: `Se registra ${direction === "in" ? "una entrada" : "una salida"} de ${fmt(Math.abs(difference))}: el sistema tenía ${fmt(line.stock)}.`,
      problem: null,
    };
  }

  const direction = line.reason ? (REASONS[line.reason].direction ?? line.direction) : null;
  const moved = value !== null && value > 0 ? round3(value * factor) : null;

  // Lo que no se puede sacar se avisa en cuanto se escribe (antes decía "será
  // negativo", dejaba guardar y el servidor respondía 422). Si se captura en
  // otra unidad, también en esa ("Solo hay 24 pz (2 dz).").
  if (direction === "out" && moved !== null && moved > line.stock + 1e-9) {
    const inCapture =
      factor !== 1 && line.stock > 0 ? ` (${formatQuantity(round3(line.stock / factor), captureAbbr(line))})` : "";
    return {
      direction,
      moved,
      summary: null,
      problem: {
        field: "quantity",
        message: line.stock > 0 ? `Solo hay ${fmt(line.stock)}${inCapture}.` : "No hay existencia para sacar.",
        live: true,
      },
    };
  }

  const after =
    direction && moved !== null ? round3(direction === "in" ? line.stock + moved : line.stock - moved) : null;
  let problem: LineProblem | null = null;
  if (!line.reason) problem = { field: "reason", message: "Elige qué pasó.", live: false };
  else if (!direction) problem = { field: "direction", message: "Elige si sale o entra.", live: false };
  else if (moved === null)
    problem = {
      field: "quantity",
      message: value === 0 ? "La cantidad debe ser mayor que 0." : "Escribe la cantidad.",
      live: false,
    };

  return { direction, moved, summary: after !== null ? `Quedarán ${fmt(after)}` : null, problem };
}

/** "Registrar salida de 3 pz" · "Registrar 3 ajustes" · "Registrar ajuste". */
export function submitLabel(lines: DraftLine[], checks: LineCheck[]): string {
  if (lines.length > 1) return `Registrar ${lines.length} ajustes`;
  const [line] = lines;
  const check = checks[0];
  if (!line || !check || check.problem || !check.direction || check.moved === null) return "Registrar ajuste";
  const amount =
    line.reason === "count_diff"
      ? formatQuantity(check.moved, line.unitAbbr)
      : formatQuantity(toNumber(line.qty), captureAbbr(line));
  return `Registrar ${check.direction === "in" ? "entrada" : "salida"} de ${amount}`;
}

/** El renglón para el POST (details[i]); la cantidad va en la unidad capturada. */
export function lineDetail(line: DraftLine, check: LineCheck): Record<string, unknown> {
  const detail: Record<string, unknown> = {
    product_id: line.productId,
    unit_id: line.captureUnitId,
    reason_code: line.reason,
    notes: line.notes.trim() || undefined,
    evidence: line.photos.length ? line.photos : undefined,
  };
  if (line.reason === "count_diff") {
    detail.counted_quantity = toNumber(line.qty);
  } else {
    detail.direction = check.direction;
    detail.quantity = toNumber(line.qty);
  }
  return detail;
}
