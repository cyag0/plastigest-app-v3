import palette from "@/constants/palette";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  IconButton,
  Modal,
  Portal,
  Text,
} from "react-native-paper";

// Tipos para la configuración del modal
export interface AppModalConfig {
  title?: string;
  /*   content?:
    | React.ReactNode
    | ((wrapperOptions: ModalWrapperOptions) => React.ReactNode); */
  showCloseButton?: boolean;
  dismissable?: boolean;
  actions?: ModalAction[];
  defaultActions?: boolean; // Para mostrar acciones por defecto
  onDismiss?: () => void;
  onConfirm?: () => void; // Para acción por defecto de confirmar
  onCancel?: () => void; // Para acción por defecto de cancelar
  width?: number | string;
  height?: number | string;
}

export interface ModalWrapperOptions {
  hide: () => void;
  isVisible: boolean;
  config: AppModalConfig;
}

export interface ModalAction {
  label: string;
  onPress: () => void;
  mode?: "text" | "outlined" | "contained" | "elevated" | "contained-tonal";
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

// Ref interface para exponer métodos
export interface AppModalRef {
  show: (config?: AppModalConfig) => void;
  hide: () => void;
  isVisible: () => boolean;
}

interface ModalProps {
  children?:
    | React.ReactNode
    | ((wrapperOptions: AppModalConfig) => React.ReactNode);
}

const AppModal = forwardRef<AppModalRef, ModalProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AppModalConfig>({});

  // Exponer métodos mediante useImperativeHandle
  useImperativeHandle(ref, () => ({
    show: (modalConfig?: AppModalConfig) => {
      setConfig(modalConfig || {});
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
      // Limpiar configuración después de un delay para animación
      setTimeout(() => setConfig({}), 300);
    },
    isVisible: () => visible,
  }));

  const handleDismiss = () => {
    if (config.dismissable !== false) {
      setVisible(false);
      config.onDismiss?.();
      setTimeout(() => setConfig({}), 300);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setConfig({}), 300);
  };

  // Generar acciones por defecto
  const getDefaultActions = (): ModalAction[] => {
    const actions: ModalAction[] = [];

    if (config.onCancel) {
      actions.push({
        label: "Cancelar",
        mode: "outlined",
        onPress: () => {
          config.onCancel?.();
          handleClose();
        },
      });
    }

    if (config.onConfirm) {
      actions.push({
        label: "Confirmar",
        mode: "contained",
        onPress: () => {
          config.onConfirm?.();
          handleClose();
        },
      });
    }

    return actions;
  };

  // Determinar qué acciones mostrar
  const actionsToShow =
    config.actions || (config.defaultActions ? getDefaultActions() : []);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        dismissable={config.dismissable}
        contentContainerStyle={[
          styles.modalContainer,
          config?.width ? { width: config.width } : {},
          config?.height ? { height: config.height } : {},
        ]}
      >
        <View style={styles.modal}>
          {/* Header */}
          {(config.title || config.showCloseButton) && (
            <>
              <View style={styles.header}>
                {config.title && (
                  <Text variant="headlineSmall" style={styles.title}>
                    {config.title}
                  </Text>
                )}
                {(config.showCloseButton || true) && (
                  <IconButton
                    icon="close"
                    size={24}
                    onPress={handleClose}
                    style={styles.closeButton}
                  />
                )}
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Content */}
          <View style={styles.content}>
            {typeof props.children === "string" ? (
              <Text variant="bodyMedium" style={styles.contentText}>
                {props.children}
              </Text>
            ) : typeof props.children === "function" ? (
              props.children(config)
            ) : (
              props.children
            )}
          </View>

          {/* Actions */}
          {actionsToShow && actionsToShow.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.actions}>
                {actionsToShow.map((action, index) => (
                  <Button
                    key={index}
                    mode={action.mode || "text"}
                    onPress={action.onPress}
                    icon={action.icon}
                    disabled={action.disabled}
                    loading={action.loading}
                    style={[styles.actionButton, action.style]}
                  >
                    {action.label}
                  </Button>
                ))}
              </View>
            </>
          )}
        </View>
      </Modal>
    </Portal>
  );
});

AppModal.displayName = "AppModal";

const styles = StyleSheet.create({
  modalContainer: {
    alignSelf: "center",
    maxHeight: "80%",
    width: "90%", // default width
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.surface,
  },
  title: {
    flex: 1,
    color: palette.textSecondary,
    fontWeight: "bold",
  },
  closeButton: {
    margin: 0,
  },
  divider: {
    backgroundColor: palette.border,
  },
  content: {
    padding: 20,
    minHeight: 60,
  },
  contentText: {
    color: palette.textSecondary,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  actionButton: {
    minWidth: 80,
  },
});

export default AppModal;
