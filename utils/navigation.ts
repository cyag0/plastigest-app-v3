import { router } from "expo-router";

/**
 * Regresa a la pantalla anterior.
 *
 * En web no siempre hay historial (recarga, enlace directo, pestaña nueva):
 * ahí `router.back()` lanza "GO_BACK was not handled" y el usuario se queda
 * en la misma pantalla, por ejemplo después de guardar un formulario. Si no
 * hay a dónde volver, se sube un nivel en la ruta actual
 * (/administration/users/form → /administration/users).
 */
export function goBack(fallback?: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace((fallback ?? parentPath()) as any);
}

function parentPath(): string {
  const pathname =
    typeof window !== "undefined" ? window.location?.pathname : undefined;
  if (!pathname) return "/home";

  const segments = pathname.split("/").filter(Boolean);
  segments.pop();
  return segments.length > 0 ? `/${segments.join("/")}` : "/home";
}
