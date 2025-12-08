import { usePOS } from "@/components/Views/POSV2/Context";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { addToCart } = usePOS();
  const alerts = useAlerts();
  const router = useRouter();

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);

    try {
      console.log("Código escaneado:", data);

      // Buscar el producto por código de barras
      const response = await Services.products.index({
        all: true,
        search: data,
      });

      if (
        response.data &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        const product = response.data.data[0];

        // Agregar al carrito con cantidad 1
        addToCart(product, 1);

        alerts.success(`${product.name} agregado al carrito`);

        // Esperar un momento y permitir escanear de nuevo
        setTimeout(() => {
          setScanned(false);
        }, 1500);
      } else {
        alerts.error("Producto no encontrado");
        // Permitir escanear de nuevo inmediatamente
        setTimeout(() => {
          setScanned(false);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Error al buscar producto:", error);
      alerts.error("Error al buscar el producto");
      // Permitir escanear de nuevo inmediatamente
      setTimeout(() => {
        setScanned(false);
      }, 1000);
    }
  };

  // Requesting permission
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Text>Solicitando permiso para usar la cámara...</Text>
        </View>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={styles.container}>
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
            Necesitas otorgar permisos de cámara para usar el escáner de códigos
            de barras
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
            onPress={() => router.back()}
            style={{ marginTop: 8 }}
          >
            Volver
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
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
        <Text variant="titleMedium" style={{ color: "#fff", marginBottom: 8 }}>
          Apunta la cámara al código de barras
        </Text>
        <Text variant="bodyMedium" style={{ color: "#fff", opacity: 0.8 }}>
          {scanned
            ? "Procesando..."
            : "El escaneo se realizará automáticamente"}
        </Text>

        <Button
          mode="contained"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
          buttonColor={palette.error}
        >
          Volver a Productos
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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
