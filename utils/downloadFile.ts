import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/**
 * Descarga un archivo desde una URL pública (firmada) y lo entrega al
 * usuario: en web lo baja el navegador; en el teléfono se abre el menú de
 * compartir (guardar en Archivos, mandar por WhatsApp, abrir en Excel…).
 */
export async function downloadFile(url: string, fileName: string, mimeType: string): Promise<void> {
  if (Platform.OS === "web") {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const { uri } = await FileSystem.downloadAsync(url, FileSystem.documentDirectory + fileName);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("No se puede compartir el archivo en este dispositivo");
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: fileName });
}
