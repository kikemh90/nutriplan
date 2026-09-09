# NutriPlan – Fase 4.3

## Correcciones
- Un día solo cuenta como completo cuando el usuario marca explícitamente `Día completo`.
- Se elimina la inferencia automática por tener comida + cena.
- El agua aparece consolidada dentro de `Extras` y puede ajustarse con `−250 / +250 ml`.

## Indicadores calóricos
Un día completo recibe un indicador:
- Verde: dentro de `targetMin-targetMax`.
- Amarillo: fuera del objetivo pero dentro de `softLow-softHigh`.
- Rojo: fuera de la tolerancia.
- Sin indicador: día no completado.

La misma función de clasificación se utiliza en el resumen diario, las pestañas semanales y el calendario mensual.

## Vista mensual
Dentro de Calendario:
- selector `Semana / Mes`;
- navegación por meses;
- puntos verde/amarillo/rojo solo para días completos;
- pulsar una fecha abre su semana y día correspondiente;
- resumen mensual con días registrados, verdes, amarillos, rojos y media de kcal de días completos.

## Filosofía
La planificación puede existir antes de consumir las comidas, pero no se considera histórico realizado hasta que el día se marca manualmente como completo.
