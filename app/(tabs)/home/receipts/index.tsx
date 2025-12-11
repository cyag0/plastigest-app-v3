import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, View } from "react-native";
import {
  Button,
  Chip,
  Dialog,
  IconButton,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";

export default function ReceiptsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedTransfer, setSelectedTransfer] =
    useState<InventoryTransfer | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleApprove = async (transfer: InventoryTransfer) => {
    Alert.alert(
      "Aprobar Recepción",
      `¿Deseas aprobar la transferencia ${transfer.transfer_number}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: async () => {
            try {
              setProcessing(true);
              await transferService.approve(transfer.id);
              Alert.alert("Éxito", "Transferencia aprobada correctamente");
              setRefreshKey((prev) => prev + 1);
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "No se pudo aprobar la transferencia"
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = (transfer: InventoryTransfer) => {
    setSelectedTransfer(transfer);
    setRejectReason("");
    setRejectDialogVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedTransfer) return;

    if (!rejectReason.trim()) {
      Alert.alert("Error", "Debes proporcionar un motivo de rechazo");
      return;
    }

    try {
      setProcessing(true);
      setRejectDialogVisible(false);
      await transferService.reject(selectedTransfer.id, rejectReason);
      Alert.alert("Éxito", "Transferencia rechazada correctamente");
      setRefreshKey((prev) => prev + 1);
      setSelectedTransfer(null);
      setRejectReason("");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudo rechazar la transferencia"
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<
      string,
      { icon: string; color: string; label: string }
    > = {
      ordered: {
        icon: "clock-outline",
        color: palette.warning,
        label: "Ordenado",
      },
      in_transit: {
        icon: "truck-fast",
        color: palette.blue,
        label: "En Tránsito",
      },
    };
    return (
      statusMap[status] || {
        icon: "help-circle-outline",
        color: palette.textSecondary,
        label: status,
      }
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Portal>
        <Dialog
          visible={rejectDialogVisible}
          onDismiss={() => setRejectDialogVisible(false)}
        >
          <Dialog.Title>Rechazar Transferencia</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Transferencia: {selectedTransfer?.transfer_number}
            </Text>
            <TextInput
              label="Motivo del rechazo *"
              value={rejectReason}
              onChangeText={setRejectReason}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Explica por qué se rechaza esta transferencia"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectDialogVisible(false)}>
              Cancelar
            </Button>
            <Button
              onPress={confirmReject}
              disabled={!rejectReason.trim() || processing}
              loading={processing}
            >
              Rechazar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <AppList<InventoryTransfer>
        key={refreshKey}
        title="Recepciones"
        service={Services.transfers}
        defaultFilters={{
          mode: "receipts",
        }}
        searchPlaceholder="Buscar recepciones..."
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);

          return {
            title: item.transfer_number || `#${item.id}`,
            description: formatDate(item.requested_at || ""),
            left: (
              <View style={styles.statusIconContainer}>
                <IconButton
                  icon={statusInfo.icon}
                  size={24}
                  iconColor={statusInfo.color}
                  style={{ margin: 0 }}
                />
              </View>
            ),
            right: (
              <View style={styles.rightContent}>
                <Chip
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: statusInfo.color + "15",
                      borderColor: statusInfo.color,
                    },
                  ]}
                  textStyle={[styles.statusText, { color: statusInfo.color }]}
                  compact
                  mode="outlined"
                >
                  {statusInfo.label}
                </Chip>
              </View>
            ),
            bottom: [
              {
                label: "Origen",
                value: item.to_location?.name || "N/A",
              },
              {
                label: "Productos",
                value: item.details?.length || 0,
              },
            ],
          };
        }}
        onItemPress={(item: InventoryTransfer) => {
          router.push(`/(tabs)/home/receipts/${item.id}` as any);
        }}
        menu={{
          showDelete: false,
          showEdit: false,
        }}
      />
    </View>
  );
}

const styles = {
  statusIconContainer: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.surface,
    shadowColor: "transparent",
  },
  rightContent: {
    alignItems: "flex-end" as const,
    gap: 4,
  },
  statusChip: {
    shadowColor: "transparent",
    elevation: 0,
  },
  statusText: {
    fontWeight: "600" as const,
  },
  dateText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500" as const,
  },
};
