import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import { downloadFile } from "./downloadFile";
import Services from "./services";

/**
 * Imprimir los documentos que genera el backend (ticket de venta, corte de
 * turno, remisión). Recibe la URL firmada del PDF.
 *
 *  - Web: abre directo el diálogo de impresión del navegador (la impresora
 *    térmica de la caja se elige ahí). Si el navegador no lo permite, abre el
 *    PDF en otra pestaña.
 *  - Teléfono: lo manda al servicio de impresión del sistema (expo-print),
 *    donde aparecen las impresoras Bluetooth/Wi-Fi configuradas. Si la app
 *    instalada todavía no trae ese módulo, abre el menú de compartir.
 */
export async function printPdf(url: string, fileName: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      // Como blob del mismo origen: un iframe de otro dominio no deja
      // llamar a print().
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const objectUrl = URL.createObjectURL(await res.blob());
      const iframe = document.createElement("iframe");
      Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
      iframe.src = objectUrl;
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(objectUrl, "_blank");
        }
        // Se deja un rato: el diálogo de impresión sigue usando el documento.
        setTimeout(() => {
          iframe.remove();
          URL.revokeObjectURL(objectUrl);
        }, 60_000);
      };
      document.body.appendChild(iframe);
    } catch {
      window.open(url, "_blank");
    }
    return;
  }

  // La app instalada puede ser anterior a expo-print (hay que recompilarla
  // para que lo traiga). Se revisa sin cargar el paquete: requerirlo sin su
  // módulo nativo lanza "Cannot find native module 'ExpoPrint'", y aunque el
  // try/catch lo atrapaba, en desarrollo salía la pantalla de error.
  const Print: typeof import("expo-print") | null = requireOptionalNativeModule("ExpoPrint")
    ? require("expo-print")
    : null;

  if (Print?.printAsync) {
    await Print.printAsync({ uri: url });
  } else {
    await downloadFile(url, fileName, "application/pdf");
  }
}

// ─── Ancho del rollo de la impresora térmica (por dispositivo) ──────────────

const TICKET_WIDTH_KEY = "ticket_width_mm";

export async function getTicketWidth(): Promise<58 | 80> {
  try {
    return (await AsyncStorage.getItem(TICKET_WIDTH_KEY)) === "58" ? 58 : 80;
  } catch {
    return 80;
  }
}

export async function setTicketWidth(width: 58 | 80): Promise<void> {
  try {
    await AsyncStorage.setItem(TICKET_WIDTH_KEY, String(width));
  } catch {
    // Sin almacenamiento: se queda el de por defecto.
  }
}

// ─── Atajos por documento ───────────────────────────────────────────────────

export async function printSaleTicket(saleId: number, saleNumber?: string): Promise<void> {
  const url = await Services.print.saleTicketUrl(saleId, await getTicketWidth());
  await printPdf(url, `ticket-${saleNumber ?? saleId}.pdf`);
}

export async function printShiftTicket(sessionId: number): Promise<void> {
  const url = await Services.print.shiftTicketUrl(sessionId, await getTicketWidth());
  await printPdf(url, `corte-turno-${sessionId}.pdf`);
}

export async function printTransferRemission(transferId: number, transferNumber?: string): Promise<void> {
  const url = await Services.print.transferPdfUrl(transferId);
  await printPdf(url, `remision-${transferNumber ?? transferId}.pdf`);
}
