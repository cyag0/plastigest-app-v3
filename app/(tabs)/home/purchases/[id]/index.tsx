import palette from "@/constants/palette";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import PurchasesForm from "../form";

export default function PurchaseDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const purchaseId = params.id as string;

  return <PurchasesForm id={purchaseId} readonly />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  purchaseNumber: {
    fontWeight: "bold",
    color: palette.primary,
  },
  purchaseDate: {
    color: "#666",
    marginTop: 4,
  },
  statusChip: {
    borderWidth: 1,
  },
  totalAmount: {
    fontWeight: "bold",
    color: palette.primary,
    fontSize: 24,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.primary,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
    width: 100,
    color: "#666",
  },
  value: {
    flex: 1,
  },
  commentsValue: {
    marginTop: 4,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    fontStyle: "italic",
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
    borderColor: palette.error,
  },
});
