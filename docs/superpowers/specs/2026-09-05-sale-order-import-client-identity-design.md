# Corrección de identidad de clientes en importación de pedidos

## Objetivo

Evitar que una nota de envío repetida vincule un pedido con una persona distinta y reparar el pedido de prueba `PE-442`, que contiene los datos operativos de Miguel Ipanaque Yovera pero apunta al cliente de Aniari Sadith Mogolllon Ramírez.

## Evidencia del incidente

- `orders (47).xlsx`, fila 5: Aniari, teléfono `942671651`, nota de envío `PIURA`.
- `orders (51).xlsx`, fila 11: Miguel, teléfono `958293306`, nota de envío `PIURA`, sin DNI.
- El normalizador convierte una nota sin DNI en `parsedDocument.reference`.
- La resolución actual consulta esa referencia antes del teléfono y reutiliza el cliente encontrado.
- El pedido `PE-442` conserva dirección, fechas, importe y productos de Miguel, pero está enlazado al cliente de Aniari.

## Alternativas evaluadas

### 1. Identidad solamente por DNI o teléfono — seleccionada

Resolver primero por DNI y después por teléfono normalizado. Si ninguno existe, crear un cliente nuevo. La nota de envío continúa siendo información del pedido y no participa en la deduplicación ni se guarda automáticamente como referencia de identidad.

Ventaja: elimina la clase de falsos positivos causada por textos genéricos como ciudades, agencias o instrucciones. Desventaja: un cliente sin DNI que cambie de teléfono puede duplicarse, pero esa duplicación es recuperable y menos peligrosa que atribuir un pedido a otra persona.

### 2. Referencia más nombre y ubigeo

Exigir coincidencia simultánea de referencia, nombre y ubicación. Reduce algunas colisiones, pero nombres y ubicaciones también cambian o se escriben de formas distintas; además mantiene una nota operativa como identidad.

### 3. Aceptar referencias únicamente con formatos reconocidos

Permitir coordenadas u otros patrones configurados. Es más complejo y todavía requiere definir qué formatos representan realmente a una persona. No es necesario para corregir el incidente.

## Diseño aprobado

`SaleOrderImportRowNormalizerService.resolveClient` aplicará este orden:

1. DNI válido de ocho dígitos.
2. Teléfono peruano normalizado.
3. Sin coincidencia: cliente nuevo.

`SaleOrderImportClientResolverService` no copiará `deliveryNote` a `client.reference` cuando cree un cliente sin DNI. El dato seguirá disponible en el pedido como detalle de destino mediante el flujo existente.

La corrección será igual en cualquier ruta que reutilice estos servicios. El endpoint activo de importación no tendrá cambios de contrato.

## Pruebas

Se agregará una regresión con dos identidades conceptuales: una referencia existente `PIURA` perteneciente a Aniari y una fila nueva de Miguel con la misma nota y otro teléfono. La expectativa será que la referencia no se consulte y que Miguel no se vincule con Aniari.

También se actualizará la prueba de creación para comprobar que una nota sin DNI no se guarda como `client.reference`. Luego se ejecutarán las suites focalizadas y la suite completa del módulo relevante.

## Reparación de datos de prueba

Después de desplegar el cambio local:

1. Crear a Miguel Ipanaque Yovera con tipo `REPURCHASE`, documento `NONE`, teléfono `958293306` y ubigeo Piura/Piura/Piura.
2. Reasignar exclusivamente el pedido `PE-442` al nuevo cliente.
3. Verificar que `PE-442` muestre a Miguel y que el cliente de Aniari conserve su nombre y teléfono originales.

No se modificarán otros pedidos históricos de forma automática.

## Seguridad y recuperación

La modificación de código es reversible mediante Git. La reparación se limita a una fila identificada por UUID y se verificará antes y después. No se eliminará al cliente de Aniari ni se cambiarán sus teléfonos.
