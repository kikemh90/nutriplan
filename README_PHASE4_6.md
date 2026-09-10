# NutriPlan – Fase 4.6

## Nuevas funcionalidades
- Alimentos personalizados:
  - crear, editar y eliminar;
  - guardado local en el dispositivo;
  - separados del catálogo base;
  - disponibles en búsqueda y lista de compra.
- Recetas personalizadas:
  - crear, editar y eliminar;
  - nutrición por ración;
  - disponibles en Recetas y calendario.
- Comidas manuales:
  - acceso desde cada momento del día mediante el botón ✎;
  - nombre, kcal y macros opcionales;
  - pensadas para restaurantes, celebraciones o comidas fuera del catálogo;
  - afectan al total diario y por tanto a los indicadores calóricos.

## Persistencia
Todo se guarda en `localStorage` y queda incluido en la copia de seguridad existente.

## Alcance deliberado
La IA queda fuera de esta fase.
Los alimentos personalizados no se añaden directamente al motor calórico del calendario; para eso se usan recetas personalizadas o comidas manuales.
