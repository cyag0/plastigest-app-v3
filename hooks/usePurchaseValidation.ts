import { useEffect, useState } from "react";

interface UsePurchaseValidationProps {
  status?: string;
  readonly?: boolean;
}

export function usePurchaseValidation({
  status,
  readonly = false,
}: UsePurchaseValidationProps) {
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [statusInfo, setStatusInfo] = useState({
    isEditable: false,
    affectsStock: false,
    isFinal: false,
    message: "",
  });

  useEffect(() => {
    if (!status) {
      setCanEdit(false);
      setCanDelete(false);
      setStatusInfo({
        isEditable: false,
        affectsStock: false,
        isFinal: false,
        message: "Estado no definido",
      });
      return;
    }

    const isDraft = status === "draft";
    const isReceived = status === "received";

    // Solo se puede editar en borrador y si no es readonly
    const editableStatus = isDraft && !readonly;
    setCanEdit(editableStatus);

    // Se puede eliminar si no está recibido
    setCanDelete(!isReceived);

    // Información del estado
    setStatusInfo({
      isEditable: isDraft,
      affectsStock: isReceived,
      isFinal: isReceived,
      message: getStatusMessage(status),
    });
  }, [status, readonly]);

  const getStatusMessage = (currentStatus: string): string => {
    const messages = {
      draft: "Esta compra está en borrador y puede editarse",
      ordered: "Pedido enviado al proveedor. No se puede editar",
      in_transit: "Mercancía en transporte. No se puede editar",
      received:
        "Compra recibida. Ha actualizado el stock y no se puede modificar",
    };
    return (
      messages[currentStatus as keyof typeof messages] || "Estado desconocido"
    );
  };

  const validateEdit = (): { canEdit: boolean; message?: string } => {
    if (readonly) {
      return { canEdit: false, message: "Modo de solo lectura" };
    }

    if (!canEdit) {
      return {
        canEdit: false,
        message: "Solo se pueden editar compras en estado de borrador",
      };
    }

    return { canEdit: true };
  };

  const validateDelete = (): { canDelete: boolean; message?: string } => {
    if (!canDelete) {
      return {
        canDelete: false,
        message:
          "No se puede eliminar una compra recibida porque afecta el stock",
      };
    }

    return { canDelete: true };
  };

  return {
    canEdit,
    canDelete,
    statusInfo,
    validateEdit,
    validateDelete,
    getStatusMessage,
  };
}
