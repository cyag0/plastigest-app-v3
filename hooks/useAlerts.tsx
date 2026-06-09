import AlertSnackbar, {
  AlertSnackbarRef,
} from "@/components/AppAlert/AlertSnackbar";
import ConfirmDialog, {
  ConfirmDialogRef,
} from "@/components/AppAlert/ConfirmDialog";
import React, {
  createContext,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useRef,
} from "react";

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

// Contexto para compartir la API de alertas (expuesto por AlertsProvider)
const AlertsContext = createContext<AlertsAPI | null>(null);

/**
 * Contexto que expone las refs imperativas al ConfirmDialog y al
 * AlertSnackbar. Existe separado del AlertsContext para permitir
 * que `<AlertsDialogs />` se monte al FINAL del árbol y sus
 * `<Portal>` queden ENCIMA de cualquier otro portal del app
 * (por ejemplo, el `ContextSwitcherModal`).
 */
interface AlertsRefs {
  confirmDialogRef: RefObject<ConfirmDialogRef | null>;
  snackbarRef: RefObject<AlertSnackbarRef | null>;
}
const AlertsRefsContext = createContext<AlertsRefs | null>(null);

/**
 * AlertsProvider
 *
 * Proveedor de contexto que debe envolver la aplicación para poder
 * usar el hook useAlerts en cualquier componente. NO renderiza los
 * diálogos aquí: ese trabajo lo hace `<AlertsDialogs />`, que se
 * debe montar en el layout como ÚLTIMO hijo del `PaperProvider`
 * para que sus portales queden al frente del z-index.
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  // Referencias a los componentes usando useImperativeHandle
  const confirmDialogRef = useRef<ConfirmDialogRef | null>(null);
  const snackbarRef = useRef<AlertSnackbarRef | null>(null);

  /**
   * Muestra un diálogo de confirmación y retorna una Promise
   * que se resuelve con true o false según la acción del usuario
   */
  const confirm = useCallback(
    (message: string, options?: ConfirmOptions): Promise<boolean> => {
      return (
        confirmDialogRef.current?.show(message, options) ||
        Promise.resolve(false)
      );
    },
    []
  );

  /**
   * Muestra un snackbar con el tipo especificado
   */
  const alert = useCallback((message: string, options?: AlertOptions) => {
    snackbarRef.current?.show(message, {
      type: options?.type || "info",
      duration: options?.duration || 3000,
    });
  }, []);

  // API pública - usar useRef para que no cambie en cada render
  const api = useRef<AlertsAPI>({
    confirm,
    alert,
    success: (message: string) => alert(message, { type: "success" }),
    error: (message: string) => alert(message, { type: "error" }),
    warning: (message: string) => alert(message, { type: "warning" }),
    info: (message: string) => alert(message, { type: "info" }),
  }).current;

  return (
    <AlertsRefsContext.Provider value={{ confirmDialogRef, snackbarRef }}>
      <AlertsContext.Provider value={api}>
        {children}
      </AlertsContext.Provider>
    </AlertsRefsContext.Provider>
  );
}

/**
 * `AlertsDialogs` monta el `ConfirmDialog` y el `AlertSnackbar` en
 * el punto del árbol donde se coloque. Para que sus portales queden
 * por encima de cualquier otro modal (p. ej. el `ContextSwitcherModal`
 * que se monta dentro del sidebar/AppBar), este componente DEBE
 * renderizarse al final del árbol, justo antes de cerrar el
 * `PaperProvider` en `app/_layout.tsx`.
 */
export function AlertsDialogs() {
  const refs = useContext(AlertsRefsContext);
  if (!refs) {
    // No hay provider: no renderizamos nada. Esto permite usarlo
    // condicionalmente sin romper el árbol en pruebas o storybooks.
    return null;
  }
  return (
    <>
      {/* Diálogo de confirmación */}
      <ConfirmDialog ref={refs.confirmDialogRef} />

      {/* Snackbar para notificaciones */}
      <AlertSnackbar ref={refs.snackbarRef} />
    </>
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
