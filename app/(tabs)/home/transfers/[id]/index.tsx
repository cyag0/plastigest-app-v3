/**
 * Detalle de una transferencia, como el de Compras: arriba de qué sucursal a
 * cuál, el folio, quién la pidió, el estado, qué significa y a quién le toca,
 * con los pasos (Solicitud, Aprobación, Envío, Recepción); luego los
 * productos con la cantidad de cada etapa y, al lado, la nota de quien la
 * pidió, las fotos de cada paso y el historial.
 *
 * La acción del paso va en la barra de abajo y solo la ve la sucursal a la
 * que le toca, con transfers_update: el origen aprueba o rechaza (paso 1) y
 * envía (paso 2); el destino recibe (paso 3). Imprimir la remisión y
 * cancelar (como en Solicitudes pendientes) van en el menú ⋮.
 *
 * Antes era un asistente de cuatro pasos con un encabezado de color sólido y
 * una tarjeta por paso; los pasos anteriores se veían tocándolos.
 */

import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import { ListSection } from "@/components/App/ListGroup";
import RecordLoadError, { recordLoadProblem, type RecordLoadProblem } from "@/components/App/RecordLoadError";
import RowMenu, { type RowMenuAction } from "@/components/App/RowMenu";
import {
  TransferHeader,
  TransferHistory,
  TransferNote,
  TransferPhotos,
  TransferSkeleton,
  transferFolio,
  transferPlaces,
} from "@/components/Transfers/TransferDetailParts";
import {
  getCurrentStepFromTransfer,
  receivingNotes,
  rejectionReason,
  shippingNotes,
  statusHint,
  stepPhotos,
} from "@/components/Transfers/transferFormat";
import {
  TransferStepFourSummary,
  TransferStepOneApproval,
  TransferStepThreeReceive,
  TransferStepTwoShip,
} from "@/components/Views/transfers";
import { useAuth } from "@/contexts/AuthContext";
import { useHelpSection } from "@/help";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { errorMessageOf, notifyError } from "@/utils/errorNotice";
import { printTransferRemission } from "@/utils/printDocument";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Text } from "react-native";

// Sección de la ayuda que abre el botón "?" según el paso en el que va.
const HELP_SECTION_BY_STEP: Record<number, string> = {
  1: "aprobar",
  2: "enviar",
  3: "recibir",
  4: "detalle",
};

/** Estados que el backend deja cancelar (TransferStatus::canCancel). */
const CANCELLABLE_STATUSES = ["pending", "approved", "in_transit"];

export default function TransferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const alerts = useAlerts();
  const router = useRouter();
  const navigation = useNavigation();
  const styles = useThemedStyles(makeStyles);
  const { can, canAccessRoute } = useCan();
  const allLocations = useAllLocationsAccess();
  // Aprobar, rechazar, enviar y recibir piden transfers_update (además de la
  // sucursal: origen para aprobar y enviar, destino para recibir).
  const hasTransferWorkflowPermission = can("transfers_update");

  const [transfer, setTransfer] = useState<InventoryTransfer | null>(null);
  // No se pudo cargar: 404 (borrada o de otra sucursal) o falla del servidor.
  const [loadProblem, setLoadProblem] = useState<RecordLoadProblem | null>(null);
  const loaded = useRef(false);
  // Candado de imprimir y cancelar (un doble toque no los repite).
  const { run: runMenuAction } = useSubmitGuard();

  const transferId = useMemo(() => Number(id), [id]);
  // Un id que no es número no se pide: es "no se encontró".
  const invalidId = !Number.isInteger(transferId) || transferId <= 0;
  const currentLocationId = auth.location?.id;

  const loadTransfer = useCallback(async () => {
    if (invalidId) return;
    try {
      // silent: la falla se explica en la pantalla (con «Reintentar»).
      const data = await transferService.getTransfer(transferId, { silent: true });
      setTransfer(data);
      setLoadProblem(null);
      loaded.current = true;
    } catch (error) {
      // La primera carga explica la falla en la pantalla; después (al volver
      // a pedirla tras aprobar, enviar…) se avisa y se queda lo que se veía.
      if (!loaded.current) {
        setTransfer(null);
        setLoadProblem(recordLoadProblem(error, "No se pudo cargar la transferencia. Inténtalo de nuevo."));
      } else {
        alerts.error(errorMessageOf(error, "No se pudo actualizar la transferencia."));
      }
    }
  }, [transferId, invalidId, alerts]);

  // Se pide al abrirla y cada vez que se vuelve a la pantalla (p. ej. del
  // ajuste de un faltante o de la ayuda). Al cambiar de sucursal se pide como
  // la primera vez: puede que desde la nueva no se vea.
  const loadedFrom = useRef(currentLocationId);
  useFocusEffect(
    useCallback(() => {
      if (loadedFrom.current !== currentLocationId) {
        loadedFrom.current = currentLocationId;
        loaded.current = false;
      }
      loadTransfer();
    }, [loadTransfer, currentLocationId]),
  );

  const currentStep = transfer ? getCurrentStepFromTransfer(transfer) : null;
  useHelpSection(currentStep ? HELP_SECTION_BY_STEP[currentStep] : null);

  const status = String(transfer?.status ?? "");
  const isSourceLocationUser = !!transfer && currentLocationId === transfer.from_location_id;
  const isTargetLocationUser = !!transfer && currentLocationId === transfer.to_location_id;

  const canApproveInStep1 = hasTransferWorkflowPermission && isSourceLocationUser && currentStep === 1;
  const canContinueShipInStep2 = hasTransferWorkflowPermission && isSourceLocationUser && currentStep === 2;
  const canContinueReceiveInStep3 = hasTransferWorkflowPermission && isTargetLocationUser && currentStep === 3;

  // Como el backend (destroy) y Solicitudes pendientes: transfers_delete,
  // desde la sucursal de origen o la de destino (o con acceso a todas), y
  // mientras esté pendiente, aprobada o en tránsito.
  const canCancel =
    !!transfer &&
    can("transfers_delete") &&
    CANCELLABLE_STATUSES.includes(status) &&
    (allLocations ||
      Number(transfer.from_location_id) === Number(currentLocationId) ||
      Number(transfer.to_location_id) === Number(currentLocationId));

  // La remisión es la hoja que viaja con la mercancía y se firma al recibir.
  const printRemission = () =>
    runMenuAction(async () => {
      if (!transfer) return;
      try {
        await printTransferRemission(transfer.id, transfer.transfer_number);
      } catch (error) {
        // Un solo aviso (el de la app), con el motivo del servidor.
        notifyError(error, "No se pudo generar la remisión.");
      }
    });

  // Una transferencia en curso se cancela (no se elimina): queda en el
  // historial como cancelada. Si ya iba en camino, el backend regresa lo
  // enviado al inventario de origen.
  const cancelTransfer = () =>
    runMenuAction(async () => {
      if (!transfer) return;
      const inTransit = transfer.status === "in_transit";
      const from = transferPlaces(transfer, auth.selectedCompany?.name).from;
      const ok = await alerts.confirm(
        inTransit
          ? `No se puede deshacer. La mercancía enviada regresa al inventario de ${from}.`
          : "No se puede deshacer. No se mueve inventario.",
        { title: `¿Cancelar la transferencia ${transferFolio(transfer)}?`, okText: "Sí, cancelar", cancelText: "Volver" },
      );
      if (!ok) return;
      try {
        await transferService.destroy(transfer.id);
        alerts.success("Transferencia cancelada");
        await loadTransfer();
      } catch (error: any) {
        alerts.error(error?.response?.data?.message || "No se pudo cancelar la transferencia");
      }
    });

  // Acciones secundarias en el menú ⋮ del encabezado (antes, "Imprimir
  // remisión" iba en la tarjeta de color). Lo que no se puede hacer no aparece.
  const menu: RowMenuAction[] = transfer
    ? [
        { label: "Imprimir remisión", icon: "printer-outline", onPress: printRemission },
        ...(canCancel
          ? [{ label: "Cancelar transferencia", icon: "cancel" as const, onPress: cancelTransfer, destructive: true }]
          : []),
      ]
    : [];

  // El layout no le pone título a esta ruta; el menú depende de la
  // transferencia y de los permisos (sus acciones leen la de este render).
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Transferencia",
      headerRight: () => (menu.length ? <RowMenu actions={menu} /> : null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, transfer, canCancel, currentLocationId]);

  if (invalidId || loadProblem) {
    return (
      <RecordLoadError
        problem={loadProblem ?? { kind: "not_found", message: "" }}
        notFoundTitle="No se encontró la transferencia"
        errorTitle="No se pudo cargar la transferencia"
        onRetry={loadTransfer}
      />
    );
  }

  if (!transfer) return <TransferSkeleton />;

  const places = transferPlaces(transfer, auth.selectedCompany?.name);
  const hint = statusHint(
    transfer,
    { isSource: isSourceLocationUser, isTarget: isTargetLocationUser, canWorkflow: hasTransferWorkflowPermission },
    places,
  );

  const header = (
    <TransferHeader
      transfer={transfer}
      hint={hint}
      // Lo eligió y escribió quien la rechazó; quien la pidió lo ve aquí.
      reason={rejectionReason(transfer)}
      currentLocationId={currentLocationId}
      companyName={auth.selectedCompany?.name}
    />
  );

  // La nota de la solicitud, arriba de los productos: es para quien surte.
  const intro = !!transfer.notes?.trim() && (
    <ListSection title="Nota de la solicitud">
      <Text style={styles.note} selectable>
        {transfer.notes.trim()}
      </Text>
    </ListSection>
  );

  const side = (
    <>
      <TransferPhotos title="Fotos del envío" photos={stepPhotos(transfer, "step_2")} />
      <TransferNote title="Nota del envío" note={shippingNotes(transfer)} />
      <TransferPhotos title="Fotos de la recepción" photos={stepPhotos(transfer, "step_3")} />
      <TransferNote title="Nota de la recepción" note={receivingNotes(transfer)} />
      <TransferHistory transfer={transfer} />
    </>
  );

  // Cada vista guarda lo que se va capturando; con otra versión de la
  // transferencia (al recargarla) empieza de nuevo.
  const stepKey = `${transfer.id}-${transfer.updated_at}`;
  const stepProps = { transfer, header, intro, side, onCompleted: loadTransfer };

  switch (currentStep) {
    case 1:
      return (
        <TransferStepOneApproval
          key={stepKey}
          {...stepProps}
          canApprove={canApproveInStep1}
          showStock={isSourceLocationUser}
        />
      );
    case 2:
      return (
        <TransferStepTwoShip
          key={stepKey}
          {...stepProps}
          canShip={canContinueShipInStep2}
          showStock={isSourceLocationUser}
        />
      );
    case 3:
      return <TransferStepThreeReceive key={stepKey} {...stepProps} canReceive={canContinueReceiveInStep3} />;
    default: {
      // El ajuste de un faltante es de la sucursal destino: se abre desde ella
      // (o con acceso a todas), si se puede entrar a Ajustes.
      const adjustmentOpener = (adjustmentId: number) => {
        const route = `/(tabs)/home/adjustment/${adjustmentId}`;
        return (isTargetLocationUser || allLocations) && canAccessRoute(route)
          ? () => router.push(route as any)
          : undefined;
      };
      return (
        <TransferStepFourSummary
          transfer={transfer}
          header={header}
          intro={intro}
          side={side}
          adjustmentOpener={adjustmentOpener}
        />
      );
    }
  }
}

const makeStyles = themedStyles((c) => ({
  note: { fontSize: 14, lineHeight: 20, color: c.text },
}));
