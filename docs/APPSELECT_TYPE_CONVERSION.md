# Test de Conversión Automática de Tipos en AppSelect

## Casos de Prueba

### 1. Valor Individual Numérico

```typescript
// Input
<AppSelect
  value={1}
  onChange={(value) => console.log(value, typeof value)}
  data={[
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" }
  ]}
/>

// Expected Output al seleccionar:
// 1, "number" (mantiene el tipo numérico)
```

### 2. Valor Individual String

```typescript
// Input
<AppSelect
  value="1"
  onChange={(value) => console.log(value, typeof value)}
  data={[
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" }
  ]}
/>

// Expected Output al seleccionar:
// "1", "string" (mantiene el tipo string)
```

### 3. Array de Números (Múltiple)

```typescript
// Input
<AppSelect
  value={[1, 2]}
  multiple={true}
  onChange={(value) => console.log(value, typeof value[0])}
  data={[
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" },
    { value: "3", label: "Opción 3" }
  ]}
/>

// Expected Output al seleccionar:
// [1, 2, 3], "number" (mantiene array de números)
```

### 4. Array de Strings (Múltiple)

```typescript
// Input
<AppSelect
  value={["1", "2"]}
  multiple={true}
  onChange={(value) => console.log(value, typeof value[0])}
  data={[
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" },
    { value: "3", label: "Opción 3" }
  ]}
/>

// Expected Output al seleccionar:
// ["1", "2", "3"], "string" (mantiene array de strings)
```

## Lógica Implementada

### Conversión de Entrada (normalizedValue)

```typescript
const normalizedValue = props.multiple 
  ? (Array.isArray(props.value) ? props.value.map(v => String(v)) : (props.value ? [String(props.value)] : []))
  : (Array.isArray(props.value) ? props.value.map(v => String(v)) : (props.value ? [String(props.value)] : []));
```

### Detección de Tipo Original

```typescript
const shouldReturnNumbers = (() => {
  if (props.value === undefined || props.value === null) return false;
  if (typeof props.value === 'number') return true;
  if (Array.isArray(props.value) && props.value.length > 0) {
    return typeof props.value[0] === 'number';
  }
  return false;
})();
```

### Conversión de Salida

```typescript
const newValues = shouldReturnNumbers 
  ? stringValues.map(v => {
      const num = Number(v);
      return isNaN(num) ? v : num;
    })
  : stringValues;
```

## Casos Edge

### 5. Valor undefined/null

```typescript
// Input
<AppSelect
  value={undefined}
  onChange={(value) => console.log(value)}
  data={[{ value: "1", label: "Opción 1" }]}
/>

// Expected: Funciona sin errores, devuelve string por defecto
```

### 6. Array vacío

```typescript
// Input
<AppSelect
  value={[]}
  multiple={true}
  onChange={(value) => console.log(value)}
  data={[{ value: "1", label: "Opción 1" }]}
/>

// Expected: Funciona sin errores, devuelve strings por defecto
```

## Beneficios

1. **🔄 Conversión Automática**: No más errores por tipos incompatibles
2. **📐 Consistencia**: Mantiene el tipo del valor original  
3. **🛡️ Robustez**: Maneja casos edge sin errores
4. **🎯 Transparencia**: El componente padre no nota la conversión interna

## Estado Actual

- ✅ Conversión automática implementada
- ✅ Detección de tipo original
- ✅ Manejo de casos edge
- ✅ Compatible con valores undefined/null
- ✅ Funciona para individual y múltiple
