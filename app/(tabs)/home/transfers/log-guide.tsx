import palette from "@/constants/palette";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Divider, Text } from "react-native-paper";

const statuses = [
  {
    key: "pending",
    title: "Pendiente",
    description:
      "La solicitud fue creada y está esperando revisión en la ubicación origen.",
    color: palette.warning,
  },
  {
    key: "approved",
    title: "Aprobada",
    description:
      "La solicitud fue aceptada. El origen ya puede preparar y enviar el movimiento.",
    color: palette.info,
  },
  {
    key: "in_transit",
    title: "En tránsito",
    description: "El envío salió de origen y va camino al destino.",
    color: palette.primary,
  },
  {
    key: "completed",
    title: "Completada",
    description:
      "El destino recibió correctamente la transferencia y el proceso terminó.",
    color: palette.success,
  },
  {
    key: "rejected",
    title: "Rechazada",
    description:
      "La solicitud no fue aceptada en revisión y no continúa el flujo.",
    color: palette.error,
  },
  {
    key: "cancelled",
    title: "Cancelada",
    description: "La solicitud fue anulada antes de completarse.",
    color: palette.textSecondary,
  },
];

export default function TransferLogGuideScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Como leer el log de transferencias</Text>
      <Text style={styles.subtitle}>
        Esta guia explica que significa cada estado y por que una transferencia
        aparece en pendientes o en historial.
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Flujo recomendado</Text>
          <View style={styles.flowRow}>
            <Text style={styles.flowStep}>1) Pendiente</Text>
            <Text style={styles.flowArrow}>→</Text>
            <Text style={styles.flowStep}>2) Aprobada</Text>
            <Text style={styles.flowArrow}>→</Text>
            <Text style={styles.flowStep}>3) En tránsito</Text>
            <Text style={styles.flowArrow}>→</Text>
            <Text style={styles.flowStep}>4) Completada</Text>
          </View>
          <Text style={styles.helpText}>
            Si la solicitud no procede, puede terminar en Rechazada o Cancelada.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Estados del log</Text>
          {statuses.map((status, index) => (
            <View key={status.key}>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: status.color,
                    },
                  ]}
                />
                <View style={styles.statusTextWrap}>
                  <Text style={styles.statusTitle}>{status.title}</Text>
                  <Text style={styles.statusDescription}>
                    {status.description}
                  </Text>
                </View>
              </View>
              {index < statuses.length - 1 && (
                <Divider style={styles.divider} />
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Como se separan las listas</Text>
          <Text style={styles.helpText}>
            Pendientes: muestra pending, approved e in_transit.
          </Text>
          <Text style={styles.helpText}>
            Historial: muestra completed, rejected y cancelled.
          </Text>
          <Text style={styles.helpText}>
            Si no encuentras una transferencia, revisa su ultimo estado para
            saber en que vista debe aparecer.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.text,
  },
  subtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 10,
  },
  flowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  flowStep: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.text,
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  flowArrow: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: "700",
  },
  helpText: {
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  statusTextWrap: {
    flex: 1,
    gap: 3,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
  },
  statusDescription: {
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 19,
  },
  divider: {
    marginVertical: 2,
  },
});
