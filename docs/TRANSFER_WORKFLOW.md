# Flujo Canonico de Transferencias

Este documento define el flujo oficial para evitar confusiones entre origen, destino y acciones por paso.

## Definiciones

- `from_location_id` (Origen): ubicacion que enviara producto y de donde se descuenta inventario.
- `to_location_id` (Destino): ubicacion que recibira producto y donde se incrementa inventario.
- Solicitante: usuario que crea la solicitud de transferencia.

## Regla Principal de Responsabilidad

- Paso 1 (Aprobacion) lo realiza **Origen**.
- Paso 2 (Envio) lo realiza **Origen**.
- Paso 3 (Recepcion) lo realiza **Destino**.

## Flujo Paso a Paso

1. Creacion

- Estado inicial: `pending`.
- Se registra `from_location_id` y `to_location_id`.
- La solicitud queda pendiente de aprobacion en origen.

2. Aprobacion / Rechazo (Origen)

- Endpoint: `POST /auth/admin/inventory-transfers/{id}/approve`
- Endpoint: `POST /auth/admin/inventory-transfers/{id}/reject`
- Si aprueba: estado `approved`.
- Si rechaza: estado `rejected` y el flujo termina.

3. Envio (Origen)

- Endpoint: `POST /auth/admin/inventory-transfers/{id}/ship`
- Estado esperado despues: `in_transit`.
- Se descuenta inventario en origen.

4. Recepcion (Destino)

- Endpoint: `POST /auth/admin/inventory-transfers/{id}/receive`
- Estado esperado despues: `completed`.
- Se incrementa inventario en destino.

## Mapeo de Estados a Paso de Wizard

- `pending` -> Paso 1 (Aprobacion)
- `approved` -> Paso 2 (Envio)
- `in_transit` -> Paso 3 (Recepcion)
- `completed` -> Flujo finalizado
- `rejected` o `cancelled` -> Flujo finalizado

## Comportamiento de UI Recomendado

- Banner superior debe mostrar:
  - Locacion del usuario actual.
  - Locacion responsable del paso actual.
  - Quien debe ejecutar la accion (Tú o Responsable).
- Botones de accion deben habilitarse solo para el responsable del paso.
- Usuarios no responsables ven la pantalla en modo informativo.

## Nota de Gobierno de Cambios

Si el negocio decide cambiar responsabilidades (por ejemplo, aprobar en destino), actualizar en bloque:

- Reglas de permisos del wizard.
- Textos de ayuda en pantallas.
- Guia de estados (`log-guide`).
- Este documento.
