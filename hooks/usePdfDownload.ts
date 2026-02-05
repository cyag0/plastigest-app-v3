import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Platform } from "react-native";

interface UsePdfDownloadOptions {
  onSuccess?: (uri: string) => void;
  onError?: (error: Error) => void;
  showAlert?: boolean;
}

interface DownloadPdfParams {
  url: string;
  fileName?: string;
}

export function usePdfDownload(options: UsePdfDownloadOptions = {}) {
  const { onSuccess, onError, showAlert = true } = options;
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadPdf = async ({ url, fileName }: DownloadPdfParams) => {
    try {
      setIsDownloading(true);
      setProgress(0);

      // En web, descargar el PDF
      if (Platform.OS === "web") {
        const finalFileName = fileName || `documento_${Date.now()}.pdf`;

        // Crear un enlace temporal para descargar
        const link = document.createElement("a");
        link.href = url;
        link.download = finalFileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        onSuccess?.(url);
        return url;
      }

      // Generar nombre de archivo único si no se proporciona
      const finalFileName = fileName || `documento_${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + finalFileName;

      console.log("Descargando PDF desde:", url);

      // Descargar con callback de progreso
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress) => {
          const progressPercent =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          setProgress(progressPercent * 100);
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error("Error al descargar el PDF");
      }

      console.log("PDF descargado en:", result.uri);

      // Compartir/Abrir el PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Abrir PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        if (showAlert) {
          alert("No se puede abrir el PDF en este dispositivo");
        }
        throw new Error("Sharing no disponible en este dispositivo");
      }

      onSuccess?.(result.uri);
      return result.uri;
    } catch (error) {
      console.error("Error al descargar PDF:", error);

      if (showAlert) {
        alert("Error al descargar el PDF. Por favor, inténtalo de nuevo.");
      }

      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      throw err;
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const downloadPdfFromApi = async (
    endpoint: string,
    params: { fileName?: string } = {}
  ) => {
    // Si es una URL absoluta (comienza con http:// o https://), usarla directamente
    const fullUrl = endpoint.startsWith("http")
      ? endpoint
      : `${process.env.EXPO_PUBLIC_API_URL || ""}${endpoint}`;

    return downloadPdf({
      url: fullUrl,
      fileName: params.fileName,
    });
  };

  return {
    downloadPdf,
    downloadPdfFromApi,
    isDownloading,
    progress,
  };
}

// Utilidad standalone para uso directo sin hooks
export const PdfDownloader = {
  async download(url: string, fileName?: string): Promise<string> {
    // En web, descargar el PDF
    if (Platform.OS === "web") {
      const finalFileName = fileName || `documento_${Date.now()}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = finalFileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return url;
    }

    const finalFileName = fileName || `documento_${Date.now()}.pdf`;
    const fileUri = FileSystem.documentDirectory + finalFileName;

    console.log("Descargando PDF desde:", url);

    const { uri } = await FileSystem.downloadAsync(url, fileUri);

    console.log("PDF descargado en:", uri);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Abrir PDF",
        UTI: "com.adobe.pdf",
      });
    } else {
      throw new Error("No se puede abrir el PDF en este dispositivo");
    }

    return uri;
  },

  async downloadFromApi(endpoint: string, fileName?: string): Promise<string> {
    // Si es una URL absoluta (comienza con http:// o https://), usarla directamente
    const fullUrl = endpoint.startsWith("http")
      ? endpoint
      : `${process.env.EXPO_PUBLIC_API_URL || ""}${endpoint}`;
    return this.download(fullUrl, fileName);
  },
};
