import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import Services from "@/utils/services";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Button, Card, Divider } from "react-native-paper";
import palette from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";

export default function ClienteDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const formRef = useRef<AppFormRef<any>>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    fetchNotes();
  }, [id]);

  // Recargar notas cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [id])
  );

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      // Pasar customer_id como parámetro adicional (será convertido a query string)
      const response = await Services.home.customerNotes.index({ 
        customer_id: Number(id) 
      } as any);
      
      // Manejar respuesta paginada o array
      const notesData = Array.isArray(response.data) 
        ? response.data 
        : response.data.data || [];
      
      setNotes(notesData);
      
      // Calcular total pendiente
      const pending = notesData
        .filter((note: any) => note.status === 'pending')
        .reduce((sum: number, note: any) => sum + parseFloat(note.amount || 0), 0);
      setTotalPending(pending);
    } catch (error) {
      console.error("Error fetching notes:", error);
      setNotes([]);
      setTotalPending(0);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleEdit = () => {
    router.push(`/(tabs)/home/clientes/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await Services.home.clientes.destroy(Number(id));
      router.back();
    } catch (error) {
      console.error("Error deleting cliente:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#666" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
      <View style={{ padding: 16 }}>
        <AppForm
          ref={formRef}
          api={Services.home.clientes}
          id={Number(id)}
          showButtons={false}
        >
          <FormInput
            name="name"
            label="Nombre"
            readOnly
          />
          <FormInput
            name="business_name"
            label="Nombre Comercial"
            readOnly
          />
          <FormInput
            name="social_reason"
            label="Razón Social"
            readOnly
          />
          <FormInput
            name="rfc"
            label="RFC"
            readOnly
          />
          <FormInput
            name="address"
            label="Dirección"
            multiline
            numberOfLines={3}
            readOnly
          />
          <FormInput
            name="phone"
            label="Teléfono"
            readOnly
          />
          <FormInput
            name="email"
            label="Email"
            readOnly
          />
          <FormCheckBox
            name="is_active"
            label="Activo"
            disabled
          />
        </AppForm>

        {/* Botones de acción */}
        <View style={{ gap: 8, marginTop: 16 }}>
          <Button
            mode="contained"
            onPress={handleEdit}
          >
            Editar Cliente
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleDelete}
            textColor={palette.red}
            loading={deleting}
            disabled={deleting}
          >
            Eliminar Cliente
          </Button>
        </View>

        {/* Sección de Notas Pendientes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notas Pendientes</Text>
          
          {/* Total Pendiente */}
          <Card style={styles.totalCard}>
            <Card.Content>
              <Text style={styles.totalLabel}>Total Pendiente</Text>
              <Text style={styles.totalAmount}>
                ${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Card.Content>
          </Card>

          {/* Botón Agregar Nota */}
          <Button
            mode="contained"
            icon="plus"
            onPress={() => router.push(`/(tabs)/home/clientes/${id}/notas/form`)}
            style={{ marginTop: 12 }}
          >
            Agregar Nota
          </Button>

          {/* Lista de Notas */}
          {loadingNotes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay notas registradas</Text>
            </View>
          ) : (
            <View style={styles.notesListContainer}>
              {notes.map((note) => (
                <TouchableOpacity
                  key={note.id}
                  onPress={() => router.push(`/(tabs)/home/clientes/${id}/notas/${note.id}/edit`)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.noteCard}>
                    <Card.Content>
                      <View style={styles.noteHeader}>
                        <Text style={styles.noteDescription}>{note.description}</Text>
                        <View style={[
                          styles.statusBadge,
                          note.status === 'pending' ? styles.statusPending : styles.statusPaid
                        ]}>
                          <Text style={styles.statusText}>
                            {note.status === 'pending' ? 'Pendiente' : 'Pagada'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.noteDetails}>
                        <Text style={styles.noteAmount}>
                          ${parseFloat(note.amount || 0).toLocaleString('es-MX', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </Text>
                        {note.due_date && (
                          <Text style={styles.noteDueDate}>
                            Vence: {new Date(note.due_date).toLocaleDateString('es-MX')}
                          </Text>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  notesSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  totalCard: {
    backgroundColor: palette.primary,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  notesListContainer: {
    marginTop: 16,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#FFF',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteDescription: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusPaid: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.primary,
  },
  noteDueDate: {
    fontSize: 14,
    color: '#666',
  },
});
