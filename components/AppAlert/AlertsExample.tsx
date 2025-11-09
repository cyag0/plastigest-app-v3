/**
 * EJEMPLO DE USO DEL HOOK useAlerts
 * ==================================
 *
 * Este archivo contiene ejemplos prácticos de cómo usar el hook useAlerts
 * en diferentes escenarios comunes.
 */

import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

export default function AlertsExampleScreen() {
  const alerts = useAlerts();

  /**
   * Ejemplo 1: Confirmación simple de eliminación
   */
  const handleDelete = async () => {
    const confirmed = await alerts.confirm(
      "¿Estás seguro de eliminar este elemento?"
    );

    if (confirmed) {
      // Simular eliminación
      setTimeout(() => {
        alerts.success("Elemento eliminado correctamente");
      }, 500);
    } else {
      alerts.info("Eliminación cancelada");
    }
  };

  /**
   * Ejemplo 2: Confirmación con opciones personalizadas
   */
  const handleSave = async () => {
    const confirmed = await alerts.confirm(
      "¿Deseas guardar los cambios realizados?",
      {
        title: "Guardar Cambios",
        okText: "Sí, guardar",
        cancelText: "No, descartar",
      }
    );

    if (confirmed) {
      // Simular guardado con posible error
      try {
        // Lógica de guardado aquí
        await new Promise((resolve) => setTimeout(resolve, 1000));
        alerts.success("Cambios guardados exitosamente");
      } catch (error) {
        alerts.error("Error al guardar: " + (error as Error).message);
      }
    }
  };

  /**
   * Ejemplo 3: Validación con advertencia
   */
  const handleSubmit = async () => {
    // Simular validación
    const hasErrors = Math.random() > 0.5;

    if (hasErrors) {
      alerts.warning("Por favor completa todos los campos requeridos");
      return;
    }

    const confirmed = await alerts.confirm("¿Enviar formulario?");

    if (confirmed) {
      alerts.success("Formulario enviado correctamente");
    }
  };

  /**
   * Ejemplo 4: Proceso con múltiples pasos
   */
  const handleMultiStepProcess = async () => {
    alerts.info("Iniciando proceso...");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const continueProcess = await alerts.confirm(
      "Paso 1 completado. ¿Continuar con el paso 2?",
      { title: "Proceso Multi-Paso" }
    );

    if (!continueProcess) {
      alerts.warning("Proceso cancelado en el paso 1");
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const finalConfirm = await alerts.confirm(
      "Paso 2 completado. ¿Finalizar el proceso?",
      { okText: "Finalizar", cancelText: "Cancelar" }
    );

    if (finalConfirm) {
      alerts.success("¡Proceso completado exitosamente!");
    } else {
      alerts.error("Proceso cancelado en el paso final");
    }
  };

  /**
   * Ejemplo 5: Manejo de errores
   */
  const handleWithError = async () => {
    try {
      // Simular operación que puede fallar
      const shouldFail = Math.random() > 0.5;

      if (shouldFail) {
        throw new Error("Operación fallida por error simulado");
      }

      alerts.success("Operación completada sin errores");
    } catch (error) {
      alerts.error((error as Error).message);
    }
  };

  /**
   * Ejemplo 6: Confirmación de acción destructiva
   */
  const handleDestructiveAction = async () => {
    const firstConfirm = await alerts.confirm(
      "Esta acción eliminará permanentemente todos los datos. ¿Continuar?",
      {
        title: "⚠️ Acción Destructiva",
        okText: "Sí, estoy seguro",
        cancelText: "Cancelar",
      }
    );

    if (!firstConfirm) {
      alerts.info("Acción cancelada");
      return;
    }

    // Segunda confirmación para acciones muy críticas
    const secondConfirm = await alerts.confirm(
      "Esta es tu última oportunidad. ¿Realmente deseas continuar?",
      {
        title: "Confirmación Final",
        okText: "Sí, eliminar todo",
        cancelText: "No, cancelar",
      }
    );

    if (secondConfirm) {
      alerts.success("Datos eliminados permanentemente");
    } else {
      alerts.info("Acción cancelada en la confirmación final");
    }
  };

  /**
   * Ejemplo 7: Notificaciones de diferentes tipos
   */
  const showNotifications = () => {
    alerts.info("Esta es una notificación informativa");

    setTimeout(() => {
      alerts.warning("Esta es una advertencia");
    }, 1000);

    setTimeout(() => {
      alerts.error("Este es un mensaje de error");
    }, 2000);

    setTimeout(() => {
      alerts.success("Esta es una confirmación de éxito");
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Ejemplos de useAlerts
      </Text>

      <Button
        mode="contained"
        onPress={handleDelete}
        style={styles.button}
        buttonColor={palette.error}
      >
        1. Confirmación Simple
      </Button>

      <Button
        mode="contained"
        onPress={handleSave}
        style={styles.button}
        buttonColor={palette.primary}
      >
        2. Confirmación con Opciones
      </Button>

      <Button
        mode="contained"
        onPress={handleSubmit}
        style={styles.button}
        buttonColor={palette.accent}
      >
        3. Validación con Advertencia
      </Button>

      <Button
        mode="contained"
        onPress={handleMultiStepProcess}
        style={styles.button}
        buttonColor={palette.info}
      >
        4. Proceso Multi-Paso
      </Button>

      <Button
        mode="contained"
        onPress={handleWithError}
        style={styles.button}
        buttonColor={palette.warning}
      >
        5. Manejo de Errores
      </Button>

      <Button
        mode="contained"
        onPress={handleDestructiveAction}
        style={styles.button}
        buttonColor={palette.red}
      >
        6. Acción Destructiva
      </Button>

      <Button
        mode="outlined"
        onPress={showNotifications}
        style={styles.button}
        textColor={palette.primary}
      >
        7. Mostrar Todas las Notificaciones
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: palette.background,
  },
  title: {
    marginBottom: 24,
    color: palette.text,
    textAlign: "center",
  },
  button: {
    marginBottom: 12,
  },
});
