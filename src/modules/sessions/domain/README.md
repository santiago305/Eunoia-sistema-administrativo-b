# Sessions Domain

Este modulo contiene el dominio de sesiones. Aqui viven las entidades, value objects, errores y fabricas que definen las reglas basicas del modelo.

## Estructura

- `entities/`: modelos del dominio (estado y comportamiento).
- `errors/`: errores de validacion del dominio.
- `factories/`: metodos para crear entidades de forma consistente.
- `values-objects/`: tipos inmutables con validacion.
- `index.ts`: exporta las piezas del dominio para uso externo.
