import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import type { PermissionRule } from "@/utils/permissions/permissions";
import { IndexParams } from "@/utils/services/crudService";
import { getIn, useFormikContext } from "formik";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import MakeForm from "../AppForm/hoc";
import AppSelect from "../AppSelect/AppSelect";
import {
  SELECT_CACHE_RETRY_MS,
  SELECT_CACHE_TTL_MS,
  ServicePath,
  useSelectData,
} from "./context";

/**
 * Permiso con el que el backend deja listar cada catálogo (canIndex de su
 * controlador). Sin él el select no lo pide: el backend respondería 403. Los
 * catálogos que no están aquí no piden permiso (empresas y sucursales: cada
 * quien ve las suyas).
 */
export const SELECT_LIST_PERMISSIONS: Partial<Record<ServicePath, PermissionRule>> = {
  categories: "categories_list",
  units: "units_list",
  "home.unidades": "units_list",
  suppliers: "suppliers_list",
  customers: ["customers_list", "sales_pos"],
  products: "products_list",
  // InventoryTypeController::canIndex: también con products_list.
  inventoryTypes: ["inventory_types_list", "products_list"],
};

export interface AppProSelectProps {
  // Props principales
  model: ServicePath;
  value?: string[] | number[] | string | number;
  onChange?: (value: string[] | number[] | string | number) => void;
  onBlur?: () => void;

  // Configuración de la data
  labelField?: string; // Campo a mostrar como label (default: 'name')
  valueField?: string; // Campo a usar como value (default: 'id')
  searchFields?: string[]; // Campos por los cuales buscar (default: ['name'])

  // Dependencias
  dependsOn?: {
    field: string; // Campo del modelo padre
    value?: any; // Valor del campo padre (opcional, se obtiene del form si no se especifica)
    parentModel?: ServicePath; // Modelo padre (opcional, por defecto usa el mismo modelo)
  };

  // Parámetros adicionales para el fetch
  fetchParams?: IndexParams;

  // Filtro client-side opcional sobre los items ya cargados (p. ej. mostrar
  // sólo unidades coherentes con el tipo de medida del producto seleccionado).
  filterItem?: (item: any) => boolean;

  /**
   * ¿Se puede pedir el catálogo? Por defecto, si el usuario tiene el permiso
   * de listarlo (SELECT_LIST_PERMISSIONS). Con false no se pide: el select
   * queda deshabilitado y muestra solo el valor actual (selectedLabel).
   */
  enabled?: boolean;
  /**
   * Texto del valor actual cuando no está entre las opciones (sin permiso
   * para el catálogo, todavía cargando o si falló).
   */
  selectedLabel?: string | null;
  /**
   * Dónde está ese texto en los valores del formulario, p. ej.
   * "category_name" o "unit.name" (el detalle del registro lo trae).
   */
  selectedLabelField?: string;

  // Props del select base
  multiple?: boolean;
  hideSearchBox?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;

  // Props del contenedor
  containerStyle?: any;
  label?: string;

  // Callbacks
  onDataLoaded?: (data: any[]) => void;
  onError?: (error: string) => void;
}

export default function AppProSelect(props: AppProSelectProps) {
  const {
    model,
    value,
    onChange,
    onBlur,
    labelField = "name",
    valueField = "id",
    searchFields = ["name"],
    dependsOn,
    fetchParams,
    filterItem,
    enabled,
    selectedLabel,
    selectedLabelField,
    multiple = false,
    hideSearchBox = false,
    placeholder,
    disabled = false,
    readonly = false,
    containerStyle,
    label,
    onDataLoaded,
    onError,
    ...restProps
  } = props;

  const selectDataContext = useSelectData();
  const { can } = useCan();
  const { colors } = useTheme();
  const [internalData, setInternalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useFormikContext<any>();

  // Sin el permiso de listar el catálogo no se pide (el backend respondería
  // 403): el detalle de un producto lo abre también quien no ve categorías,
  // unidades o proveedores.
  const fetchEnabled = enabled ?? can(SELECT_LIST_PERMISSIONS[model]);

  // Texto del valor actual, si el registro lo trae (category_name, unit.name…).
  const currentLabel = useMemo(() => {
    const raw =
      selectedLabel ??
      (selectedLabelField ? getIn(form?.values, selectedLabelField) : undefined);
    if (typeof raw === "number") return String(raw);
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }, [selectedLabel, selectedLabelField, form?.values]);

  // Obtener valor de dependencia del form si no se pasa directamente
  const dependencyValue = useMemo(() => {
    if (!dependsOn) return null;

    // Si se pasa value directamente, usarlo
    if (dependsOn.value !== undefined) {
      return dependsOn.value;
    }

    // Si no, obtenerlo del form
    return getIn(form?.values, dependsOn.field);
  }, [dependsOn?.field, dependsOn?.value, form?.values]);

  // Construir parámetros de fetch considerando dependencias
  const effectiveFetchParams = useMemo(() => {
    let params = { ...fetchParams };

    if (
      dependsOn &&
      dependencyValue !== undefined &&
      dependencyValue !== null &&
      dependencyValue !== ""
    ) {
      params = {
        ...params,
        [dependsOn.field]: dependencyValue,
      };
    }

    return params;
  }, [fetchParams, dependsOn?.field, dependencyValue]);

  // Efecto para hacer fetch cuando sea necesario
  useEffect(() => {
    // Si depende de otro campo y no tiene valor, o el usuario no puede
    // listar el catálogo, no hacer fetch.
    if (
      !fetchEnabled ||
      (dependsOn &&
        (dependencyValue === undefined ||
          dependencyValue === null ||
          dependencyValue === ""))
    ) {
      setInternalData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Obtener datos del contexto dentro del efecto
    const cachedData = selectDataContext.getCachedData(
      model,
      effectiveFetchParams
    );
    const hasData = (cachedData.data || []).length > 0;

    // Actualizar estados locales. Mientras se recarga un catálogo que ya
    // tenía opciones se siguen mostrando (no se bloquea el select).
    setInternalData(cachedData.data || []);
    setIsLoading(cachedData.loading && !hasData);
    setError(hasData ? null : cachedData.error);

    if (cachedData.loading) return;

    const now = Date.now();
    if (cachedData.error) {
      // Reintentar un catálogo que falló, pero no en cada render.
      if (
        !cachedData.failedAt ||
        now - cachedData.failedAt > SELECT_CACHE_RETRY_MS
      ) {
        selectDataContext.fetchData(model, effectiveFetchParams, true);
      }
      return;
    }

    // Sin cargar todavía, invalidado (alta/edición en ese catálogo, cambio de
    // empresa) o vencido: pedirlo de nuevo.
    if (cachedData.lastFetch === null) {
      selectDataContext.fetchData(model, effectiveFetchParams);
    } else if (now - cachedData.lastFetch > SELECT_CACHE_TTL_MS) {
      selectDataContext.fetchData(model, effectiveFetchParams, true);
    }
  }, [
    model,
    effectiveFetchParams,
    dependsOn?.field,
    dependencyValue,
    selectDataContext,
    fetchEnabled,
  ]);

  // Efectos separados para los callbacks para evitar bucles
  useEffect(() => {
    if (internalData.length > 0 && onDataLoaded) {
      onDataLoaded(internalData);
    }
  }, [internalData.length, onDataLoaded]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Convertir datos internos al formato esperado por AppSelect. Si el valor
  // actual no está entre las opciones (sin catálogo, cargando o falló) y el
  // registro trae su texto, se agrega para que se vea su nombre y no "—".
  const selectData = useMemo(() => {
    const options = (internalData || [])
      .filter((item) => (filterItem ? filterItem(item) : true))
      .map((item) => ({
        value: String(item[valueField]),
        label: String(item[labelField] || item[valueField] || "Sin nombre"),
      }));

    const hasSingleValue =
      !multiple &&
      !Array.isArray(value) &&
      value !== undefined &&
      value !== null &&
      value !== "";
    if (
      hasSingleValue &&
      currentLabel &&
      !options.some((option) => option.value === String(value))
    ) {
      options.push({ value: String(value), label: currentLabel });
    }

    return options;
  }, [internalData, valueField, labelField, filterItem, multiple, value, currentLabel]);

  // Manejar cambio de valor
  const handleChange = (newValue: string[] | number[] | string | number) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  const labelNode = label ? (
    <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "bold" }}>
      {label}
    </Text>
  ) : null;
  const hintStyle = { fontSize: 12, color: colors.textMuted, marginTop: 4 };
  const currentValue = value ?? (multiple ? [] : undefined);

  // Renderizar estados especiales
  if (
    dependsOn &&
    (dependencyValue === undefined ||
      dependencyValue === null ||
      dependencyValue === "")
  ) {
    return (
      <View style={containerStyle}>
        {labelNode}
        <AppSelect
          value={[]}
          onChange={() => {}}
          onBlur={onBlur}
          data={[]}
          multiple={multiple}
          hideSearchBox={hideSearchBox}
          disabled={true}
          readonly={readonly}
          placeholder={placeholder}
          {...restProps}
        />
        {!readonly && (
          <Text style={hintStyle}>Selecciona {dependsOn.field} primero</Text>
        )}
      </View>
    );
  }

  // Sin permiso para el catálogo: solo el valor actual, sin poder cambiarlo.
  if (!fetchEnabled) {
    return (
      <View style={containerStyle}>
        {labelNode}
        <AppSelect
          value={currentValue}
          onChange={() => {}}
          onBlur={onBlur}
          data={selectData}
          multiple={multiple}
          hideSearchBox={hideSearchBox}
          disabled={true}
          readonly={readonly}
          placeholder={placeholder}
          {...restProps}
        />
        {!readonly && (
          <Text style={hintStyle}>No tienes permiso para ver esta lista.</Text>
        )}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={containerStyle}>
        {labelNode}
        <AppSelect
          value={currentValue}
          onChange={() => {}}
          onBlur={onBlur}
          data={selectData}
          multiple={multiple}
          hideSearchBox={hideSearchBox}
          disabled={true}
          readonly={readonly}
          placeholder={placeholder}
          {...restProps}
        />
        {!readonly && <Text style={hintStyle}>Cargando opciones...</Text>}
      </View>
    );
  }

  if (error) {
    return (
      <View style={containerStyle}>
        {labelNode}
        <AppSelect
          value={currentValue}
          onChange={() => {}}
          onBlur={onBlur}
          data={selectData}
          multiple={multiple}
          hideSearchBox={hideSearchBox}
          disabled={true}
          readonly={readonly}
          placeholder={placeholder}
          {...restProps}
        />
        {/* En solo lectura con el nombre a la vista, la lista no hace falta. */}
        {!(readonly && currentLabel) && (
          <Text style={{ ...hintStyle, color: colors.error }}>
            No se pudieron cargar las opciones. {error}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {labelNode}
      <AppSelect
        value={currentValue}
        onChange={handleChange}
        onBlur={onBlur}
        data={selectData}
        multiple={multiple}
        hideSearchBox={hideSearchBox}
        disabled={disabled}
        readonly={readonly}
        placeholder={placeholder}
        {...restProps}
      />
    </View>
  );
}

// Versión con HOC para formularios
export const FormProSelect = MakeForm(AppProSelect);
