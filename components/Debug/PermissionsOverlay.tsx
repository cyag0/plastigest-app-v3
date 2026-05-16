/**
 * PermissionsOverlay — componente flotante de DEBUG.
 * Muestra los permisos del usuario autenticado en la empresa seleccionada.
 * Eliminar o no montar en producción.
 */
import { useAuth } from "@/contexts/AuthContext";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PermissionsOverlay() {
  const { permissions, selectedCompany, user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  if (!user) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.85}
      >
        <Text style={styles.badgeText}>
          🔑 {permissions.length} permisos {expanded ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {selectedCompany?.name ?? "Sin empresa"} — {user.name}
          </Text>
          <ScrollView style={styles.list} nestedScrollEnabled>
            {permissions.length === 0 ? (
              <Text style={styles.empty}>Sin permisos</Text>
            ) : (
              permissions.map((p) => (
                <Text key={p} style={styles.item}>
                  • {p}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 90,
    right: 12,
    zIndex: 9999,
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    opacity: 0.92,
  },
  badgeText: {
    color: "#00e5ff",
    fontSize: 12,
    fontWeight: "700",
  },
  panel: {
    marginTop: 6,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 12,
    width: 240,
    maxHeight: 320,
    opacity: 0.95,
  },
  panelTitle: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  item: {
    color: "#a8ff78",
    fontSize: 11,
    lineHeight: 20,
    fontFamily: "SpaceMono",
  },
  empty: {
    color: "#ff6b6b",
    fontSize: 11,
  },
});
