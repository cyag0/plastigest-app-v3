import { useNavigation, useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Salir de una pantalla del catálogo (guardar, cancelar, eliminar): a la
 * anterior si se llegó desde otra pantalla de Administración (la lista o el
 * detalle), o a `fallback` si se abrió por enlace o se recargó la página.
 *
 * Con goBack, una pantalla recargada regresaba a Inicio: las pestañas tienen
 * Inicio como ancla, así que siempre "se puede regresar". Aquí se mira la pila
 * de Administración: si la pantalla es la única, no hay a dónde volver.
 */
export function useLeaveScreen(fallback: string) {
  const navigation = useNavigation();
  const router = useRouter();
  return useCallback(() => {
    const state = navigation.getState?.();
    if (state && state.index > 0) navigation.goBack();
    else router.replace(fallback as any);
  }, [navigation, router, fallback]);
}
