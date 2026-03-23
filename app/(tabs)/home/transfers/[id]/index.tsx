import Breadcrumb from "@/components/Transfers/Breadcrumb";
import {
  getCurrentStepFromTransfer,
  TransferWizardStatusCard,
} from "@/components/Transfers/TransferWizardSteps";
import {
  TransferStepFourSummary,
  TransferStepOneApproval,
  TransferStepThreeReceive,
  TransferStepTwoShip,
} from "@/components/Views/transfers";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export default function TransferDetailWizardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const alerts = useAlerts();

  const [transfer, setTransfer] = useState<InventoryTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [editableQuantities, setEditableQuantities] = useState<
    Record<number, number>
  >({});

  const transferId = useMemo(() => Number(id), [id]);
  const currentLocationId = auth.location?.id;

  const getInitialStepForActor = (data: InventoryTransfer) => {
    return getCurrentStepFromTransfer(data);
  };

  useEffect(() => {
    if (!transferId) return;
    loadTransfer();
  }, [transferId, currentLocationId]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const data = await transferService.getTransfer(transferId);
      setTransfer(data);
      setSelectedStep(getInitialStepForActor(data));

      const initialQuantities: Record<number, number> = {};
      (data.details || []).forEach((detail) => {
        initialQuantities[detail.id] = Number(detail.quantity_requested || 0);
      });
      setEditableQuantities(initialQuantities);
    } catch (error) {
      console.error("Error loading transfer detail wizard:", error);
      setTransfer(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Cargando transferencia...</Text>
      </View>
    );
  }

  if (!transfer) {
    return (
      <View style={styles.centered}>
        <Text>No se encontro la transferencia</Text>
      </View>
    );
  }

  const currentStep = getCurrentStepFromTransfer(transfer);
  const isSourceLocationUser = currentLocationId === transfer.from_location_id;
  const isTargetLocationUser = currentLocationId === transfer.to_location_id;
  const requesterId =
    (transfer as any).requested_by_user_id ??
    (transfer as any).requested_by_user?.id ??
    (transfer as any).requested_by;
  const isRequester = auth.user?.id === requesterId;

  const hasTransferWorkflowPermission = true;
  const canApproveInStep1 =
    hasTransferWorkflowPermission && isSourceLocationUser && currentStep === 1;
  const canEditQuantitiesInStep1 = canApproveInStep1;
  const canContinueShipInStep2 = isSourceLocationUser && currentStep === 2;
  const canContinueReceiveInStep3 = isTargetLocationUser && currentStep === 3;

  const maxStep = currentStep;

  const updateEditableQuantity = (detailId: number, value: string) => {
    const parsed = Number(value || 0);
    setEditableQuantities((prev) => ({
      ...prev,
      [detailId]: Number.isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleApprove = async () => {
    const confirmed = await alerts.confirm(
      "Deseas aprobar esta transferencia?",
      {
        title: "Aprobar transferencia",
        okText: "Aprobar",
        cancelText: "Cancelar",
      },
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      await transferService.approve(transfer.id, {
        items: (transfer.details || []).map((detail) => ({
          detail_id: detail.id,
          quantity_requested:
            editableQuantities[detail.id] ??
            Number(detail.quantity_requested || 0),
        })),
      });
      alerts.success("Transferencia aprobada correctamente");
      await loadTransfer();
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo aprobar la transferencia",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const confirmed = await alerts.confirm(
      "Deseas rechazar esta transferencia?",
      {
        title: "Rechazar transferencia",
        okText: "Rechazar",
        cancelText: "Cancelar",
      },
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      await transferService.reject(
        transfer.id,
        "Rechazada desde wizard de transferencias",
      );
      alerts.success("Transferencia rechazada");
      await loadTransfer();
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo rechazar la transferencia",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Transferencias", route: "/(tabs)/home/transfers" },
          { label: "Pendientes", route: "/(tabs)/home/transfers/pending" },
          { label: `#${transfer.id}` },
        ]}
        currentIndex={2}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <TransferWizardStatusCard
          transfer={transfer}
          selectedStep={selectedStep}
          maxStep={maxStep}
          onSelectStep={setSelectedStep}
        />

        {selectedStep === 1 && (
          <TransferStepOneApproval
            transfer={transfer}
            canApproveInStep1={canApproveInStep1}
            canEditQuantitiesInStep1={canEditQuantitiesInStep1}
            isRequester={isRequester}
            editableQuantities={editableQuantities}
            submitting={submitting}
            onChangeQuantity={updateEditableQuantity}
            onApprove={handleApprove}
            onReject={handleReject}
            formatDate={formatDate}
          />
        )}

        {selectedStep === 2 && (
          <TransferStepTwoShip
            transfer={transfer}
            canContinueShipInStep2={canContinueShipInStep2}
            isRequester={isRequester}
            onCompleted={loadTransfer}
          />
        )}

        {selectedStep === 3 && (
          <TransferStepThreeReceive
            transfer={transfer}
            canContinueReceiveInStep3={canContinueReceiveInStep3}
            isRequester={isRequester}
            onCompleted={loadTransfer}
          />
        )}

        {selectedStep === 4 && (
          <TransferStepFourSummary transfer={transfer} formatDate={formatDate} />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
});
