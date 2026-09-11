# NutriPlan – Gestor unificado de catálogo

Implementado sobre la Fase 4.9.

## Reglas
1. El catálogo activo es siempre el más reciente, tanto si llega desde GitHub como desde Import.
2. GitHub e Import usan la misma activación:
   - semanas pasadas: snapshots históricos sin cambios automáticos;
   - semana actual y futuras: refresco de snapshots con la receta vigente;
   - recetas eliminadas: si ya estaban planificadas y tienen snapshot, se conserva.
3. Import sigue siendo sustitución completa, no merge.
4. Si el JSON importado elimina alimentos o recetas presentes en el catálogo activo,
   se muestra un warning con nombres y se exige confirmación.
5. Si una receta eliminada aparece en semana actual/futuras, el warning lo indica.
6. Un catálogo importado más antiguo que el activo no puede convertirse en activo.

## Versionado
Se añade `catalogUpdatedAt` al catálogo incluido. La comparación usa:
- `catalogUpdatedAt` cuando existe;
- como compatibilidad, fecha y sufijo `vN` extraídos de `catalogVersion`.

## Persistencia
- `nutriplan.catalog.v2`: último catálogo importado disponible.
- `nutriplan.activeCatalogMeta.v1`: firma/version/origen del último catálogo activado.
- El catálogo GitHub sigue en `data/nutrition_catalog.json`.

Al arrancar se comparan GitHub e Import y se activa el más reciente.

## UI
Ajustes muestra:
- versión del catálogo activo;
- origen activo: GitHub o Import JSON.
