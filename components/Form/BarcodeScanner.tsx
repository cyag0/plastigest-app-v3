import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";

interface BarcodeScannerProps {
  onScanned: (code: string) => void;
}

export interface BarcodeScannerRef {
  open: () => void;
  close: () => void;
}

const BarcodeScanner = forwardRef<BarcodeScannerRef, BarcodeScannerProps>(
  ({ onScanned }, ref) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        setVisible(true);
        setScanned(false);
      },
      close: () => {
        setVisible(false);
        setScanned(false);
      },
    }));

    const handleBarCodeScanned = ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      onScanned(data);
      setVisible(false);
    };

    const handleClose = () => {
      setScanned(false);
      setVisible(false);
    };

    if (!visible) return null;

    // Requesting permission
    if (!permission) {
      return (
        <Modal
          visible={visible}
          animationType="slide"
          onRequestClose={handleClose}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text variant="headlineSmall" style={styles.title}>
                Escáner de Código de Barras
              </Text>
              <IconButton icon="close" onPress={handleClose} />
            </View>
            <View style={styles.messageContainer}>
              <Text>Solicitando permiso para usar la cámara...</Text>
            </View>
          </View>
        </Modal>
      );
    }

    // Permission not granted
    if (!permission.granted) {
      return (
        <Modal
          visible={visible}
          animationType="slide"
          onRequestClose={handleClose}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text variant="headlineSmall" style={styles.title}>
                Escáner de Código de Barras
              </Text>
              <IconButton icon="close" onPress={handleClose} />
            </View>
            <View style={styles.messageContainer}>
              <MaterialCommunityIcons
                name="camera-off"
                size={64}
                color={palette.error}
                style={{ marginBottom: 16 }}
              />
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                Sin acceso a la cámara
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary, textAlign: "center" }}
              >
                Necesitas otorgar permisos de cámara para usar el escáner de
                códigos de barras
              </Text>
              <Button
                mode="contained"
                onPress={requestPermission}
                style={{ marginTop: 24 }}
              >
                Otorgar Permiso
              </Button>
              <Button
                mode="text"
                onPress={handleClose}
                style={{ marginTop: 8 }}
              >
                Cancelar
              </Button>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Escanear Código de Barras
            </Text>
            <IconButton icon="close" onPress={handleClose} iconColor="#fff" />
          </View>

          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  "aztec",
                  "ean13",
                  "ean8",
                  "qr",
                  "pdf417",
                  "upc_e",
                  "datamatrix",
                  "code39",
                  "code93",
                  "itf14",
                  "codabar",
                  "code128",
                  "upc_a",
                ],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            />

            {/* Overlay con marco de escaneo */}
            <View style={styles.overlay}>
              <View style={styles.unfocusedContainer} />
              <View style={styles.middleContainer}>
                <View style={styles.unfocusedContainer} />
                <View style={styles.focusedContainer}>
                  {/* Esquinas del marco */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <View style={styles.unfocusedContainer} />
              </View>
              <View style={styles.unfocusedContainer} />
            </View>
          </View>

          <View style={styles.instructionsContainer}>
            <MaterialCommunityIcons
              name="barcode-scan"
              size={48}
              color={palette.primary}
              style={{ marginBottom: 12 }}
            />
            <Text
              variant="titleMedium"
              style={{ color: "#fff", marginBottom: 8 }}
            >
              Apunta la cámara al código de barras
            </Text>
            <Text variant="bodyMedium" style={{ color: "#fff", opacity: 0.8 }}>
              El escaneo se realizará automáticamente
            </Text>

            {scanned && (
              <Button
                mode="contained"
                onPress={() => setScanned(false)}
                style={{ marginTop: 16 }}
              >
                Escanear de nuevo
              </Button>
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

export default BarcodeScanner;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: palette.primary,
  },
  title: {
    color: "#fff",
    fontWeight: "bold",
  },
  scannerContainer: {
    flex: 1,
    position: "relative",
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  middleContainer: {
    flexDirection: "row",
    height: 250,
  },
  focusedContainer: {
    width: 300,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: palette.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionsContainer: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
});
