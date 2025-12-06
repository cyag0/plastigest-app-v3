import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider, TextInput, Modal, Portal } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import AppBar from '@/components/App/AppBar';
import transferService from '@/utils/services/transferService';
import type { InventoryTransfer } from '@/utils/services/transferService';

export default function PetitionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [petition, setPetition] = useState<InventoryTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (id) {
      loadPetition();
    }
  }, [id]);

  const loadPetition = async () => {
    try {
      setLoading(true);
      const data = await transferService.getTransfer(Number(id));
      setPetition(data);
    } catch (error) {
      console.error('Error loading petition:', error);
      Alert.alert('Error', 'No se pudo cargar la petición');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!petition) return;
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (!petition) return;

    try {
      setApproving(true);
      setShowApprovalModal(false);
      
      await transferService.approve(petition.id);
      
      // Recargar los datos para ver el cambio
      await loadPetition();
      
      // Mostrar modal de éxito
      setShowSuccessModal(true);
      
    } catch (error: any) {
      console.error('Error approving petition:', error);
      Alert.alert('Error', 'No se pudo aprobar la petición');
    } finally {
      setApproving(false);
    }
  };

  const goToShipments = () => {
    setShowSuccessModal(false);
    // Ir directamente a la preparación del envío
    router.replace(`/(tabs)/home/shipments/${petition.id}`);
  };

  const handleReject = () => {
    if (!petition) return;

    Alert.prompt(
      'Rechazar Petición',
      'Ingresa el motivo del rechazo:',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Rechazar',
          onPress: async (reason?: string) => {
            if (!reason?.trim()) {
              Alert.alert('Error', 'Debes proporcionar un motivo para el rechazo');
              return;
            }

            try {
              await transferService.reject(petition.id, reason);
              Alert.alert('Éxito', 'Petición rechazada exitosamente');
              router.back();
            } catch (error) {
              console.error('Error rejecting petition:', error);
              Alert.alert('Error', 'No se pudo rechazar la petición');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppBar title="Detalle de Petición" showBackButton />
        <View style={styles.loadingContainer}>
          <Text>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!petition) {
    return (
      <View style={styles.container}>
        <AppBar title="Detalle de Petición" showBackButton />
        <View style={styles.loadingContainer}>
          <Text>No se encontró la petición</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar title="Detalle de Petición" showBackButton />
      
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Text variant="headlineSmall">Petición #{petition.id}</Text>
              <Chip 
                mode="flat" 
                style={{ backgroundColor: getStatusColor(petition.status) }}
                textStyle={{ color: 'white' }}
              >
                {getStatusLabel(petition.status)}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>📍 Sucursal que solicita:</Text>
              <Text variant="bodyMedium" style={styles.infoText}>{petition.to_location?.name || petition.toLocation?.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>📦 Sucursal que enviará:</Text>
              <Text variant="bodyMedium" style={styles.infoText}>{petition.from_location?.name || petition.fromLocation?.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>👤 Solicitado por:</Text>
              <Text variant="bodyMedium" style={styles.infoText}>{petition.requested_by_user?.name || petition.requestedByUser?.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>📅 Fecha de solicitud:</Text>
              <Text variant="bodyMedium" style={styles.infoText}>
                {formatDate(petition.created_at)}
              </Text>
            </View>

            {(petition.approved_by_user || petition.approvedByUser) && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>✅ Aprobado por:</Text>
                <Text variant="bodyMedium" style={styles.infoText}>
                  {petition.approved_by_user?.name || petition.approvedByUser?.name}
                </Text>
              </View>
            )}

            {petition.approved_at && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>✅ Fecha de aprobación:</Text>
                <Text variant="bodyMedium" style={styles.infoText}>
                  {formatDate(petition.approved_at)}
                </Text>
              </View>
            )}

            {petition.rejection_reason && (
              <>
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.label}>❌ Motivo del rechazo:</Text>
                </View>
                <Text variant="bodyMedium" style={styles.rejectionReason}>
                  {petition.rejection_reason}
                </Text>
              </>
            )}

            {petition.notes && (
              <>
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.label}>📝 Notas:</Text>
                </View>
                <Text variant="bodyMedium" style={styles.notes}>
                  {petition.notes}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📦 Productos Solicitados
            </Text>
            
            {petition.details && petition.details.length > 0 ? (
              petition.details.map((detail, index) => (
                <View key={index} style={styles.productItem}>
                  <Text variant="bodyLarge">{detail.product?.name}</Text>
                  <Text variant="bodyMedium" style={styles.productCode}>
                    Código: {detail.product?.code}
                  </Text>
                  <View style={styles.productInfo}>
                    <Text variant="bodyMedium" style={styles.quantity}>
                      Cantidad: {detail.quantity_requested} {detail.product?.unit}
                    </Text>
                    {detail.unit_cost && detail.unit_cost > 0 && (
                      <Text variant="bodyMedium" style={styles.cost}>
                        Costo unitario: ${detail.unit_cost.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  
                  {detail.notes && (
                    <Text variant="bodySmall" style={styles.productNotes}>
                      Notas: {detail.notes}
                    </Text>
                  )}
                  
                  {index < petition.details.length - 1 && (
                    <Divider style={styles.productDivider} />
                  )}
                </View>
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.noData}>
                No hay productos en esta petición
              </Text>
            )}

            {petition.total_cost && petition.total_cost > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.totalContainer}>
                  <Text variant="titleMedium" style={styles.totalLabel}>
                    Total estimado: ${petition.total_cost.toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {petition.status === 'pending' && (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={handleApprove}
              style={[styles.button, styles.approveButton]}
              labelStyle={{ color: 'white' }}
            >
              Aprobar Petición
            </Button>
            
            <Button
              mode="outlined"
              onPress={handleReject}
              style={[styles.button, styles.rejectButton]}
              labelStyle={{ color: '#F44336' }}
            >
              Rechazar Petición
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Modal de Confirmación de Aprobación */}
      <Portal>
        <Modal
          visible={showApprovalModal}
          onDismiss={() => setShowApprovalModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Confirmar Aprobación
              </Text>
              <Text variant="bodyMedium" style={styles.modalText}>
                ¿Estás seguro de que quieres aprobar esta petición? 
                Serás redirigido a Envíos para preparar el pedido.
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowApprovalModal(false)}
                  style={[styles.button, styles.cancelButton]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmApproval}
                  loading={approving}
                  disabled={approving}
                  style={[styles.button, styles.confirmButton]}
                >
                  Aprobar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Modal de Éxito */}
      <Portal>
        <Modal
          visible={showSuccessModal}
          onDismiss={() => setShowSuccessModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                ✅ ¡Éxito!
              </Text>
              <Text variant="bodyMedium" style={styles.modalText}>
                Petición aprobada exitosamente. ¿Deseas ir a preparar el envío ahora?
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowSuccessModal(false)}
                  style={[styles.button, styles.cancelButton]}
                >
                  Quedarme aquí
                </Button>
                <Button
                  mode="contained"
                  onPress={goToShipments}
                  style={[styles.button, styles.confirmButton]}
                >
                  Preparar Envío
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    minWidth: 160,
  },
  infoText: {
    flex: 1,
    color: '#333',
  },
  rejectionReason: {
    color: '#F44336',
    marginTop: 4,
    fontStyle: 'italic',
  },
  notes: {
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FF9800',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  productItem: {
    paddingVertical: 8,
  },
  productCode: {
    color: '#666',
    marginTop: 2,
  },
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  quantity: {
    color: '#333',
    fontWeight: '500',
  },
  cost: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  productNotes: {
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  productDivider: {
    marginTop: 8,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    borderColor: '#F44336',
  },
  modalContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  modalText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    borderColor: '#666',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
});