# NutriPlan – Fase 4.1 (corrección)

Corrección de un error de sintaxis en `js/app.js` dentro de `renderWeek()`:
la variable `relation` se declaraba dos veces con `const` en el mismo bloque.

Ese error impedía que el módulo JavaScript arrancase, por lo que:
- se veía el HTML/CSS;
- las secciones dinámicas no se cargaban;
- los botones no respondían.

También se incrementó la versión de caché del service worker a `nutriplan-pwa-v1.1`
para facilitar que el navegador utilice los archivos corregidos al volver a publicar.
