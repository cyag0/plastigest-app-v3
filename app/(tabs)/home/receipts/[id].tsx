import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Modal, Portal } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import AppBar from '@/components/App/AppBar';
import transferService from '@/utils/services/transferService';
import type { InventoryTransfer, ReceiptData, ReceiptItem } from '@/utils/services/transferService';

export default function ReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transfer, setTransfer] = useState<InventoryTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');

  useEffect(() => {
    if (id) {
      loadTransfer();
    }
  }, [id]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const data = await transferService.getTransfer(Number(id));
      setTransfer(data);
      
      console.log('🔍 Transfer data loaded:', {
        id: data.id,
        shipments_count: data.shipments?.length || 0,
        shipments: data.shipments?.map(s => ({
          id: s.id,
          product_id: s.product_id,
          product_name: s.product?.name,
          product_code: s.product?.code
        }))
      });
      
      // Inicializar items de recepción basados en los envíos
      if (data.shipments) {
        const initialReceiptItems: ReceiptItem[] = data.shipments.map(shipment => ({
          shipment_id: shipment.id,
          quantity_received: shipment.quantity_shipped, // Iniciar con la cantidad enviada
          damage_report: ''
        }));
        setReceiptItems(initialReceiptItems);
      }
    } catch (error) {
      console.error('Error loading transfer:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReceiptItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const updated = [...receiptItems];
    updated[index] = { ...updated[index], [field]: value };
    setReceiptItems(updated);
  };

  const handleConfirmReceipt = async () => {
    if (!transfer) return;

    console.log('🧾 Iniciando confirmación de recibo...');

    // Validar que hay items para recibir
    const validItems = receiptItems.filter(item => item.quantity_received > 0);
    
    if (validItems.length === 0) {
      console.log('❌ No hay items para recibir');
      return;
    }

    console.log('✅ Mostrando modal de confirmación');
    setShowConfirmModal(true);
  };

  const executeReceipt = async () => {
    if (!transfer) return;

    const validItems = receiptItems.filter(item => item.quantity_received > 0);
    
    console.log('🧾 Ejecutando recepción...', {
      transferId: transfer.id,
      validItems: validItems.length
    });
    
    try {
      setIsReceiving(true);
      
      // Verificar si hay diferencias
      const hasDifferences = receiptItems.some(item => {
        const shipment = transfer.shipments?.find(s => s.id === item.shipment_id);
        return shipment && item.quantity_received !== shipment.quantity_shipped;
      });

      const receiptData: ReceiptData = {
        received: validItems,
        received_complete: !hasDifferences,
        has_differences: hasDifferences,
        difference_notes: hasDifferences ? generalNotes : null
      };

      console.log('📦 Datos de recepción:', receiptData);

      const result = await transferService.receive(transfer.id, receiptData);
      
      console.log('✅ Recepción exitosa:', result);
      
      setShowConfirmModal(false);
      setIsReceiving(false);
      
      // Volver a la lista de recibos
      router.replace('/home/receipts');
      
    } catch (error) {
      console.error('❌ Error confirming receipt:', error);
      setIsReceiving(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppBar title="Detalle de Recibo" showBackButton />
        <View style={styles.centered}>
          <Text>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!transfer) {
    return (
      <View style={styles.container}>
        <AppBar title="Detalle de Recibo" showBackButton />
        <View style={styles.centered}>
          <Text>Transferencia no encontrada</Text>
        </View>
      </View>
    );
  }

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { icon: string; color: string; label: string }> = {
      in_transit: { icon: "truck-delivery", color: "#FF9800", label: "En Tránsito" },
      completed: { icon: "check-all", color: "#4CAF50", label: "Completada" },
      rejected: { icon: "close-circle", color: "#F44336", label: "Rechazada" },
    };
    return statusMap[status] || { icon: "help-circle-outline", color: "#9E9E9E", label: "Desconocido" };
  };

  const statusInfo = getStatusInfo(transfer.status);
  const canReceive = transfer.status === 'in_transit';

  return (
    <View style={styles.container}>
      <AppBar title={`Recibo #${transfer.transfer_number}`} showBackButton />
      
      <ScrollView style={styles.scrollView}>
        {/* Header de la Transferencia */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Text variant="headlineSmall">{transfer.transfer_number}</Text>
              <Chip 
                style={[styles.statusChip, { backgroundColor: statusInfo.color + "20" }]}
                textStyle={{ color: statusInfo.color }}
                icon={statusInfo.icon as any}
              >
                {statusInfo.label}
              </Chip>
            </View>

            <View style={styles.transferInfo}>
              <View style={styles.locationCard}>
                <Text style={styles.locationTitle}>📤 Origen</Text>
                <Text>{transfer.from_location?.name}</Text>
              </View>
              <View style={styles.locationCard}>
                <Text style={styles.locationTitle}>📥 Destino</Text>
                <Text>{transfer.to_location?.name}</Text>
              </View>
            </View>

            <Text style={styles.infoText}>
              Enviado: {transfer.shipped_at ? new Date(transfer.shipped_at).toLocaleString() : 'N/A'}
            </Text>
            {transfer.received_at && (
              <Text style={styles.infoText}>
                Recibido: {new Date(transfer.received_at).toLocaleString()}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Productos Enviados/Para Recibir */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📦 Productos {canReceive ? 'para Recibir' : 'Recibidos'}
            </Text>
            {!canReceive && (
              <Text style={styles.subtitle}>
                Revisa las cantidades que fueron recibidas
              </Text>
            )}

            {transfer.shipments?.map((shipment, index) => {
              const receiptItem = receiptItems[index];
              const hasDifference = receiptItem && receiptItem.quantity_received !== shipment.quantity_shipped;
              
              return (
                <View key={shipment.id} style={styles.productItem}>
                  <View style={styles.productHeader}>
                    <Text variant="titleSmall">
                      {shipment.product?.name || 'Producto desconocido'}
                    </Text>
                    <Text style={styles.productCode}>
                      SKU: {shipment.product?.code || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.quantityInfo}>
                    <Text>Enviado: {shipment.quantity_shipped} unidades</Text>
                    {shipment.unit_cost > 0 && (
                      <Text>Costo unitario: ${shipment.unit_cost}</Text>
                    )}
                    {shipment.batch_number && (
                      <Text>Lote: {shipment.batch_number}</Text>
                    )}
                  </View>

                  {canReceive ? (
                    <View style={styles.receiptControls}>
                      <TextInput
                        label="Cantidad Recibida"
                        value={receiptItem?.quantity_received?.toString() || '0'}
                        onChangeText={(value) => updateReceiptItem(index, 'quantity_received', parseFloat(value) || 0)}
                        style={styles.quantityInput}
                        keyboardType="numeric"
                        right={<TextInput.Affix text="unidades" />}
                      />
                      
                      {hasDifference && (
                        <Chip 
                          style={styles.differenceChip}
                          textStyle={styles.differenceText}
                          icon="alert"
                        >
                          Diferencia detectada
                        </Chip>
                      )}
                      
                      <TextInput
                        label="Reporte de daños/faltantes (opcional)"
                        value={receiptItem?.damage_report || ''}
                        onChangeText={(value) => updateReceiptItem(index, 'damage_report', value)}
                        style={styles.input}
                        placeholder="Productos dañados, faltantes, etc..."
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                  ) : (
                    <View style={styles.receivedInfo}>
                      <Text>Recibido: {shipment.quantity_received || 0} unidades</Text>
                      {shipment.damage_report && (
                        <Text style={styles.damageReport}>
                          ⚠️ {shipment.damage_report}
                        </Text>
                      )}
                    </View>
                  )}

                  {index < (transfer.shipments?.length || 0) - 1 && (
                    <View style={styles.productDivider} />
                  )}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {/* Notas Generales (solo si puede recibir) */}
        {canReceive && (
          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Notas Generales de Recepción"
                value={generalNotes}
                onChangeText={setGeneralNotes}
                style={styles.input}
                placeholder="Observaciones generales sobre la recepción..."
                multiline
                numberOfLines={3}
              />
            </Card.Content>
          </Card>
        )}

        {/* Botones de Acción */}
        {canReceive && (
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={[styles.button, styles.cancelButton]}
            >
              Cancelar
            </Button>
            
            <Button
              mode="contained"
              onPress={handleConfirmReceipt}
              style={[styles.button, styles.confirmButton]}
              labelStyle={{ color: 'white' }}
              disabled={loading || isReceiving}
              loading={isReceiving}
            >
              {isReceiving ? 'Confirmando...' : 'Confirmar Recepción'}
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Modal de Confirmación de Recepción */}
      <Portal>
        <Modal
          visible={showConfirmModal}
          onDismiss={() => !isReceiving && setShowConfirmModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                📥 Confirmar Recepción
              </Text>
              <Text variant="bodyMedium" style={styles.modalText}>
                ¿Confirmas que has recibido los productos según las cantidades indicadas? 
                Esta acción actualizará el inventario.
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowConfirmModal(false)}
                  disabled={isReceiving}
                  style={[styles.button, styles.cancelButton]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={executeReceipt}
                  loading={isReceiving}
                  disabled={isReceiving}
                  style={[styles.button, styles.confirmButton]}
                >
                  {isReceiving ? 'Procesando...' : 'Confirmar Recepción'}
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
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
  statusChip: {
    alignSelf: 'flex-start',
  },
  transferInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  locationTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: '#666',
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FF9800',
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  productItem: {
    paddingVertical: 16,
  },
  productHeader: {
    marginBottom: 8,
  },
  productCode: {
    color: '#666',
    fontSize: 12,
  },
  quantityInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  receiptControls: {
    gap: 12,
  },
  receivedInfo: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
  },
  quantityInput: {
    backgroundColor: 'white',
  },
  input: {
    backgroundColor: 'white',
  },
  differenceChip: {
    backgroundColor: '#FFF3CD',
    borderColor: '#F0AD4E',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  differenceText: {
    color: '#8A6D3B',
  },
  damageReport: {
    color: '#F44336',
    marginTop: 4,
    fontStyle: 'italic',
  },
  productDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 16,
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
  cancelButton: {
    borderColor: '#666',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
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
});
