import axiosClient from "@/utils/axios";
import type { PurchaseRecord } from "./purchaseFormat";

/**
 * Una compra (GET purchases-v2/{id}) sin el aviso global de error: el
 * detalle explica el 404 o la falla con RecordLoadError, y con el aviso
 * saldrían dos. Services.purchasesV2.show no recibe opciones; las acciones
 * (recibir, cancelar…) siguen allá.
 */
export async function fetchPurchase(id: number): Promise<PurchaseRecord> {
  const response = await axiosClient.get(`/auth/admin/purchases-v2/${id}`, { silent: true });
  // Viene doblemente envuelta: { success, data: { data: {...} } }.
  const body = response.data as any;
  return (body?.data?.data ?? body?.data ?? body) as PurchaseRecord;
}
