# NutriPlan – Fase 4.6 corregida

Esta versión se ha reconstruido a partir de la Fase 4.5 funcional.

## Error identificado en la primera Fase 4.6
La primera implementación intentó insertar los botones `newCustomFoodBtn` y
`newCustomRecipeBtn` usando un bloque HTML que no coincidía con el HTML real de
la 4.5. Los botones no llegaron a existir, pero `wireGlobalActions()` intentaba
asignarles `onclick`. Eso provocaba un `TypeError` durante `boot()` antes de los
renders principales, dejando Guía, Alimentos, Recetas, etc. prácticamente vacíos.

## Correcciones
- Reconstrucción desde Fase 4.5, no parche sobre la 4.6 rota.
- Botones y modales insertados contra el HTML real de 4.5.
- Inicialización segura de `customFoods` y `customRecipes`.
- Alimentos personalizados integrados en filtros, búsqueda y lista de compra.
- Recetas personalizadas integradas en filtros, selector, calendario y matriz.
- Las recetas personalizadas usan la misma estructura nutricional `min/max/calc`
  y `weeklyMetadata` que el catálogo base.
- Entradas manuales suman a métricas diarias, semanales y mensuales.
- Importación/restauración compatible con datos personalizados.
- Cache PWA incrementada a v1.7.

## Validaciones ejecutadas
- Comparación completa contra la Fase 4.5.
- Sintaxis ES module de `app.js`, `nutrition_engine.js` y `catalog_manager.js`.
- Sintaxis de `service-worker.js`.
- Comprobación estática de los IDs usados por JavaScript frente al HTML:
  no faltan IDs estáticos; `dayCompleteToggle` es dinámico y se crea al renderizar.
- Comprobación HTTP local del `index.html`.

No se afirma una prueba E2E completa con navegador: el Chromium disponible en
el entorno de generación no pudo navegar al servidor localhost del contenedor.
Por eso conviene hacer la prueba funcional final en GitHub Pages/Chrome antes
de actualizar la PWA del iPhone.
