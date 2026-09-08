# NutriPlan – Fase 3.2: planificación e histórico editable

Esta revisión cambia la lógica de histórico para adaptarla al uso real esperado.

## Principio funcional

La semana nunca se bloquea.

- Puedes planificarla antes de que empiece.
- Puedes modificarla mientras avanza.
- Puedes corregirla después de finalizar para reflejar lo que realmente ocurrió.
- Todas las métricas se recalculan inmediatamente al cambiar recetas, raciones, fruta o agua.

## Modelo de datos

Cada entrada de receta guarda:
- `recipeId`
- `servings`
- `snapshot` nutricional de la versión utilizada

### Semana actual y futuras
Cuando se importa un catálogo nuevo:
- sus snapshots se actualizan a la versión vigente;
- las métricas se recalculan.

Cuando se importan reglas nuevas:
- semana actual y futuras adoptan las reglas nuevas.

### Semanas pasadas
No se recalculan automáticamente por cambios globales de catálogo o reglas.

Sin embargo, siguen siendo editables:
- si eliminas una entrada, desaparece;
- si cambias su ración, se recalcula esa entrada con la receta vigente;
- si sustituyes/añades una receta, la nueva entrada usa la versión vigente;
- el resto de entradas históricas conserva sus snapshots.

Esto permite corregir la realidad varios días después sin reescribir silenciosamente todo el histórico.

## Reglas históricas

Cada semana guarda:
- `rulesVersion`
- `rulesSnapshot`

Las semanas pasadas siguen evaluándose con las reglas que tenían asociadas.
La semana actual y las futuras se actualizan cuando se importan nuevas reglas.

## Eliminado
- No existe ya el concepto de “cerrar definitivamente” una semana.
- No hay bloqueo de edición del histórico.

## Resultado
La aplicación funciona como un planificador vivo durante la semana y como registro corregible de lo que realmente ocurrió después.
