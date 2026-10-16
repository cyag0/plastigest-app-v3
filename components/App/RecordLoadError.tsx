/**
 * Estado de un registro que no se pudo cargar (detalle o formulario con
 * ?id=), en lugar de un formulario vacío, un spinner sin fin o "no
 * encontrado" ante cualquier falla:
 *
 * - 404: no existe o es de otra sucursal (el backend responde 404 a lo que
 *   el usuario no puede ver desde la sucursal actual), con "Volver".
 * - 403: NoPermissionView.
 * - Otra falla (red, 5xx): el mensaje del servidor con "Reintentar".
 *
 *   } catch (error) {
 *     setProblem(recordLoadProblem(error));
 *   }
 *   ...
 *   if (problem) return <RecordLoadError problem={problem} onRetry={load} />;
 *
 * Pide el registro con `silent: true`: este estado ya explica la falla y el
 * aviso global saldría además.
 */
import NoPermissionView, { HOME_ROUTE } from "@/components/App/NoPermissionView";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { errorMessageOf } from "@/utils/errorNotice";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

export type RecordLoadProblem = {
  kind: "not_found" | "forbidden" | "error";
  /** Texto del servidor (o el de la falla de red) en español. */
  message: string;
};

/** Clasifica el error de la carga de un registro. */
export function recordLoadProblem(
  error: unknown,
  fallback = "No se pudo cargar la información. Inténtalo de nuevo.",
): RecordLoadProblem {
  const status = Number((error as any)?.response?.status);
  const message = errorMessageOf(error, fallback);
  if (status === 404) return { kind: "not_found", message };
  if (status === 403) return { kind: "forbidden", message };
  return { kind: "error", message };
}

export interface RecordLoadErrorProps {
  problem: RecordLoadProblem;
  /** Título del 404, p. ej. "No se encontró el gasto". */
  notFoundTitle?: string;
  /** Explicación del 404 (por defecto: borrado o de otra sucursal). */
  notFoundDescription?: string;
  /** Título de otras fallas, p. ej. "No se pudo cargar el gasto". */
  errorTitle?: string;
  /** "Reintentar" (solo para fallas que no son 404 ni 403). */
  onRetry?: () => void;
}

export default function RecordLoadError({
  problem,
  notFoundTitle = "No se encontró el registro",
  notFoundDescription = "Puede que se haya eliminado o que sea de otra sucursal.",
  errorTitle = "No se pudo cargar la información",
  onRetry,
}: RecordLoadErrorProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
      gap: 8,
    },
    title: {
      color: c.text,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 8,
    },
    description: {
      color: c.textSecondary,
      textAlign: "center",
      maxWidth: 360,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      marginTop: 16,
    },
  }));

  if (problem.kind === "forbidden") {
    return <NoPermissionView />;
  }

  // Sin historial (URL directa, deep link): al inicio, como NoPermissionView.
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(HOME_ROUTE as any);
    }
  };

  const notFound = problem.kind === "not_found";

  return (
    <View style={styles.container} accessibilityRole="alert">
      <MaterialCommunityIcons
        name={notFound ? "file-search-outline" : "cloud-off-outline"}
        size={48}
        color={colors.textMuted}
      />
      <Text variant="titleMedium" style={styles.title}>
        {notFound ? notFoundTitle : errorTitle}
      </Text>
      <Text variant="bodyMedium" style={styles.description}>
        {notFound ? notFoundDescription : problem.message}
      </Text>
      <View style={styles.actions}>
        {!notFound && onRetry && (
          <Button mode="contained" icon="refresh" onPress={onRetry}>
            Reintentar
          </Button>
        )}
        <Button mode="outlined" onPress={handleBack} textColor={colors.primary}>
          Volver
        </Button>
      </View>
    </View>
  );
}
