import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Modal, Portal } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import AppBar from '@/components/App/AppBar';
import transferService from '@/utils/services/transferService';
import type { InventoryTransfer, ShipmentData, ShipmentItem } from '@/utils/services/transferService';

export default function ShipmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transfer, setTransfer] = useState<InventoryTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
  const [packageNumber, setPackageNumber] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [showAutoShipModal, setShowAutoShipModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isShipping, setIsShipping] = useState(false);

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
      
      // Inicializar items de envío con los datos de la petición
      if (data.details) {
        const initialShipmentItems: ShipmentItem[] = data.details.map(detail => ({
          transfer_detail_id: detail.id,
          product_id: detail.product_id,
          quantity_shipped: detail.quantity_requested, // Iniciar con la cantidad solicitada
          unit_cost: detail.unit_cost || 0,
          batch_number: '',
          expiry_date: '',
          notes: ''
        }));
        setShipmentItems(initialShipmentItems);
      }

      // Si viene directamente de aprobación (estado approved), mostrar modal de auto-envío
      if (data.status === 'approved') {
        setShowAutoShipModal(true);
      }
    } catch (error) {
      console.error('Error loading transfer:', error);
      // TODO: Mostrar error con modal nativo
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentItem = (index: number, field: keyof ShipmentItem, value: any) => {
    const updatedItems = [...shipmentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setShipmentItems(updatedItems);
  };

  const handleAutoShip = async () => {
    if (!transfer) return;

    try {
      setShowAutoShipModal(false);
      
      // Preparar datos del envío con las cantidades solicitadas
      const shipmentData: ShipmentData = {
        shipments: shipmentItems,
        package_number: packageNumber || `AUTO-${transfer.id}-${Date.now()}`,
        shipping_evidence: []
      };

      await transferService.ship(transfer.id, shipmentData);
      
      Alert.alert(
        'Envío Registrado',
        'El envío ha sido registrado automáticamente y está en tránsito.',
        [
          {
            text: 'Volver a Envíos',
            onPress: () => router.replace('/home/shipments')
          },
          {
            text: 'Ver Detalles',
            onPress: () => loadTransfer() // Recargar para ver el nuevo estado
          }
        ]
      );
    } catch (error) {
      console.error('Error auto-shipping:', error);
      Alert.alert('Error', 'No se pudo registrar el envío automáticamente');
    }
  };

  const handleManualPrep = () => {
    setShowAutoShipModal(false);
    // Continuar con la preparación manual
  };

  const handleConfirmShipment = async () => {
    if (!transfer) return;

    console.log('🔄 Iniciando confirmación de envío...');

    // Validar que todos los items tengan cantidad > 0
    const validItems = shipmentItems.filter(item => item.quantity_shipped > 0);
    
    console.log('📊 Validation:', {
      totalItems: shipmentItems.length,
      validItems: validItems.length,
      items: shipmentItems.map(item => ({
        product_id: item.product_id,
        quantity_shipped: item.quantity_shipped
      }))
    });
    
    if (validItems.length === 0) {
      console.log('❌ No hay items válidos para enviar');
      // TODO: Mostrar error con modal nativo
      return;
    }

    console.log('✅ Mostrando modal de confirmación');
    setShowConfirmModal(true);
  };

  const executeShipment = async () => {
    if (!transfer) return;

    const validItems = shipmentItems.filter(item => item.quantity_shipped > 0);
    
    console.log('🚚 Ejecutando envío...', {
      transferId: transfer.id,
      validItems: validItems.length,
      packageNumber
    });
    
    try {
      setIsShipping(true);
      const shipmentData: ShipmentData = {
        shipments: validItems,
        package_number: packageNumber,
        shipping_evidence: []
      };

      console.log('📦 Datos de envío:', shipmentData);

      const result = await transferService.ship(transfer.id, shipmentData);
      
      console.log('✅ Envío exitoso:', result);
      
      setShowConfirmModal(false);
      setIsShipping(false);
      
      // Volver a la lista de envíos
      router.replace('/home/shipments');
      
    } catch (error) {
      console.error('❌ Error confirming shipment:', error);
      setIsShipping(false);
      setShowConfirmModal(false);
      // TODO: Mostrar error con modal nativo
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'in_transit':
        return '#FF9800';
      case 'completed':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Lista para Envío';
      case 'in_transit':
        return 'En Tránsito';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppBar title="Preparar Envío" showBackButton />
        <View style={styles.loadingContainer}>
          <Text>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!transfer) {
    return (
      <View style={styles.container}>
        <AppBar title="Preparar Envío" showBackButton />
        <View style={styles.loadingContainer}>
          <Text>No se encontró la transferencia</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar title="Preparar Envío" showBackButton />
      
      <ScrollView style={styles.content}>
        {/* Información General */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Text variant="headlineSmall">Transferencia #{transfer.id}</Text>
              <Chip 
                mode="flat" 
                style={{ backgroundColor: getStatusColor(transfer.status) }}
                textStyle={{ color: 'white' }}
              >
                {getStatusLabel(transfer.status)}
              </Chip>
            </View>

            <View style={styles.transferInfo}>
              <View style={styles.locationCard}>
                <Text variant="bodyLarge" style={styles.locationTitle}>📍 Origen:</Text>
                <Text variant="bodyMedium">{transfer.from_location?.name || transfer.fromLocation?.name}</Text>
              </View>
              
              <View style={styles.locationCard}>
                <Text variant="bodyLarge" style={styles.locationTitle}>🎯 Destino:</Text>
                <Text variant="bodyMedium">{transfer.to_location?.name || transfer.toLocation?.name}</Text>
              </View>
            </View>

            <Text variant="bodyMedium" style={styles.infoText}>
              📅 Aprobada: {transfer.approved_at ? formatDate(transfer.approved_at) : 'N/A'}
            </Text>
          </Card.Content>
        </Card>

        {/* Información del Envío */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📦 Información del Envío
            </Text>
            
            <TextInput
              label="Número de Paquete (Opcional)"
              value={packageNumber}
              onChangeText={setPackageNumber}
              style={styles.input}
              placeholder="Ej: PKG-001"
            />
            
            <TextInput
              label="Notas del Envío (Opcional)"
              value={shippingNotes}
              onChangeText={setShippingNotes}
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Observaciones sobre el envío..."
            />
          </Card.Content>
        </Card>

        {/* Productos a Enviar */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📋 Productos a Enviar
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Puede modificar las cantidades según disponibilidad
            </Text>

            {shipmentItems.map((item, index) => {
              const detail = transfer.details?.find(d => d.id === item.transfer_detail_id);
              if (!detail) return null;

              return (
                <View key={index} style={styles.productItem}>
                  <Text variant="bodyLarge" style={styles.productName}>
                    {detail.product?.name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.productCode}>
                    SKU: {detail.product?.code} | Código: {detail.product?.sku}
                  </Text>
                  
                  <View style={styles.stockInfo}>
                    <Text variant="bodySmall" style={styles.stockLabel}>
                      📦 Existencia disponible: 
                    </Text>
                    <Chip 
                      compact 
                      style={[styles.stockChip, { 
                        backgroundColor: (detail.available_stock || 0) > 0 ? '#E8F5E8' : '#FFE8E8' 
                      }]}
                      textStyle={{ 
                        color: (detail.available_stock || 0) > 0 ? '#2E7D32' : '#C62828',
                        fontSize: 12 
                      }}
                    >
                      {detail.available_stock || 0}
                    </Chip>
                  </View>

                  <View style={styles.quantityRow}>
                    <View style={styles.quantityInfo}>
                      <Text variant="bodySmall" style={styles.quantityLabel}>
                        📝 Solicitado: {detail.quantity_requested}
                      </Text>
                    </View>
                    
                    <View style={styles.quantityInput}>
                      <TextInput
                        label="Cantidad a Enviar *"
                        value={item.quantity_shipped.toString()}
                        onChangeText={(value) => {
                          const numValue = parseFloat(value) || 0;
                          updateShipmentItem(index, 'quantity_shipped', numValue);
                        }}
                        keyboardType="numeric"
                        style={styles.smallInput}
                        dense
                      />
                    </View>
                  </View>

                  <View style={styles.productExtras}>
                    <TextInput
                      label="Costo Unitario"
                      value={item.unit_cost.toString()}
                      onChangeText={(value) => {
                        const numValue = parseFloat(value) || 0;
                        updateShipmentItem(index, 'unit_cost', numValue);
                      }}
                      keyboardType="numeric"
                      style={[styles.smallInput, { flex: 1, marginRight: 8 }]}
                      dense
                    />
                    
                    <TextInput
                      label="Lote"
                      value={item.batch_number}
                      onChangeText={(value) => updateShipmentItem(index, 'batch_number', value)}
                      style={[styles.smallInput, { flex: 1 }]}
                      placeholder="Ej: L001"
                      dense
                    />
                  </View>
                  
                  <TextInput
                    label="Notas del Producto"
                    value={item.notes}
                    onChangeText={(value) => updateShipmentItem(index, 'notes', value)}
                    style={styles.input}
                    placeholder="Observaciones sobre este producto..."
                    multiline
                    numberOfLines={2}
                    dense
                  />

                  {index < shipmentItems.length - 1 && (
                    <View style={styles.productDivider} />
                  )}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {/* Botones de Acción */}
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
            onPress={handleConfirmShipment}
            style={[styles.button, styles.confirmButton]}
            labelStyle={{ color: 'white' }}
            disabled={loading || isShipping}
            loading={isShipping}
          >
            {isShipping ? 'Enviando...' : 'Confirmar Envío'}
          </Button>
        </View>
      </ScrollView>

      {/* Modal de Auto-Preparación de Envío */}
      <Portal>
        <Modal
          visible={showAutoShipModal}
          onDismiss={() => setShowAutoShipModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                🚚 Preparar Envío
              </Text>
              <Text variant="bodyMedium" style={styles.modalText}>
                Esta petición acaba de ser aprobada. ¿Deseas registrar el envío 
                automáticamente con las cantidades solicitadas o prepararlo manualmente?
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={handleManualPrep}
                  style={[styles.button, styles.cancelButton]}
                >
                  Preparar Manualmente
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAutoShip}
                  style={[styles.button, styles.confirmButton]}
                >
                  Enviar Automáticamente
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>

        {/* Modal de Confirmación de Envío */}
        <Modal
          visible={showConfirmModal}
          onDismiss={() => !isShipping && setShowConfirmModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                📦 Confirmar Envío
              </Text>
              <Text variant="bodyMedium" style={styles.modalText}>
                ¿Estás seguro de que quieres enviar estos productos? 
                Esta acción no se puede deshacer.
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowConfirmModal(false)}
                  disabled={isShipping}
                  style={[styles.button, styles.cancelButton]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={executeShipment}
                  loading={isShipping}
                  disabled={isShipping}
                  style={[styles.button, styles.confirmButton]}
                >
                  {isShipping ? 'Enviando...' : 'Confirmar Envío'}
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
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  smallInput: {
    backgroundColor: 'white',
  },
  productItem: {
    paddingVertical: 16,
  },
  productName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCode: {
    color: '#666',
    marginBottom: 8,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockLabel: {
    marginRight: 8,
  },
  stockChip: {
    height: 24,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityInfo: {
    flex: 1,
  },
  quantityLabel: {
    color: '#666',
  },
  quantityInput: {
    flex: 1,
    marginLeft: 16,
  },
  productExtras: {
    flexDirection: 'row',
    marginBottom: 8,
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
