# Requerimientos — Sistema avanzado de tareas, chat y archivos

Anotado tal como lo pidió el usuario el 2026-07-31, antes de hacer push de los 10 commits
de la ronda anterior (permisos, cronómetro, dashboards, sidebar, plantillas, perfiles,
seed de invitados). Nada de esto se pierde: se implementa en nuevas fases sobre esa base.

## 1. Crear tarea — widget rico, no un input de texto

- Botón "Agregar" que abre una ventana/modal dinámica y bonita (no una barra de texto larga).
- Selección de: **tipo de tarea**, **etiquetas**, **prioridad**, **a quién se asigna**.
- Debe poder **arrastrar la tarea a la foto/nombre de un usuario** para asignarla (drag & drop).
- Una tarea puede tener **hasta 3 participantes/asignados** (no solo uno).
- Al crear, también poder agregar más datos: formularios, adjuntar archivos, incluso
  crear una carpeta dentro de la tarea o vincular un archivo/carpeta de la "base de datos"
  del proyecto (ver punto 4) colocando la ruta — la tarea redirige a esa info guardada.

## 2. Vista de detalle de una tarea (mucho más información)

- Horas invertidas (viene del cronómetro / WorkSession ya implementado).
- Comentarios, fotos, documentos.
- Estado actual y su historial.
- Todo el registro queda visible **incluso después de finalizada la tarea**.
- Borrar la tarea (incluso ya finalizada) es una decisión aparte/explícita, no automática.

## 3. Flujo de estados de una tarea

- **Por hacer → "Empezar a hacer"** pone la tarea en curso: a partir de ahí se documentan
  avances (notas, archivos) — estos avances son como una "rama" de la base de datos del
  proyecto (ej. "Base de datos alfa → Tarea 1 → avances").
- No se puede marcar como **Hecha** hasta que haya **avances verificables** documentados.
- El **manager puede ver esos avances**, comentarlos, dar feedback y **adjuntar archivos**
  en esos comentarios/feedback.
- Cuando el trabajador considera que ya tiene suficiente desarrollo, marca **Hecha**.
- Aun estando Hecha, el **manager puede revisar y mover la tarea de vuelta**:
  - a **Pendiente** (si hay que agregar extras)
  - a **En curso** (si se hizo mal o hay que cambiar algo)
- El historial de esa conversación/ida y vuelta entre estados debe quedar bien registrado
  y visible (histórico de conversación entre tareas).

## 4. "Bases de datos" por proyecto (archivos/carpetas)

- Cada proyecto puede tener una base de datos de archivos/carpetas propia (documentos,
  información de referencia).
- Puede haber una base de datos compartida entre **dos o más proyectos**.
- Desde una tarea se puede referenciar/vincular a una ruta dentro de esa base de datos.

## 5. Chat entre usuarios

- Chat 1:1 (y probablemente por proyecto/equipo) bien hecho y bonito, estilo iOS/liquid glass.

## 6. Notificaciones

- Cuando se asigna una tarea a alguien.
- Recordatorios de tareas por vencer (fecha límite próxima).

## 7. Visores de archivos "bonitos" dentro de la app

- Plantillas de Excel: verse mejor que Excel real dentro de Qubi.
- PDFs: visor propio, mejor que el de Word/lector genérico.
- Word, fotos, y demás tipos de archivo: cada uno con su propia ventana/visor bonito,
  como paneles extra dentro de la página (no descargar y abrir con otra app).

## 8. Estilo

- Excelente diseño tipo iOS, "liquid glass", transiciones fluidas — mismo lenguaje visual
  que ya se usó en las fases anteriores (login, sidebar, dashboards).

## 9. Proceso

- Ir dejando los commits listos en local (igual que la ronda anterior); NO hacer push
  todavía sin confirmarlo.
