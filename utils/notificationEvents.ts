// Bus de eventos pub/sub para desacoplar usePushNotifications del router.
// El hook se ejecuta dentro de AuthProvider (antes del Stack de expo-router),
// por lo que no puede llamar a useRouter() directamente. En su lugar emite
// eventos a este bus y NavigationHandler (dentro del Stack) los consume.

export interface NotificationOpenedPayload {
  // Clave normalizada del tipo de evento (p.ej. "task_event", "low_stock")
  eventType?: string;
  // ID de la entidad relacionada (task, product, purchase, etc.) como string
  entityId?: string;
  // Mapa crudo de data que llegó en el push (todos los campos como string)
  rawData?: Record<string, string>;
}

type Listener = (payload: NotificationOpenedPayload) => void;

class NotificationEventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(payload: NotificationOpenedPayload): void {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        // Nunca dejamos que un consumidor rompa la cadena
        console.error("notificationEvents listener failed:", error);
      }
    });
  }
}

export const notificationOpenedBus = new NotificationEventBus();
