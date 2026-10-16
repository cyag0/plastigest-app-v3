/**
 * "Modo kiosko": explica qué ve el cliente y cómo paga, pide un PIN (dos
 * veces) e inicia el modo kiosko en este equipo para esta cuenta y sucursal.
 * Desde ahí la app queda fija en /kiosk hasta que alguien sale con el PIN.
 */
import { ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import NoPermissionView from "@/components/App/NoPermissionView";
import KioskButton from "@/components/Kiosk/KioskButton";
import KioskPinPad from "@/components/Kiosk/KioskPinPad";
import { useAuth } from "@/contexts/AuthContext";
import { useKioskModeRecord } from "@/hooks/useKioskMode";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import {
  isKioskModeFor,
  isValidKioskPin,
  KIOSK_PIN_MAX_LENGTH,
  KIOSK_PIN_MIN_LENGTH,
  requestKioskFullscreen,
  startKioskMode,
} from "@/utils/kioskMode";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

type Step = "create" | "confirm";

export default function KioskSetupScreen() {
  const router = useRouter();
  const { user, location, hasPermission } = useAuth();
  const record = useKioskModeRecord();
  const { submitting, run } = useSubmitGuard();
  const [step, setStep] = useState<Step>("create");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Con el modo activo (recién iniciado, o el equipo ya estaba en kiosko) se
  // va al kiosko. KioskModeGate no navega desde esta pantalla.
  const active = isKioskModeFor(record, user?.id, location?.id);
  useEffect(() => {
    if (active) router.replace("/kiosk" as any);
  }, [active, router]);

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40, gap: 22, width: "100%", maxWidth: 760, alignSelf: "center" },
    intro: { fontSize: 16, lineHeight: 24, color: c.textSecondary },
    pinCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      gap: 16,
      alignItems: "center",
    },
    pinTitle: { fontSize: 20, fontWeight: "700", color: c.text, textAlign: "center" },
    pinHint: { fontSize: 15, lineHeight: 22, color: c.textSecondary, textAlign: "center", maxWidth: 420 },
    error: { fontSize: 16, fontWeight: "600", color: c.error, textAlign: "center" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", alignSelf: "stretch" },
    action: { flexGrow: 1, minWidth: 200 },
    who: { fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: "center" },
  }));

  // El guard de rutas ya lo cubre; esto queda por si la pantalla se monta
  // por otro camino.
  if (!hasPermission("sales_kiosk")) {
    return (
      <NoPermissionView title="No tienes permiso para usar el kiosko" requiredPermissions="sales_kiosk" />
    );
  }

  const goConfirm = () => {
    if (!isValidKioskPin(pin)) return;
    setError(null);
    setConfirm("");
    setStep("confirm");
  };

  const restartPin = () => {
    setStep("create");
    setPin("");
    setConfirm("");
    setError(null);
  };

  const start = () => {
    if (submitting || !isValidKioskPin(confirm) || !user || !location) return;
    if (confirm !== pin) {
      setError("Los PIN no coinciden. Escríbelo otra vez.");
      setConfirm("");
      return;
    }
    // Dentro del toque: el navegador solo deja entrar a pantalla completa así.
    requestKioskFullscreen();
    void run(async () => {
      try {
        // Con el modo activo, el efecto de arriba lleva a /kiosk.
        await startKioskMode(pin, { userId: user.id, locationId: location.id });
      } catch {
        setError("No se pudo iniciar el modo kiosko en este equipo. Intenta de nuevo.");
      }
    });
  };

  const creating = step === "create";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Este equipo queda fijo en una pantalla para que tus clientes armen su pedido solos y paguen en caja.
      </Text>

      <ListSection title="Cómo funciona">
        <ListGroup>
          <ListRow
            icon="storefront-outline"
            title="Qué ve el cliente"
            subtitle={`Solo los productos de ${location?.name ?? "la sucursal"}, con foto y precio. No ve el menú, los avisos, los costos ni los datos de tus clientes.`}
          />
          <ListRow
            icon="cash-register"
            title="Cómo paga"
            subtitle="En caja. Al enviar su pedido recibe un número; el cajero lo cobra en el punto de venta, en «Pedidos del kiosko». Si nadie lo cobra, el pedido vence solo y lo apartado se libera."
          />
          <ListRow
            icon="account-lock-outline"
            title="Usa una cuenta solo para el kiosko"
            subtitle="Con un rol que tenga únicamente «Usar el kiosko de autoservicio». Así el equipo no recibe avisos ni puede abrir nada más."
          />
          <ListRow
            icon="cellphone-lock"
            title="En Android, fija la pantalla"
            subtitle="Ajustes → Seguridad → Fijar apps. Así no se puede salir con los botones del sistema."
          />
          <ListRow
            icon="gesture-tap-hold"
            title="Para salir"
            subtitle="Mantén presionado 3 segundos el nombre de la sucursal (arriba en el kiosko) y escribe el PIN."
          />
        </ListGroup>
      </ListSection>

      <ListSection title={creating ? "1. Crea un PIN" : "2. Confirma el PIN"}>
        <View style={styles.pinCard} testID="kiosk-setup-pin-card">
          <Text style={styles.pinTitle}>
            {creating
              ? `Crea un PIN de ${KIOSK_PIN_MIN_LENGTH} a ${KIOSK_PIN_MAX_LENGTH} dígitos`
              : "Escribe el PIN otra vez"}
          </Text>
          <Text style={styles.pinHint}>
            Se pide para salir del modo kiosko. Compártelo solo con el personal.
          </Text>
          <KioskPinPad
            key={step}
            value={creating ? pin : confirm}
            onChange={(next) => {
              if (error) setError(null);
              if (creating) setPin(next);
              else setConfirm(next);
            }}
            disabled={submitting}
            onSubmit={creating ? goConfirm : start}
            testIDPrefix="kiosk-setup-pin"
          />
          {error ? (
            <Text style={styles.error} testID="kiosk-setup-error" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          {creating ? (
            <View style={styles.actions}>
              <KioskButton
                label="Siguiente"
                iconRight="arrow-right"
                onPress={goConfirm}
                disabled={!isValidKioskPin(pin)}
                testID="kiosk-setup-next"
                style={styles.action}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <KioskButton
                label="Cambiar PIN"
                variant="secondary"
                icon="arrow-left"
                onPress={restartPin}
                disabled={submitting}
                testID="kiosk-setup-back"
                style={styles.action}
              />
              <KioskButton
                label="Iniciar modo kiosko"
                icon="lock-outline"
                onPress={start}
                disabled={!isValidKioskPin(confirm)}
                loading={submitting}
                testID="kiosk-setup-start"
                style={styles.action}
              />
            </View>
          )}
        </View>
      </ListSection>

      {user && location ? (
        <Text style={styles.who}>
          El kiosko queda en {location.name}, con tu cuenta ({user.name}).
        </Text>
      ) : null}
    </ScrollView>
  );
}
