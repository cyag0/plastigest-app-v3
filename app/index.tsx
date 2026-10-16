import { Redirect } from "expo-router";

/**
 * "/" (la app abre sin enlace profundo). Desde SDK 58 una URL sin ruta propia
 * cae en +not-found, así que "/" manda a login; si ya hay sesión,
 * NavigationHandler sigue a inicio como antes.
 */
export default function Index() {
  return <Redirect href="/login" />;
}
