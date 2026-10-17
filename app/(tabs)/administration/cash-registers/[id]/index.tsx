/**
 * Detalle de una caja: nombre, código y sucursal, si está libre, en turno o
 * desactivada; quién la tiene abierta (con el turno a un toque) y sus notas.
 * Antes era el formulario en solo lectura, sin el turno abierto.
 */

import CatalogDetail, { DetailText } from "@/components/Administration/Catalogs/CatalogDetail";
import { ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import StatusBadge, { type StatusBadgeProps } from "@/components/App/StatusBadge";
import { useCan } from "@/hooks/useCan";
import { formatDateTime, formatTime } from "@/utils/dates";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

type Register = App.Entities.CashRegister;

const BASE = "/(tabs)/administration/cash-registers";

/** Los mismos estados que la lista de cajas. */
function registerStatus(register: Register): StatusBadgeProps {
  if (!register.is_active) return { label: "Inactiva", tone: "neutral" };
  if (register.open_session) return { label: "En turno", tone: "info", icon: "account-clock" };
  return { label: "Libre", tone: "success" };
}

/** "Desde las 9:05 a.m." hoy; "Desde el 16 oct 2026, 9:05 a.m." otro día. */
function since(iso: string): string {
  const opened = new Date(iso);
  if (Number.isNaN(opened.getTime())) return "";
  return opened.toDateString() === new Date().toDateString()
    ? `Desde las ${formatTime(opened)}`
    : `Desde el ${formatDateTime(opened)}`;
}

export default function ShowCashRegister() {
  const { id, scope } = useLocalSearchParams<{ id: string; scope?: string }>();
  const router = useRouter();
  const { canAccessRoute } = useCan();
  // Desde Administración › Esta sucursal se regresa a esa lista.
  const suffix = scope === "location" ? "?scope=location" : "";

  return (
    <CatalogDetail<Register>
      id={Number(id)}
      service={Services.cashRegisters}
      permissionPrefix="cash_registers"
      editHref={(register) => `${BASE}/${register.id}/edit${suffix}`}
      listHref={`${BASE}${suffix}`}
      texts={{
        notFound: "No se encontró la caja",
        loadError: "No se pudo cargar la caja",
        deleteLabel: "Eliminar caja",
        // Lo mismo que revisa el backend antes de eliminar.
        deleteMessage:
          "Se elimina y no se puede deshacer. Si ya tiene turnos, no se puede eliminar: desactívala desde Editar.",
        deleted: "Caja eliminada",
      }}
      header={(register) => ({
        title: register.name,
        subtitle: [register.code, register.location_name].filter(Boolean).join(" · "),
        badges: [<StatusBadge key="status" {...registerStatus(register)} />],
        hint: register.is_active ? null : "No se puede abrir turno en ella.",
      })}
    >
      {(register) => {
        const session = register.open_session;
        const sessionHref = session ? `/(tabs)/home/cash/sessions/${session.id}` : null;
        return (
          <>
            {session && (
              <ListSection title="Turno abierto">
                <ListGroup>
                  <ListRow
                    icon="account-clock-outline"
                    title={session.user_name || "Turno abierto"}
                    subtitle={since(session.opened_at)}
                    onPress={
                      sessionHref && canAccessRoute(sessionHref)
                        ? () => router.push(sessionHref as any)
                        : undefined
                    }
                  />
                </ListGroup>
              </ListSection>
            )}

            {!!register.notes?.trim() && (
              <ListSection title="Notas">
                <DetailText>{register.notes.trim()}</DetailText>
              </ListSection>
            )}
          </>
        );
      }}
    </CatalogDetail>
  );
}
