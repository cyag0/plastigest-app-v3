/**
 * Detalle de un cliente o un proveedor: el nombre (y el comercial) con su
 * estado; abajo cómo contactarlo y los datos fiscales. En el teléfono, tocar
 * el número llama y tocar el correo abre el correo.
 */

import { LIST_TEXT_INSET, ListGroup, ListRow, ListSection, ListValueRow } from "@/components/App/ListGroup";
import StatusBadge from "@/components/App/StatusBadge";
import { activeStatus } from "@/constants/statuses";
import { formatPhone } from "@/utils/phone";
import Services from "@/utils/services";
import React from "react";
import { Linking, Platform } from "react-native";
import CatalogDetail, { DetailHint } from "./CatalogDetail";
import type { PartyKind } from "./PartyForm";

type Party = App.Entities.Customer | App.Entities.Supplier;

const COPY: Record<
  PartyKind,
  {
    base: string;
    permissionPrefix: string;
    notFound: string;
    loadError: string;
    deleteLabel: string;
    deleteMessage: string;
    deleted: string;
    /** Qué pasa estando inactivo, si algo cambia. */
    inactiveHint?: string;
  }
> = {
  customer: {
    base: "/(tabs)/administration/clientes",
    permissionPrefix: "customers",
    notFound: "No se encontró el cliente",
    loadError: "No se pudo cargar el cliente",
    deleteLabel: "Eliminar cliente",
    // Lo mismo que revisa el backend antes de eliminar.
    deleteMessage:
      "Se elimina y no se puede deshacer. Si ya tiene ventas, pedidos o notas, no se puede eliminar: desactívalo desde Editar.",
    deleted: "Cliente eliminado",
  },
  supplier: {
    base: "/(tabs)/administration/suppliers",
    permissionPrefix: "suppliers",
    notFound: "No se encontró el proveedor",
    loadError: "No se pudo cargar el proveedor",
    deleteLabel: "Eliminar proveedor",
    deleteMessage:
      "Se elimina y no se puede deshacer. Si ya tiene compras o productos, no se puede eliminar: desactívalo desde Editar.",
    deleted: "Proveedor eliminado",
    inactiveHint: "No aparece al registrar compras.",
  },
};

/** En el teléfono el renglón llama o abre el correo; en web solo se lee. */
function openOnPhone(url: string) {
  if (Platform.OS === "web") return undefined;
  return () => {
    Linking.openURL(url).catch(() => {});
  };
}

export default function PartyDetail({ kind, id }: { kind: PartyKind; id: number }) {
  const copy = COPY[kind];
  const service = (kind === "customer" ? Services.customers : Services.suppliers) as any;

  return (
    <CatalogDetail<Party>
      id={id}
      service={service}
      permissionPrefix={copy.permissionPrefix}
      editHref={(party) => `${copy.base}/${party.id}/edit`}
      listHref={copy.base}
      texts={copy}
      header={(party) => {
        const active = party.is_active !== false;
        return {
          title: party.name,
          // El nombre comercial, solo si dice algo distinto.
          subtitle:
            party.business_name && party.business_name.trim() !== party.name.trim()
              ? party.business_name
              : null,
          badges: [<StatusBadge key="active" {...activeStatus(active)} />],
          hint: active ? null : (copy.inactiveHint ?? null),
        };
      }}
    >
      {(party) => {
        const phone = party.phone?.trim();
        const email = party.email?.trim();
        const address = party.address?.trim();
        const fiscal = [
          !!party.social_reason?.trim() && (
            <ListValueRow key="social" label="Razón social" value={party.social_reason!.trim()} />
          ),
          !!party.rfc?.trim() && <ListValueRow key="rfc" label="RFC" value={party.rfc!.trim().toUpperCase()} />,
        ].filter(Boolean);

        return (
          <>
            <ListSection title="Contacto">
              {phone || email || address ? (
                <ListGroup>
                  {!!phone && (
                    <ListRow
                      icon="phone-outline"
                      title={formatPhone(phone)}
                      chevron={false}
                      onPress={openOnPhone(`tel:${phone.replace(/[^\d+]/g, "")}`)}
                      accessibilityLabel={`Llamar al ${formatPhone(phone)}`}
                    />
                  )}
                  {!!email && (
                    <ListRow
                      icon="email-outline"
                      title={email}
                      chevron={false}
                      onPress={openOnPhone(`mailto:${email}`)}
                      accessibilityLabel={`Escribir a ${email}`}
                    />
                  )}
                  {!!address && (
                    <ListRow icon="map-marker-outline" title={address} chevron={false} alignTop />
                  )}
                </ListGroup>
              ) : (
                <DetailHint>Sin teléfono, correo ni dirección.</DetailHint>
              )}
            </ListSection>

            {fiscal.length > 0 && (
              <ListSection title="Datos fiscales">
                <ListGroup inset={LIST_TEXT_INSET}>{fiscal}</ListGroup>
              </ListSection>
            )}
          </>
        );
      }}
    </CatalogDetail>
  );
}
