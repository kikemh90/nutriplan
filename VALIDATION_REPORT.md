# Validación del motor NutriPlan – Fase 2

## Resultado
Se han validado las funciones principales del motor y el versionado histórico.

### Pruebas unitarias superadas
1. Cálculo por punto medio y escalado de raciones.
2. Evaluación diaria en rango adecuado.
3. Supresión de avisos mientras un día está incompleto.
4. No penalización por superar objetivos mínimos de verdura/fruta/fibra.
5. Detección de objetivos semanales.
6. Detección de semana baja en pescado/legumbres y alta en carne roja.
7. Recalculo automático de semanas activas tras modificar una receta.
8. Inmutabilidad del snapshot histórico tras modificar una receta.
9. Conservación de `rulesVersion` histórico y reevaluación no destructiva.
10. Supresión de juicios semanales mientras la semana está incompleta.
11. Inferencia de día completo cuando existen comida y cena.
12. Bloqueo del cierre de semana si falta una receta activa en el catálogo.

## Ajustes introducidos durante la validación

### 1. Cobertura semanal
El motor anterior podía valorar una semana aunque solo hubiese uno o dos días planificados.
Ahora devuelve:
- `plannedDays`
- `completeDays`
- `targetDays`
- estado `incomplete` hasta que la semana pueda considerarse completa.

Mientras la semana está incompleta no emite valoraciones negativas de frecuencia semanal.

### 2. Promedios semanales
Se añaden estados para:
- calorías medias
- proteína media
- fibra media
- verdura media
- fruta media

La filosofía sigue siendo aproximada y tolerante.

### 3. Recetas ausentes
Una receta eliminada del catálogo ya no puede desaparecer silenciosamente del cálculo.
El motor devuelve IDs faltantes y no permite cerrar una semana si existen referencias activas sin resolver.

### 4. Histórico
Las semanas cerradas siguen usando snapshots.
La modificación posterior de una receta modifica semanas activas/futuras, pero no el histórico.

## Escenarios simulados

### Semana equilibrada
- ≈1.964 kcal/día
- 120 g proteína/día
- ≈29,6 g fibra/día
- ≈374 g verduras/día
- ≈2,1 frutas/día
- pescado 3
- pescado azul prioritario 2
- marisco 2
- legumbres 4
- carne roja 2
- frutos secos 4

Resultado: todas las métricas principales en estado adecuado.

### Semana poco variada
- Energía y proteína correctas.
- Fibra y verduras algo bajas.
- Fruta ≈1/día.
- Pescado 1.
- Pescado azul 0.
- Legumbres 1.
- Carne roja 3.
- Frutos secos 0.

Resultado: el motor distingue correctamente una semana con calorías razonables pero mala calidad/variedad.

### Fin de semana muy energético
- Media ≈2.186 kcal/día.
- Proteína media adecuada.
- Fibra adecuada.
- Verduras y fruta algo bajas.
- Frecuencias de pescado/legumbre correctas.
- Carne roja 3.

Resultado: energía semanal y calidad vegetal quedan en atención moderada sin convertir automáticamente toda la semana en “mala”.

## Observaciones para la futura interfaz
- Un día se considera completo por defecto cuando incluye `comida` y `cena`.
- La interfaz podrá permitir una anulación manual (`complete=true/false`) para días atípicos.
- El agua seguirá siendo un contador manual independiente.
- Conviene añadir más adelante un elemento simple “1 ración de fruta”, pero no bloquea la validación del motor.
