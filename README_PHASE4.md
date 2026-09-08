# NutriPlan – Fase 4: PWA instalable

Esta versión convierte NutriPlan en una Progressive Web App preparada para iPhone.

## Incluye

- `manifest.webmanifest`
- iconos 192, 512, maskable y Apple Touch Icon
- `service-worker.js`
- cache offline del shell principal, motor, catálogo y reglas
- modo `standalone`
- metadatos específicos para iOS
- comprobación manual de actualizaciones desde ⚙️
- preparación para GitHub Pages y Cloudflare Pages
- `.nojekyll` para GitHub Pages
- `_headers` útil para Cloudflare Pages

## Uso esperado en iPhone

1. Publicar esta carpeta en GitHub Pages o Cloudflare Pages.
2. Abrir la URL HTTPS en Safari.
3. Compartir.
4. Añadir a pantalla de inicio.
5. Abrir como app web.

Después de la primera carga, el service worker mantiene disponibles offline:
- interfaz;
- motor;
- catálogo;
- reglas;
- iconos.

Los datos personales siguen almacenándose en `localStorage` del dispositivo.

## Actualizaciones

### Código de la app
Publicar una nueva versión en GitHub/Cloudflare.
El service worker detectará cambios y refrescará los recursos.

### Catálogo nutricional
Puede seguir actualizándose desde ⚙️ → Importar catálogo.

### Reglas
Puede actualizarse desde ⚙️ → Importar reglas.

### Datos personales
Pueden exportarse/importarse mediante copia de seguridad.

## Importante sobre iPhone
- La instalación PWA requiere servir la app por HTTPS.
- El service worker no funciona abriendo `index.html` directamente desde Archivos.
- GitHub Pages y Cloudflare Pages proporcionan HTTPS automáticamente.

## Publicación rápida en GitHub Pages
1. Crear un repositorio nuevo.
2. Subir todo el contenido de esta carpeta a la raíz del repositorio.
3. En GitHub: Settings → Pages.
4. Source: Deploy from a branch.
5. Branch: `main`, carpeta `/root`.
6. Guardar.
7. Esperar a que GitHub muestre la URL pública.

## Publicación rápida en Cloudflare Pages
1. Crear un proyecto Pages.
2. Conectar el repositorio GitHub o subir el proyecto.
3. Framework preset: None.
4. Build command: dejar vacío.
5. Output directory: `/` o la raíz del proyecto.
6. Deploy.
7. Abrir la URL `.pages.dev`.

## Próxima validación recomendada
Probar en el iPhone real:
- instalación desde Safari;
- apertura sin barra del navegador;
- lista de compra offline;
- planificación offline;
- persistencia después de cerrar/reabrir;
- exportar backup;
- importar catálogo actualizado;
- actualización de versión.
