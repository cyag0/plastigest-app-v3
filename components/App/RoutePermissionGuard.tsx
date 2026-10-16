/**
 * Guard de rutas. Cada layout con navegador (Stack/Tabs de (tabs) y
 * (stacks)) lo pone como `screenLayout`: envuelve cada pantalla y, ya con los
 * permisos cargados, la compara con el mapa central
 * (utils/permissions/routePermissions.ts). Sin permiso muestra la vista "sin
 * permiso" en lugar de la pantalla, debajo del encabezado del navegador. La
 * pantalla ni se monta, así no dispara peticiones que el backend rechazaría.
 *
 * La decisión depende de la pantalla y sus parámetros, no de cómo se llegó:
 * funciona igual al navegar dentro de la app, con una URL directa en web o
 * con un deep link (push de notificación).
 *
 *   const screenLayout = routeGuardLayout("(tabs)/home");
 *   <Stack screenLayout={screenLayout} …>
 *
 * El argumento es la carpeta del layout dentro de app/. Login, selección de
 * empresa/sucursal y las pantallas de "cualquier usuario" pasan sin revisar.
 */
import EmptyState from "@/components/App/EmptyState";
import NoPermissionView from "@/components/App/NoPermissionView";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/useCan";
import {
  describeRouteRule,
  isRouteGroupKey,
  resolveRouteRule,
  routeRuleForScreen,
} from "@/utils/permissions/routePermissions";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

interface RoutePermissionGuardProps {
  /** Carpeta del layout dentro de app/, p. ej. "(tabs)/home". */
  layoutDir: string;
  /** Nombre de la pantalla en su navegador, p. ej. "cash/sessions/[id]/index". */
  routeName: string;
  /** Parámetros de la pantalla (segmentos dinámicos y query, p. ej. ?id=). */
  params?: object;
  children: React.ReactElement;
}

// Pantallas sin regla ya avisadas en consola (solo desarrollo).
const warnedMissing = new Set<string>();

export function RoutePermissionGuard({
  layoutDir,
  routeName,
  params,
  children,
}: RoutePermissionGuardProps) {
  const {
    user,
    selectedCompany,
    location,
    isLoading,
    isSwitchingLocation,
    permissionsError,
    retryPermissions,
  } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const { can } = useCan();

  const routeKey = `${layoutDir}/${routeName}`;
  const rule = routeRuleForScreen(layoutDir, routeName);
  const resolved = rule ? resolveRouteRule(rule, (params ?? {}) as Record<string, unknown>) : undefined;
  const needsPermission = resolved?.kind === "permissions";
  const allowed =
    resolved?.kind === "permissions"
      ? can(resolved.permissions, { all: resolved.all })
      : true;

  // Los permisos son de la sucursal: se decide con sesión, empresa y sucursal
  // listas (NavigationHandler no muestra la app mientras carga o cambia de
  // sucursal, pero sin empresa sí monta las pantallas para llegar al selector).
  const ready =
    !!user && !!selectedCompany && !!location && !isLoading && !isSwitchingLocation;

  // Última decisión tomada con permisos listos. Mientras no lo están (primera
  // carga, cierre de sesión) se conserva: sin parpadeo de "sin permiso" y sin
  // desmontar una pantalla que ya se estaba viendo.
  const [decision, setDecision] = useState<boolean | null>(null);
  if (ready && needsPermission && decision !== allowed) {
    setDecision(allowed);
  }
  const current = ready ? allowed : decision;

  useEffect(() => {
    if (!__DEV__ || rule !== undefined || warnedMissing.has(routeKey)) return;
    if (isRouteGroupKey(routeKey)) return; // navegador anidado: lo revisa su propio layout
    warnedMissing.add(routeKey);
    console.warn(
      `[permisos] "${routeKey}" no está en ROUTE_PERMISSIONS (utils/permissions/routePermissions.ts): se abre sin revisar permisos.`,
    );
  }, [rule, routeKey]);

  if (!needsPermission) return children;
  if (current === null) return null;
  if (!current && ready && permissionsError) {
    // Los permisos no se pudieron cargar (sin red, error del servidor): no
    // es "sin permiso".
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <EmptyState
          icon="cloud-off-outline"
          title={retrying ? "Cargando tus permisos…" : "No se pudieron cargar tus permisos"}
          description="Revisa tu conexión e inténtalo de nuevo."
          actionLabel={retrying ? undefined : "Reintentar"}
          onAction={() => {
            setRetrying(true);
            retryPermissions().finally(() => setRetrying(false));
          }}
        />
      </View>
    );
  }
  if (!current) {
    return <NoPermissionView requiredPermissions={describeRouteRule(resolved)} />;
  }
  return children;
}

/**
 * `screenLayout` para un navegador: envuelve cada pantalla con el guard.
 * Crear una vez por layout (fuera del componente).
 */
export function routeGuardLayout(layoutDir: string) {
  return function guardScreen({
    route,
    children,
  }: {
    route: { name: string; params?: object };
    children: React.ReactElement;
  }) {
    return (
      <RoutePermissionGuard layoutDir={layoutDir} routeName={route.name} params={route.params}>
        {children}
      </RoutePermissionGuard>
    );
  };
}
