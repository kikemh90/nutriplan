# NutriPlan – Fase 2 v2

## Política histórica acordada
- Semana actual y futuras: usan catálogo y reglas vigentes.
- Semanas cerradas/pasadas: conservan snapshot nutricional y evaluación original.
- Reevaluación histórica futura: opcional, comparativa y no destructiva.

## Versionado
- `recipe.id`: estable.
- `recipe.version`: aumenta cuando cambian cantidades, macros o metadatos relevantes.
- `catalogVersion`: versión global del catálogo.
- `rulesVersion`: versión de las reglas.
- `snapshot`: se crea al cerrar una semana.

## Ejemplo
Si `chicken_fajitas` pasa de versión 1 a 2 tras revisar la tortilla real:
1. Se mantiene `id = chicken_fajitas`.
2. Se incrementa `version`.
3. Semana actual y futuras se recalculan automáticamente.
4. Semanas ya cerradas conservan la versión usada entonces.

Los datos del usuario permanecen separados del catálogo y de las reglas.


## Validación
El motor ha sido validado con pruebas unitarias y escenarios nutricionales simulados. Ver `VALIDATION_REPORT.md` y `validation_cases.json`.
