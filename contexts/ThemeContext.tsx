import { Palette, ThemeMode, paletteFor } from "@/constants/palette";
import { useColorScheme } from "@/hooks/useColorScheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Modo del tema. `system` sigue el esquema del sistema operativo
 * (claro si el OS esta en light, oscuro si esta en dark).
 */
export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "@plastigest/theme.preference";

export interface ThemeContextValue {
  /** Preferencia del usuario (light/dark/system). Persistida. */
  preference: ThemePreference;
  /** Modo efectivo aplicado (light/dark) tras resolver `system`. */
  mode: ThemeMode;
  /** Paleta activa (light o dark). Usar en componentes reactivos. */
  colors: Palette;
  /** Cambia la preferencia del usuario. Persiste en AsyncStorage. */
  setPreference: (pref: ThemePreference) => Promise<void>;
  /** True si esta cargando desde AsyncStorage (evita FOUC). */
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Provider del tema. Debe envolver la app desde el root.
 * - Lee la preferencia persistida al montar
 * - Si es `system`, consulta el esquema del OS
 * - Expone la paleta activa para componentes que la usen via hook
 * - PaperProvider en el root usa `mode` para elegir el tema light/dark
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [isLoading, setIsLoading] = useState(true);

  // Cargar preferencia persistida al iniciar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (stored === "light" || stored === "dark" || stored === "system")) {
          setPreferenceState(stored);
        }
      } catch (error) {
        console.warn("Error loading theme preference:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch (error) {
      console.warn("Error saving theme preference:", error);
    }
  }, []);

  // Resolver el modo efectivo
  const mode: ThemeMode = useMemo(() => {
    if (preference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(() => paletteFor(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, mode, colors, setPreference, isLoading }),
    [preference, mode, colors, setPreference, isLoading],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

/**
 * Hook para acceder al tema actual. Devuelve la paleta activa y
 * helpers para cambiarla. Usar en componentes que necesiten
 * reactividad al cambio de tema.
 */
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};

/**
 * Alias corto para usar solo la paleta. Equivalente a
 * `const colors = useTheme().colors`.
 */
export const useColors = (): Palette => useTheme().colors;
