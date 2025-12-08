import palette from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";

interface PrintLabelsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (quantity: number) => void;
  productName: string;
  loading?: boolean;
}

export default function PrintLabelsModal({
  visible,
  onDismiss,
  onConfirm,
  productName,
  loading = false,
}: PrintLabelsModalProps) {
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const qty = parseInt(quantity);

    if (isNaN(qty) || qty < 1) {
      setError("Ingresa una cantidad válida (mínimo 1)");
      return;
    }

    if (qty > 100) {
      setError("Cantidad máxima: 100 etiquetas");
      return;
    }

    setError("");
    onConfirm(qty);
  };

  const handleDismiss = () => {
    setQuantity("1");
    setError("");
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss}>
        <Dialog.Title>
          <View style={styles.titleContainer}>
            <Ionicons
              name="barcode-outline"
              size={24}
              color={palette.primary}
            />
            <Text style={styles.titleText}>Imprimir Etiquetas</Text>
          </View>
        </Dialog.Title>

        <Dialog.Content>
          <Text style={styles.productName}>{productName}</Text>

          <TextInput
            label="Cantidad de etiquetas"
            value={quantity}
            onChangeText={(text) => {
              setQuantity(text);
              setError("");
            }}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
            error={!!error}
            disabled={loading}
          />

          {error && <HelperText type="error">{error}</HelperText>}

          <Text style={styles.hint}>
            Se generarán etiquetas con código de barras optimizadas para
            impresoras térmicas de 58mm.
          </Text>
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={handleDismiss} disabled={loading}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            Generar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "600",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: palette.textPrimary,
  },
  input: {
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
});
