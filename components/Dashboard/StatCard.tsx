import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
}

export default function StatCard({
  icon,
  value,
  label,
  color = palette.primary,
}: StatCardProps) {
  return (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>

        <View style={styles.statInfo}>
          <MaterialCommunityIcons name={icon as any} size={32} color={color} />
          <Text style={styles.statValue}>{value}</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: palette.card,
    elevation: 1,
  },
  statContent: {
    justifyContent: "center",
    padding: 8,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.text,
  },
  statLabel: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
});
