/**
 * Puerta del modo kiosko. Se monta una sola vez, en el layout raíz (dentro
 * de NavigationHandler, que solo pinta la app con sesión, empresa y
 * sucursal listas).
 *
 * Si el equipo está en modo kiosko para el usuario y la sucursal actuales y
 * la ruta no es /kiosk, regresa a /kiosk: tras recargar en web, reabrir la
 * app, volver a iniciar sesión o abrir un enlace, el equipo vuelve al kiosko.
 * Mientras tanto tapa la pantalla con el fondo del tema para que no se vea
 * la del personal.
 *
 * Aunque a la cuenta le quiten el permiso del kiosko, el equipo sigue en
 * /kiosk: ahí sale "no disponible" con la salida por PIN. Si la puerta lo
 * soltara, el cliente quedaría en la app del personal.
 *
 * También informa a utils/kioskMode la sesión actual, para que
 * isKioskModeActive() (avisos push) sepa si el modo es de esta sesión.
 */
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useKioskModeRecord } from "@/hooks/useKioskMode";
import { isKioskModeFor, setKioskSession } from "@/utils/kioskMode";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export const KIOSK_PATH = "/kiosk";
/**
 * /kiosk/setup se redirige sola a /kiosk en cuanto el modo queda activo (y
 * /kiosk a /kiosk/setup si no lo está): aquí no se navega para no hacerlo dos
 * veces.
 */
const KIOSK_SETUP_PATH = "/kiosk/setup";
/** Si la navegación no ocurrió (el navegador todavía se montaba), se reintenta. */
const RETRY_MS = 1500;

export default function KioskModeGate() {
  const { user, location, isLoading, isSwitchingLocation } = useAuth();
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const record = useKioskModeRecord();
  const [attempt, setAttempt] = useState(0);

  const userId = user?.id ?? null;
  const locationId = location?.id ?? null;

  useEffect(() => {
    setKioskSession(userId != null && locationId != null ? { userId, locationId } : null);
  }, [userId, locationId]);

  const applies = !isLoading && !isSwitchingLocation && isKioskModeFor(record, userId, locationId);
  const away = applies && pathname !== KIOSK_PATH && pathname !== KIOSK_SETUP_PATH;

  useEffect(() => {
    if (!away) return;
    try {
      router.replace(KIOSK_PATH as any);
    } catch (error) {
      console.warn("No se pudo volver al kiosko:", error);
    }
    const retry = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
    return () => clearTimeout(retry);
    // router es estable; attempt reintenta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [away, pathname, attempt]);

  if (!away) return null;
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
      testID="kiosk-mode-gate"
      accessibilityLabel="Abriendo el kiosko"
    />
  );
}
