import { IndexParams } from "@/utils/services/crudService";
import { getIn, useFormikContext } from "formik";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import MakeForm from "../AppForm/hoc";
import AppSelect from "../AppSelect/AppSelect";
import { ServicePath, useSelectData } from "./context";

export interface AppProSelectProps {
  // Props principales
  model: ServicePath;
  value?: string[] | number[];
  onChange?: (value: string[] | number[]) => void;
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

  // Props del select base
  multiple?: boolean;
  hideSearchBox?: boolean;
  placeholder?: string;
  disabled?: boolean;

  // Props del contenedor
  containerStyle?: any;
  label?: string;

  // Callbacks
  onChange?: (value: any) => void;
  onDataLoaded?: (data: any[]) => void;
  onError?: (error: string) => void;
}

export default function AppProSelect(props: AppProSelectProps) {
  const {
    model,
    value = [],
    onChange,
    onBlur,
    labelField = "name",
    valueField = "id",
    searchFields = ["name"],
    dependsOn,
    fetchParams,
    multiple = false,
    hideSearchBox = false,
    placeholder,
    disabled = false,
    containerStyle,
    label,
    onDataLoaded,
    onError,
    ...restProps
  } = props;

  const selectDataContext = useSelectData();
  const [internalData, setInternalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useFormikContext<any>();

  // Obtener valor de dependencia del form si no se pasa directamente
  const dependencyValue = useMemo(() => {
    if (!dependsOn) return null;

    // Si se pasa value directamente, usarlo
    if (dependsOn.value !== undefined) {
      return dependsOn.value;
    }

    // Si no, obtenerlo del form
    return getIn(dependsOn.field, form.values);
  }, [dependsOn?.field, dependsOn?.value, form.values]);

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
    // Si depende de otro campo y no tiene valor, no hacer fetch
    if (
      dependsOn &&
      (dependencyValue === undefined ||
        dependencyValue === null ||
        dependencyValue === "")
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

    // Actualizar estados locales
    setInternalData(cachedData.data || []);
    setIsLoading(cachedData.loading);
    setError(cachedData.error);

    // Hacer fetch si no hay datos en cache o si están expirados
    if (
      !(cachedData.data || []).length &&
      !cachedData.loading &&
      !cachedData.error
    ) {
      selectDataContext.fetchData(model, effectiveFetchParams);
    }
  }, [
    model,
    effectiveFetchParams,
    dependsOn?.field,
    dependencyValue,
    selectDataContext,
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

  // Convertir datos internos al formato esperado por AppSelect
  const selectData = useMemo(() => {
    return (internalData || []).map((item) => ({
      value: String(item[valueField]),
      label: String(item[labelField] || item[valueField] || "Sin nombre"),
    }));
  }, [internalData, valueField, labelField]);

  // Manejar cambio de valor
  const handleChange = (newValue: string[] | number[]) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  // Renderizar estados especiales
  if (
    dependsOn &&
    (dependencyValue === undefined ||
      dependencyValue === null ||
      dependencyValue === "")
  ) {
    return (
      <View style={containerStyle}>
        {label && (
          <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "bold" }}>
            {label}
          </Text>
        )}
        <AppSelect
          value={[]}
          onChange={() => {}}
          onBlur={onBlur}
          data={[]}
          multiple={multiple}
          hideSearchBox={hideSearchBox}
          disabled={true}
          {...restProps}
        />
        <Text style={{ fontSize: 12, color: "gray", marginTop: 4 }}>
          Selecciona {dependsOn.field} primero
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={containerStyle}>
        {label && (
          <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "bold" }}>
            {label}
          </Text>
        )}
        <AppSelect
          value={[]}
          onChange={() => {}}
          onBlur={onBlur}
          data={[]}
          multiple={multiple}
          hideSearchBox={hideSearchBox}
          disabled={true}
          {...restProps}
        />
        <Text style={{ fontSize: 12, color: "gray", marginTop: 4 }}>
          Cargando opciones...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={containerStyle}>
        {label && (
          <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "bold" }}>
            {label}
          </Text>
        )}
        <AppSelect
          value={[]}
          onChange={() => {}}
          onBlur={onBlur}
          data={[]}
          multiple={multiple}
          hideSearchBox={hideSearchBox}
          disabled={true}
          {...restProps}
        />
        <Text style={{ fontSize: 12, color: "red", marginTop: 4 }}>
          Error: {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "bold" }}>
          {label}
        </Text>
      )}
      <AppSelect
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        data={selectData}
        multiple={multiple}
        hideSearchBox={hideSearchBox}
        disabled={disabled}
        {...restProps}
      />
    </View>
  );
}

// Versión con HOC para formularios
export const FormProSelect = MakeForm(AppProSelect);
