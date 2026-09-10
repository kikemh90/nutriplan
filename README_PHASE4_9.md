# NutriPlan – Fase 4.9

Corrección específica de modales en iPhone / pantallas pequeñas.

## Problema
Los formularios largos de:
- Nuevo alimento
- Nueva receta

podían exceder el alto visible del iPhone, quedar cortados por arriba/abajo y
bloquear el scroll, impidiendo incluso acceder al botón de cierre.

## Corrección
- El contenedor del modal admite scroll vertical.
- La tarjeta del modal tiene `max-height` basado en `100dvh`.
- Se respeta `safe-area-inset-top/bottom`.
- En móvil el modal se alinea desde arriba en lugar de quedar pegado abajo.
- La cabecera del modal queda `sticky`, manteniendo visible la X al hacer scroll.
- Se mantiene compatibilidad con escritorio.
- Cache PWA actualizada a `nutriplan-pwa-v2.0`.
