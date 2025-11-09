import AlertSnackbar from "@/components/AppAlert/AlertSnackbar";
import ConfirmDialog from "@/components/AppAlert/ConfirmDialog";
import React, { createContext, ReactNode, useContext, useState } from "react";

/**
 * Tipos de alerta disponibles
 */
type AlertType = "info" | "warning" | "error" | "success";

/**
 * Opciones para el diálogo de confirmación
 */
interface ConfirmOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
}

/**
 * Opciones para las alertas tipo snackbar
 */
interface AlertOptions {
  title?: string;
  type?: AlertType;
  duration?: number;
}

/**
 * Estado interno del diálogo de confirmación
 */
interface ConfirmState {
  visible: boolean;
  message: string;
  title?: string;
  okText?: string;
  cancelText?: string;
  resolve?: (value: boolean) => void;
}

/**
 * Estado interno del snackbar
 */
interface SnackbarState {
  visible: boolean;
  message: string;
  type: AlertType;
  duration: number;
}

/**
 * API pública del hook useAlerts
 */
interface AlertsAPI {
  /**
   * Muestra un diálogo de confirmación y espera la respuesta del usuario
   * @param message Mensaje a mostrar
   * @param options Opciones del diálogo (título, textos de botones)
   * @returns Promise<boolean> - true si el usuario acepta, false si cancela
   *
   * @example
   * const ok = await alerts.confirm("¿Estás seguro?");
   * if (ok) console.log("Usuario confirmó");
   */
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;

  /**
   * Muestra un snackbar informativo
   * @param message Mensaje a mostrar
   * @param options Opciones del snackbar (tipo, duración)
   *
   * @example
   * alerts.alert("Operación exitosa", { type: "success" });
   */
  alert: (message: string, options?: AlertOptions) => void;

  /**
   * Muestra un snackbar de tipo "success"
   * @param message Mensaje a mostrar
   *
   * @example
   * alerts.success("Producto guardado correctamente");
   */
  success: (message: string) => void;

  /**
   * Muestra un snackbar de tipo "error"
   * @param message Mensaje a mostrar
   *
   * @example
   * alerts.error("No se pudo conectar al servidor");
   */
  error: (message: string) => void;

  /**
   * Muestra un snackbar de tipo "warning"
   * @param message Mensaje a mostrar
   *
   * @example
   * alerts.warning("El stock está bajo");
   */
  warning: (message: string) => void;

  /**
   * Muestra un snackbar de tipo "info"
   * @param message Mensaje a mostrar
   *
   * @example
   * alerts.info("Recuerda guardar los cambios");
   */
  info: (message: string) => void;
}

// Contexto para compartir el estado de las alertas
const AlertsContext = createContext<AlertsAPI | null>(null);

/**
 * AlertsProvider
 *
 * Proveedor de contexto que debe envolver la aplicación para poder
 * usar el hook useAlerts en cualquier componente.
 *
 * @example
 * // En App.tsx o _layout.tsx
 * import { AlertsProvider } from '@/hooks/useAlerts';
 *
 * export default function App() {
 *   return (
 *     <AlertsProvider>
 *       <YourAppContent />
 *     </AlertsProvider>
 *   );
 * }
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    visible: false,
    message: "",
  });

  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    visible: false,
    message: "",
    type: "info",
    duration: 3000,
  });

  /**
   * Muestra un diálogo de confirmación y retorna una Promise
   * que se resuelve con true o false según la acción del usuario
   */
  const confirm = (
    message: string,
    options?: ConfirmOptions
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        visible: true,
        message,
        title: options?.title,
        okText: options?.okText,
        cancelText: options?.cancelText,
        resolve,
      });
    });
  };

  /**
   * Maneja la confirmación del usuario
   */
  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({ ...confirmState, visible: false });
  };

  /**
   * Maneja la cancelación del usuario
   */
  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({ ...confirmState, visible: false });
  };

  /**
   * Muestra un snackbar con el tipo especificado
   */
  const alert = (message: string, options?: AlertOptions) => {
    setSnackbarState({
      visible: true,
      message,
      type: options?.type || "info",
      duration: options?.duration || 3000,
    });
  };

  /**
   * Cierra el snackbar
   */
  const handleSnackbarDismiss = () => {
    setSnackbarState({ ...snackbarState, visible: false });
  };

  // API pública
  const api: AlertsAPI = {
    confirm,
    alert,
    success: (message: string) => alert(message, { type: "success" }),
    error: (message: string) => alert(message, { type: "error" }),
    warning: (message: string) => alert(message, { type: "warning" }),
    info: (message: string) => alert(message, { type: "info" }),
  };

  return (
    <AlertsContext.Provider value={api}>
      {children}

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        visible={confirmState.visible}
        message={confirmState.message}
        title={confirmState.title}
        okText={confirmState.okText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Snackbar para notificaciones */}
      <AlertSnackbar
        visible={snackbarState.visible}
        message={snackbarState.message}
        type={snackbarState.type}
        duration={snackbarState.duration}
        onDismiss={handleSnackbarDismiss}
      />
    </AlertsContext.Provider>
  );
}

/**
 * useAlerts Hook
 *
 * Hook personalizado para acceder a la API de alertas desde cualquier componente.
 * Debe usarse dentro de un componente envuelto por AlertsProvider.
 *
 * @returns AlertsAPI - Objeto con métodos para mostrar alertas y confirmaciones
 * @throws Error si se usa fuera del AlertsProvider
 *
 * @example
 * // En cualquier componente
 * import { useAlerts } from '@/hooks/useAlerts';
 *
 * export default function MyScreen() {
 *   const alerts = useAlerts();
 *
 *   const handleDelete = async () => {
 *     const ok = await alerts.confirm("¿Eliminar este elemento?");
 *     if (ok) {
 *       // Lógica de eliminación
 *       alerts.success("Elemento eliminado correctamente");
 *     }
 *   };
 *
 *   const handleSave = () => {
 *     try {
 *       // Lógica de guardado
 *       alerts.success("Guardado exitosamente");
 *     } catch (error) {
 *       alerts.error("Error al guardar: " + error.message);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleDelete}>Eliminar</Button>
 *       <Button onPress={handleSave}>Guardar</Button>
 *     </View>
 *   );
 * }
 */
export function useAlerts(): AlertsAPI {
  const context = useContext(AlertsContext);

  if (!context) {
    throw new Error(
      "useAlerts debe ser usado dentro de un AlertsProvider. " +
        "Asegúrate de envolver tu aplicación con <AlertsProvider>."
    );
  }

  return context;
}

/**
 * INSTRUCCIONES DE INTEGRACIÓN
 * =============================
 *
 * 1. Instalar dependencias necesarias:
 *    - react-native-paper
 *    - @expo/vector-icons (si usas Expo)
 *
 * 2. Envolver tu aplicación con el AlertsProvider:
 *
 *    // En app/_layout.tsx o App.tsx
 *    import { AlertsProvider } from '@/hooks/useAlerts';
 *    import { PaperProvider } from 'react-native-paper';
 *
 *    export default function RootLayout() {
 *      return (
 *        <PaperProvider>
 *          <AlertsProvider>
 *            <Stack />
 *          </AlertsProvider>
 *        </PaperProvider>
 *      );
 *    }
 *
 * 3. Usar en cualquier componente:
 *
 *    import { useAlerts } from '@/hooks/useAlerts';
 *
 *    export default function MyComponent() {
 *      const alerts = useAlerts();
 *
 *      const handleAction = async () => {
 *        const confirmed = await alerts.confirm(
 *          "¿Estás seguro de continuar?",
 *          { title: "Confirmación", okText: "Sí", cancelText: "No" }
 *        );
 *
 *        if (confirmed) {
 *          alerts.success("Acción completada");
 *        } else {
 *          alerts.info("Acción cancelada");
 *        }
 *      };
 *
 *      return <Button onPress={handleAction}>Ejecutar</Button>;
 *    }
 *
 * EJEMPLOS DE USO
 * ===============
 *
 * // Confirmación simple
 * const ok = await alerts.confirm("¿Eliminar elemento?");
 * if (ok) console.log("Eliminado");
 *
 * // Confirmación con opciones personalizadas
 * const ok = await alerts.confirm("¿Continuar?", {
 *   title: "Atención",
 *   okText: "Sí, continuar",
 *   cancelText: "No, cancelar"
 * });
 *
 * // Notificaciones
 * alerts.success("Operación exitosa");
 * alerts.error("Ocurrió un error");
 * alerts.warning("Cuidado con esto");
 * alerts.info("Información importante");
 *
 * // Alert personalizado
 * alerts.alert("Mensaje personalizado", {
 *   type: "warning",
 *   duration: 5000
 * });
 */
