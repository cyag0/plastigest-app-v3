import { IndexParams } from "@/utils/services/crudService";
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
    value: any; // Valor del campo padre
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

  // Construir parámetros de fetch considerando dependencias
  const effectiveFetchParams = useMemo(() => {
    let params = { ...fetchParams };

    if (
      dependsOn &&
      dependsOn.value !== undefined &&
      dependsOn.value !== null &&
      dependsOn.value !== ""
    ) {
      params = {
        ...params,
        [dependsOn.field]: dependsOn.value,
      };
    }

    return params;
  }, [fetchParams, dependsOn]);

  // Obtener datos del contexto
  const cachedData = selectDataContext.getCachedData(
    model,
    effectiveFetchParams
  );

  // Efecto para hacer fetch cuando sea necesario
  useEffect(() => {
    // Si depende de otro campo y no tiene valor, no hacer fetch
    if (
      dependsOn &&
      (dependsOn.value === undefined ||
        dependsOn.value === null ||
        dependsOn.value === "")
    ) {
      setInternalData([]);
      return;
    }

    // Hacer fetch si no hay datos en cache o si están expirados
    if (!cachedData.data.length && !cachedData.loading && !cachedData.error) {
      selectDataContext.fetchData(model, effectiveFetchParams);
    }
  }, [model, effectiveFetchParams, dependsOn, selectDataContext, cachedData]);

  // Actualizar datos internos cuando cambien los datos del cache
  useEffect(() => {
    setInternalData(cachedData.data);

    if (cachedData.data.length > 0 && onDataLoaded) {
      onDataLoaded(cachedData.data);
    }

    if (cachedData.error && onError) {
      onError(cachedData.error);
    }
  }, [cachedData.data, cachedData.error, onDataLoaded, onError]);

  // Convertir datos internos al formato esperado por AppSelect
  const selectData = useMemo(() => {
    return internalData.map((item) => ({
      value: String(item[valueField]),
      label: String(item[labelField] || item[valueField] || "Sin nombre"),
    }));
  }, [internalData, valueField, labelField]);

  // Manejar cambio de valor
  const handleChange = (newValue: string[] | number[]) => {
    if (onChange) {
      // Convertir strings a numbers si el valueField original es numérico
      const sampleItem = internalData[0];
      if (sampleItem && typeof sampleItem[valueField] === "number") {
        const numericValue = newValue.map((v) => Number(v));
        onChange(numericValue);
      } else {
        onChange(newValue);
      }
    }
  };

  // Renderizar estados especiales
  if (
    dependsOn &&
    (dependsOn.value === undefined ||
      dependsOn.value === null ||
      dependsOn.value === "")
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

  if (cachedData.loading) {
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

  if (cachedData.error) {
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
          Error: {cachedData.error}
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
