# NutriPlan – Fase 4.4

Corrección del campo `Momento` al abrir “Añadir al calendario”.

## Comportamiento corregido
- `+` en Desayuno → el modal abre con `Desayuno`.
- `+` en Media mañana → `Media mañana`.
- `+` en Comida → `Comida`.
- `+` en Merienda → `Merienda`.
- `+` en Cena → `Cena`.
- `+` en Extra → `Extra`.

Cuando se abre el modal desde la sección general `Recetas`, sin un hueco del
calendario previamente seleccionado, se mantiene `Comida` como valor por defecto.

También se incrementa la caché PWA a `nutriplan-pwa-v1.4`.
