# NutriPlan – Fase 3: interfaz mobile-first

Esta versión implementa la primera interfaz funcional de la aplicación sobre el motor validado de Fase 2.

## Incluye
- Navegación móvil: Guía, Alimentos, Recetas, Semana y Matriz.
- Lista de alimentos con:
  - buscador libre;
  - filtro por grupo;
  - filtro por clasificación;
  - selección directa para lista de compra.
- Lista de compra lateral:
  - cantidades opcionales;
  - marcar como comprado;
  - eliminar;
  - vaciar;
  - deshacer última eliminación/vaciado.
- Recetario:
  - lista compacta;
  - acordeones desplegables;
  - ingredientes;
  - preparación;
  - macros y calorías aproximadas;
  - filtros y búsqueda;
  - añadir al calendario.
- Planificador semanal:
  - navegación por semanas;
  - vista diaria pensada para móvil;
  - desayuno, media mañana, comida, merienda, cena y extra;
  - 0,5 / 1 / 1,5 / 2 raciones;
  - cálculo diario y semanal en tiempo real;
  - semana incompleta sin juicios negativos.
- Matriz simplificada.
- Persistencia local mediante `localStorage`.

## Importante
Esta fase todavía no incluye:
- manifest/service worker/offline completo (Fase 4 PWA);
- publicación en GitHub Pages/Cloudflare;
- editor visual de catálogo;
- importación de catálogo desde la UI;
- selector directo de receta al pulsar “+” desde un hueco del calendario (se refinará en la siguiente iteración de UI);
- cierre formal de semana desde la UI.

El motor y la estructura de datos sí están preparados para estas funciones.

## Ejecución local
Los archivos JSON se cargan con `fetch`, por lo que la carpeta debe servirse mediante HTTP/HTTPS.
Ejemplo rápido:
`python -m http.server 8080`
y abrir `http://localhost:8080`.

En el despliegue final esto no será necesario: GitHub Pages o Cloudflare Pages servirán los archivos por HTTPS.
