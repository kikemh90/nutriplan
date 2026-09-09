# NutriPlan – Fase 4.5

Corrección robusta del campo `Momento` y de caché.

## Cambios
- `modalSlot` ya no tiene `Comida` seleccionada estáticamente en HTML.
- El selector se reconstruye en cada apertura del modal con el hueco exacto pulsado.
- El clic del `+` lee explícitamente `data-slot-add`.
- Se valida el slot antes de abrir el modal.
- Desde la sección general Recetas se mantiene `Comida` como fallback.
- `app.js` y `styles.css` usan `?v=1.5` para evitar que el service worker/navegador siga sirviendo una versión antigua.
- Caché PWA incrementada a `nutriplan-pwa-v1.5`.
