# Handoff — ronda de pulido UI/UX (2026-08-01)

Este documento resume la ronda de trabajo hecha sobre la revisión que el
usuario dio de las últimas 10 features grandes (chat, reacciones,
menciones, tiempo real, etc.). Está pensado para que otra sesión de Claude
Code pueda continuar sin el contexto de esta conversación.

**Estado del repo**: 8 commits nuevos en `main`, locales, **sin pushear**
(a pedido explícito del usuario — dejarlos listos para revisar antes de
subir). `git log --oneline origin/main..HEAD` los lista todos.

## Qué se pidió (resumen del mensaje original del usuario)

1. Reemplazar los diálogos nativos del navegador (`confirm`/`prompt`) por
   widgets propios estilo glass.
2. Mejorar la guía (onboarding) para cubrir las funciones nuevas, en
   desktop y mobile.
3. Revisar la vista mobile de todo lo agregado recientemente.
4. Arreglar el tablero Kanban: en desktop no se podía desplazar
   horizontalmente para ver las columnas restantes.
5. Los botones de "agregar" en cada vista de base de datos necesitaban más
   contenido/transfondo (antes muy sutiles o inexistentes).
6. El widget de "nueva base de datos" debía pedir más que solo el nombre.
7. El calendario que usa la vista Tabla es nativo del sistema (input de
   fecha del navegador) — reemplazarlo por uno propio.
8. Más pulido en Lista y Galería.
9. Chat: más pulido y detalles — animación en el estado vacío, nuevo
   chat/grupo, editar/eliminar, envío de fotos, comportamiento tipo
   WhatsApp en mobile (deslizar para ver opciones).
10. Papelera: botón "vaciar papelera", confirmación antes de borrar
    permanentemente, y poder revisar el contenido de un item archivado
    antes de decidir.
11. Notificaciones: un "ver historial de notificaciones" en pantalla
    completa (antes limitado a las últimas 20, solo en el dropdown).
12. El nombre/foto del usuario abajo a la izquierda del sidebar no llevaba
    a su perfil — arreglarlo.
13. "Mi agenda" debía estar fuera del área con scroll del sidebar, justo
    debajo de "Inicio".
14. Quitar el texto largo explicativo en el registro de horas.
15. Confirmar que solo los 3 correos autorizados pueden editar horas
    manualmente (ya estaba implementado de una ronda anterior — solo se
    verificó, no se tocó).
16. Dejar todo commiteado en local + esta documentación, sin hacer push.

## Qué se hizo, por commit/fase

1. **`c9d58f5` — Diálogos propios**: `src/components/ui/confirm-dialog.tsx`
   y `prompt-dialog.tsx` (nuevos, reusan `dialog.tsx`). Reemplazan
   `window.confirm`/`window.prompt` en `workspace-switcher.tsx`
   (crear/renombrar/borrar espacio) y `project-databases.tsx` (borrar base
   de datos vinculada). Eran los únicos 4 usos nativos en todo el código;
   no había ningún `alert()`.

2. **`d82bdd7` — Papelera, perfil, agenda, horas**:
   - `trash-list.tsx`: botón "Vaciar papelera" (nueva acción
     `emptyTrashAction` / `pageService.emptyTrash`), confirmación
     (`ConfirmDialog`) tanto para borrar un item como para vaciar todo, y
     un dialog de previsualización al tocar el nombre de un item
     (reutiliza `ReadonlyBlockEditor` vía `dynamic()` para mostrar el
     contenido real de la página archivada).
   - `sidebar.tsx`: "Mi agenda" se movió del `<nav overflow-y-auto>` al
     bloque fijo de arriba (debajo de "Inicio"). El pie del sidebar ahora
     usa el componente `UserPreview` (el mismo popup que se usa para otros
     miembros) en vez de un `<span>` decorativo — enlaza a `/account`
     (redirige ahí automáticamente cuando `userId === viewer.id`, lógica
     que ya existía en `members/[userId]/page.tsx`).
   - `hours/page.tsx`: se quitó el párrafo largo de instrucciones para
     quien puede editar horas manualmente.

3. **`f6a3627` — Historial de notificaciones**: nueva ruta
   `/w/[workspaceId]/notifications` con paginación por cursor
   (`getNotificationHistory` en `services/notification.ts`, sin el
   `take: 20` que sí sigue teniendo el dropdown) y filtro
   todas/no-leídas. Link "Ver historial de notificaciones" al pie de la
   campanita.

4. **`72cf452` — Guía actualizada**: nuevos pasos en
   `onboarding/steps.ts` para Chat, Papelera, Notificaciones y Bases de
   datos (con sus `data-tour` correspondientes agregados en `sidebar.tsx`
   y `notification-bell.tsx`). La tarjeta del tour ya limitaba su ancho a
   `min(320px, 100vw-2rem)`, así que ya era responsive en mobile — no se
   tocó esa parte.

5. **`1a35cec` — Kanban scroll**: el scroll horizontal **ya funcionaba**
   (`overflow-x-auto`), el problema era que `.no-scrollbar` lo escondía
   sin dejar pistas. Se agregó `.thin-scrollbar` (scrollbar fina visible,
   en `globals.css`), gradientes de fade en los bordes y botones de flecha
   que aparecen solo cuando hay contenido oculto (tracking vía
   `ResizeObserver` + `onScroll`).

6. **`afe7330` — Botones "agregar" enriquecidos**: List y Gallery view no
   tenían ningún botón de agregar — ahora sí (`addRowAction` reutilizada).
   Kanban y Calendario pasaron de texto/ícono sutil a píldoras con fondo
   siempre visible (antes dependían de `hover`, invisibles en mobile). El
   dialog de "Nueva base de datos" del proyecto ahora incluye un selector
   de icono (emoji, reutiliza el campo `Page.icon` que ya existía — sin
   migración).

7. **`aa1a6de` — Date picker propio**: `src/components/ui/date-picker.tsx`
   nuevo (popover glass, grilla mensual, botón "Hoy" y "Quitar fecha").
   Reemplaza los `<input type="date">` nativos en `DateCell` de
   `database-table.tsx` y en `task-due-date-input.tsx` /
   `task-start-date-input.tsx`. **Las vistas Calendario** (tablero y
   tareas) ya eran 100% custom — el "calendario nativo" del pedido
   original era este input de fecha, no esas vistas.

8. **`a336d0f` — Chat responsive + pulido**:
   - Layout tipo WhatsApp en mobile: `/chat` muestra solo la lista a
     pantalla completa; `/chat/[id]` oculta la lista y muestra el thread
     con botón "atrás". Desktop mantiene las dos columnas (breakpoint
     `md:`, mismo patrón que ya usaba `sidebar.tsx`).
   - Botón "+" (`NewChatDialog`) para iniciar un DM o crear un grupo
     nuevo (antes el único grupo posible era el canal automático por
     proyecto). Nuevo: `createGroupConversation` /
     `renameConversation` / `leaveConversation` en
     `services/chat.ts` + sus server actions.
   - Menú (⋯) en la cabecera del thread: renombrar grupo o
     salir/eliminar conversación, con los dialogs de la fase 1.
   - Gestos swipe en la lista de conversaciones (solo mobile, eventos
     touch nativos — **no se agregó ninguna librería de gestos**, el
     proyecto no tenía ninguna instalada): deslizar a la izquierda
     revela "Eliminar", a la derecha "Marcar leído".
   - Adjuntos que no son imagen ya no se renderizan como `<img>` rota:
     se detecta la extensión y se muestra una tarjeta de archivo con
     link de descarga.
   - Ícono con flotación suave (`animate-chat-float`, CSS puro) en los
     3 estados vacíos del chat.

## Decisiones de diseño / por qué

- **Sin dependencias nuevas**: todo (diálogos, date picker, swipe) se
  construyó con lo que ya había en el proyecto (Base UI, Tailwind,
  eventos touch nativos) para no inflar el bundle ni introducir una
  librería de gestos solo para 2 acciones de swipe.
- **`leaveConversation` cubre dos casos**: "salir del grupo" y "eliminar
  conversación 1 a 1 para mí" son la misma operación a nivel de datos
  (borrar la fila de `ConversationParticipant`), porque `ChatMessage.senderId`
  es `onDelete: SetNull` — los mensajes no se pierden para la otra
  persona.
- **Icono en "Nueva base de datos"**: se reutilizó `Page.icon` (ya
  existía en el schema) en vez de agregar un campo de color nuevo, para
  evitar una migración no pedida explícitamente.

## Pendiente / no verificado en vivo

- **No se pudo verificar visualmente en el navegador durante esta
  sesión**: otra sesión de Claude Code tenía el dev server corriendo en
  esta misma carpeta (mismo lock de Next.js), y no correspondía matar ese
  proceso porque es de otra sesión. Toda la verificación de esta ronda
  fue mecánica: `npm run typecheck`, `npm run lint` y `npm run build`
  limpios después de cada una de las 8 fases. **Antes de dar esto por
  definitivo, conviene levantar `npm run dev` y probar a mano**,
  especialmente:
  - El swipe en el chat en un viewport mobile real (los eventos touch no
    se pueden simular 100% fiel desde un mouse).
  - El popup de `UserPreview` en el pie del sidebar — se abre hacia abajo
    (`top-full`) y el pie del sidebar está pegado al borde inferior de la
    pantalla; podría quedar cortado en pantallas bajas. Si se ve mal,
    ese componente (`user-preview.tsx`) tiene la lógica de posicionamiento
    y habría que agregarle una variante que abra hacia arriba.
  - El date picker dentro de la celda de tabla (`database-table.tsx`)
    podría quedar corto de espacio en columnas angostas — revisar que el
    popover no se salga del contenedor con scroll horizontal de la tabla.
- **Tests de Vitest**: no se tocaron ni se agregaron nuevos en esta ronda
  (la suite mínima ya existía de la ronda anterior). Ninguno de los
  cambios de esta ronda tiene cobertura de test.
- **Push pendiente**: los 8 commits están solo en local. Cuando el
  usuario confirme que revisó todo, el siguiente paso es
  `git push origin main`.

## Cómo seguir probando

```bash
npm run dev
```

Flujos a revisar primero: Papelera (vaciar + preview), Kanban con muchas
columnas (arrastrar el scroll), crear una base de datos con icono, mover
la fecha límite de una tarea con el nuevo date picker, y el chat completo
en un viewport angosto (`resize_window` a `mobile` si se usa el navegador
embebido de Claude Code).
