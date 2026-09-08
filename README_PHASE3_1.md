# NutriPlan – Fase 3.1

Refinamiento funcional de la interfaz móvil.

## Mejoras incorporadas

### Planificador
- Selector real de recetas desde cualquier hueco del calendario.
- Buscador de recetas dentro del modal.
- Selección de día, momento y ración.
- Elemento rápido `1 ración de fruta`.
- Contador manual de agua en incrementos de 250 ml.
- Cierre formal de semana.
- Semanas cerradas quedan bloqueadas para edición y mantienen snapshot histórico.

### Datos y versionado
- Panel de configuración/datos.
- Visualización de `catalogVersion` y `rulesVersion`.
- Importación de catálogo JSON desde la propia aplicación.
- Importación de reglas JSON.
- Validación básica antes de aceptar actualizaciones.
- Bloqueo de importación si el nuevo catálogo elimina recetas todavía usadas en semanas activas.
- Exportación de backup completo.
- Importación/restauración de backup completo.

### Comportamiento histórico
- Semana actual/futura: usa catálogo y reglas vigentes.
- Semana cerrada: usa snapshots guardados.
- El histórico no se recalcula automáticamente.

## Decisiones adoptadas sin necesidad de intervención del usuario
- Agua: pasos de 250 ml.
- Fruta: unidad simple de 1 ración.
- Cierre de semana: permite cerrar con menos de 7 días completos, pero pide confirmación.
- Catálogo incompatible con semanas activas: la actualización se bloquea en vez de perder referencias.

## Pendiente para Fase 4
- manifest.json
- iconos PWA
- service worker
- caché offline
- instalación en iPhone
- preparación para GitHub Pages/Cloudflare Pages
