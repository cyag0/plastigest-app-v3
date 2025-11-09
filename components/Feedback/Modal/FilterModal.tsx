import React, { forwardRef } from "react";
import { Text } from "react-native-paper";
import AppModal, { AppModalConfig, AppModalRef } from "./AppModal";

// Props del wrapper modal
interface FilterModalProps {
  title?: string;
  width?: number | string;
  height?: number | string;
  onApplyFilters?: (filters: any) => void;
}

const FilterModal = forwardRef<AppModalRef, FilterModalProps>((props, ref) => {
  return (
    <AppModal ref={ref}>
      {(wrapper) => <FilterContent wrapper={wrapper} />}
    </AppModal>
  );
});

// Componente del contenido del filtro
interface FilterContentProps {
  wrapper: AppModalConfig;
}

function FilterContent(props: FilterContentProps) {
  return (
    <Text>Contenido de filtros aquí. Implementa tus controles de filtro.</Text>
  );
}

FilterModal.displayName = "FilterModal";

export default FilterModal;
