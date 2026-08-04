import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ConversationType,
  InviteStatus,
  IssueCommentKind,
  IssueStatus,
  IssueType,
  NotificationType,
  Priority,
  ProgressTimerPolicy,
  WorkspaceRole,
} from "../src/generated/prisma/enums";
import {
  GUEST_ADMIN_EMAIL,
  GUEST_MEMBER_EMAIL,
  GUEST_PASSWORD,
} from "../src/lib/guest-accounts";

// ============================================================================
// Seed de demostración de Qubi.
//
// Crea (o refresca) el espacio "Qubi Demo" con dos cuentas de invitado que se
// pueden usar tal cual, en local y EN PRODUCCIÓN:
//
//   · Manager  -> invitado.admin@qubi.local    (rol OWNER)
//   · Trabajador -> invitado.miembro@qubi.local (rol MEMBER, del equipo del manager)
//
// Ambas comparten la contraseña de GUEST_PASSWORD y salen anunciadas en el
// login. El objetivo es que TODAS las pantallas tengan contenido real desde el
// primer inicio de sesión: inicio, agenda, proyectos (tablero/lista/cronograma/
// calendario), detalle de tarea con avances y evidencia, horas, avances diarios,
// vista de manager, chat 1 a 1 y de proyecto, notificaciones, bases de datos de
// archivos, páginas, favoritos y papelera.
//
// Es idempotente y ACOTADO: solo toca el workspace de slug "qubi-demo" y las
// cuentas de demo, así que se puede volver a ejecutar en un entorno con datos
// reales sin tocarlos.
//
//   Local:      npm run db:seed
//   Producción: docker compose -f docker-compose.prod.yml run --rm seed
// ============================================================================

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta la variable DATABASE_URL");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const WORKSPACE_SLUG = "qubi-demo";

// ── Utilidades de fechas ────────────────────────────────────────────────────

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Momento concreto (hora local) de hace n días.
function at(daysAgo: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function isWeekend(d: Date) {
  return d.getDay() === 0 || d.getDay() === 6;
}

// Aleatorio reproducible: el mismo seed genera siempre los mismos números, así
// las capturas y los totales no bailan entre ejecuciones.
let randomSeed = 20260801;
function rand() {
  randomSeed = (randomSeed * 1103515245 + 12345) % 2147483648;
  return randomSeed / 2147483648;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

// ── Evidencia visual sin depender de S3 ─────────────────────────────────────
// Las capturas de los avances se generan como SVG embebido (data URI): así el
// seed funciona igual en local y en el VPS aunque MinIO todavía no tenga nada
// subido, y no deja adjuntos rotos.

function evidenceImage(title: string, subtitle: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="405" viewBox="0 0 720 405">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="720" height="405" rx="24" fill="url(#g)"/>
  <rect x="36" y="36" width="648" height="333" rx="18" fill="#ffffff" fill-opacity="0.92"/>
  <rect x="72" y="82" width="320" height="18" rx="9" fill="${color}" fill-opacity="0.85"/>
  <rect x="72" y="120" width="540" height="10" rx="5" fill="#94a3b8" fill-opacity="0.5"/>
  <rect x="72" y="142" width="470" height="10" rx="5" fill="#94a3b8" fill-opacity="0.5"/>
  <rect x="72" y="164" width="510" height="10" rx="5" fill="#94a3b8" fill-opacity="0.5"/>
  <rect x="72" y="206" width="180" height="90" rx="12" fill="${color}" fill-opacity="0.25"/>
  <rect x="268" y="206" width="180" height="90" rx="12" fill="${color}" fill-opacity="0.18"/>
  <rect x="464" y="206" width="148" height="90" rx="12" fill="${color}" fill-opacity="0.12"/>
  <text x="72" y="330" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="22" font-weight="600" fill="#0f172a">${title}</text>
  <text x="72" y="356" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="15" fill="#475569">${subtitle}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function avatar(initials: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="${color}"/>
  <text x="80" y="98" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="62" font-weight="600" fill="#ffffff">${initials}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// Mención tal como la guarda el editor: @[Nombre](userId).
function mention(user: { id: string; name: string | null }) {
  return `@[${user.name ?? "alguien"}](${user.id})`;
}

async function main() {
  console.log("Sembrando el espacio de demostración…");
  const hashedPassword = await bcrypt.hash(GUEST_PASSWORD, 10);

  // ── Cuentas ───────────────────────────────────────────────────────────────
  // Las dos de invitado tienen contraseña (se anuncian en el login). Las otras
  // dos son compañeros de equipo: dan cuerpo al panel de manager, al chat y a
  // las asignaciones, pero no se usan para entrar.

  const admin = await prisma.user.upsert({
    where: { email: GUEST_ADMIN_EMAIL },
    update: {
      hashedPassword,
      emailVerified: new Date(),
      name: "Ana Ruiz (manager invitada)",
      image: avatar("AR", "#6d28d9"),
    },
    create: {
      email: GUEST_ADMIN_EMAIL,
      name: "Ana Ruiz (manager invitada)",
      hashedPassword,
      emailVerified: new Date(),
      image: avatar("AR", "#6d28d9"),
    },
  });

  const member = await prisma.user.upsert({
    where: { email: GUEST_MEMBER_EMAIL },
    update: {
      hashedPassword,
      emailVerified: new Date(),
      name: "Beto Salas (trabajador invitado)",
      image: avatar("BS", "#1D9E75"),
    },
    create: {
      email: GUEST_MEMBER_EMAIL,
      name: "Beto Salas (trabajador invitado)",
      hashedPassword,
      emailVerified: new Date(),
      image: avatar("BS", "#1D9E75"),
    },
  });

  const carla = await prisma.user.upsert({
    where: { email: "carla.demo@qubi.local" },
    update: { name: "Carla Peña", image: avatar("CP", "#D4537E") },
    create: {
      email: "carla.demo@qubi.local",
      name: "Carla Peña",
      emailVerified: new Date(),
      image: avatar("CP", "#D4537E"),
    },
  });

  const diego = await prisma.user.upsert({
    where: { email: "diego.demo@qubi.local" },
    update: { name: "Diego Ortiz", image: avatar("DO", "#EF9F27") },
    create: {
      email: "diego.demo@qubi.local",
      name: "Diego Ortiz",
      emailVerified: new Date(),
      image: avatar("DO", "#EF9F27"),
    },
  });

  // Se borra el espacio demo anterior (si existe) para partir de datos limpios;
  // las cascadas del schema limpian proyectos, tareas, horas, chat, etc.
  const existing = await prisma.workspace.findUnique({
    where: { slug: WORKSPACE_SLUG },
  });
  if (existing) await prisma.workspace.delete({ where: { id: existing.id } });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Qubi Demo",
      slug: WORKSPACE_SLUG,
      icon: "🧊",
      ownerId: admin.id,
      members: {
        // Jornadas distintas a propósito: así se ve que la carga se mide
        // contra la capacidad de cada quien, no contra una cifra única.
        create: [
          { userId: admin.id, role: WorkspaceRole.OWNER },
          { userId: member.id, role: WorkspaceRole.MEMBER },
          {
            userId: carla.id,
            role: WorkspaceRole.MEMBER,
            weeklyCapacityMinutes: 20 * 60,
          },
          {
            userId: diego.id,
            role: WorkspaceRole.MEMBER,
            weeklyCapacityMinutes: 30 * 60,
          },
        ],
      },
    },
  });

  // Invitación pendiente (pantalla de miembros).
  await prisma.workspaceInvite.create({
    data: {
      workspaceId: workspace.id,
      email: "nuevo.compañero@qubi.local",
      role: WorkspaceRole.MEMBER,
      status: InviteStatus.PENDING,
      invitedById: admin.id,
    },
  });

  // ── Etiquetas ─────────────────────────────────────────────────────────────
  const labelDefs = [
    { name: "Frontend", color: "#378ADD" },
    { name: "Backend", color: "#1D9E75" },
    { name: "Diseño", color: "#D4537E" },
    { name: "Urgente", color: "#D85A30" },
    { name: "Documentación", color: "#7F77DD" },
    { name: "QA", color: "#EF9F27" },
  ];
  const labels: Record<string, string> = {};
  for (const l of labelDefs) {
    const created = await prisma.label.create({
      data: { workspaceId: workspace.id, ...l },
    });
    labels[l.name] = created.id;
  }

  // ── Proyectos ─────────────────────────────────────────────────────────────
  // Cada uno con su política de cronómetro al documentar avances: el manager la
  // elige al crear el proyecto y se puede afinar tarea por tarea.
  const web = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Sitio web corporativo",
      description:
        "Rediseño del sitio público: landing, blog y formulario de contacto.",
      color: "#6d28d9",
      progressTimerPolicy: ProgressTimerPolicy.PAUSE,
    },
  });
  const app = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "App móvil Qubi",
      description:
        "Aplicación para iOS y Android: onboarding, pagos y offline.",
      color: "#1D9E75",
      progressTimerPolicy: ProgressTimerPolicy.HALF,
    },
  });
  const ops = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Operaciones y soporte",
      description: "Soporte a clientes, incidencias y tareas recurrentes.",
      color: "#EF9F27",
      progressTimerPolicy: ProgressTimerPolicy.PAUSE,
    },
  });

  // ── Tareas ────────────────────────────────────────────────────────────────

  type TaskDef = {
    project: { id: string; name: string; color: string | null };
    title: string;
    body: string;
    type: IssueType;
    status: IssueStatus;
    priority: Priority;
    assignees: { id: string; name: string | null }[];
    labels: string[];
    dueDateOffset?: number;
    startDateOffset?: number;
    progressTimerPolicy?: ProgressTimerPolicy;
    estimateHours?: number;
  };

  const taskDefs: TaskDef[] = [
    // ── Sitio web ───────────────────────────────────────────────────────────
    {
      project: web,
      title: "Rediseñar la landing page",
      body: "Nueva jerarquía visual, foco en la propuesta de valor y un único llamado a la acción.",
      type: IssueType.IMPROVEMENT,
      status: IssueStatus.DONE,
      priority: Priority.HIGH,
      assignees: [member, carla],
      labels: ["Frontend", "Diseño"],
      dueDateOffset: -6,
      startDateOffset: -14,
    },
    {
      project: web,
      title: "Optimizar imágenes del hero",
      body: "Pasar a AVIF con respaldo en WebP y cargar en diferido lo que está bajo el pliegue.",
      type: IssueType.TASK,
      status: IssueStatus.DONE,
      priority: Priority.MEDIUM,
      assignees: [member],
      labels: ["Frontend"],
      dueDateOffset: -4,
      startDateOffset: -9,
    },
    {
      project: web,
      title: "Formulario de contacto con validación",
      estimateHours: 6,
      body: "Validación en cliente y servidor, protección anti-spam y correo de confirmación.",
      type: IssueType.FEATURE,
      status: IssueStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assignees: [member],
      labels: ["Frontend", "Backend"],
      dueDateOffset: 2,
      startDateOffset: -3,
    },
    {
      project: web,
      title: "Corregir el menú en móvil",
      estimateHours: 4,
      body: "En pantallas pequeñas el menú se queda abierto al navegar a otra sección.",
      type: IssueType.BUG,
      status: IssueStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assignees: [member, diego],
      labels: ["Frontend", "Urgente"],
      dueDateOffset: 1,
      startDateOffset: -1,
      // En esta tarea el manager prefiere que documentar no congele el reloj.
      progressTimerPolicy: ProgressTimerPolicy.HALF,
    },
    {
      project: web,
      title: "Revisar el SEO técnico",
      estimateHours: 5,
      body: "Sitemap, datos estructurados, encabezados y velocidad de carga.",
      type: IssueType.TASK,
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assignees: [carla],
      labels: ["Documentación"],
      dueDateOffset: 5,
    },
    {
      project: web,
      title: "Migrar a HTTPS estricto",
      estimateHours: 3,
      body: "Activar HSTS y revisar los enlaces internos que todavía van por http.",
      type: IssueType.TASK,
      status: IssueStatus.TODO,
      priority: Priority.LOW,
      assignees: [admin],
      labels: ["Backend"],
      dueDateOffset: 11,
    },
    {
      project: web,
      title: "Pulir las animaciones de scroll",
      body: "Suavizar las transiciones y respetar «reducir movimiento».",
      type: IssueType.IMPROVEMENT,
      status: IssueStatus.TODO,
      priority: Priority.LOW,
      assignees: [member],
      labels: ["Diseño"],
      dueDateOffset: -1, // vencida: aparece en rojo en la agenda
    },
    {
      project: web,
      title: "Publicar el blog de novedades",
      estimateHours: 12,
      body: "Listado paginado, página de artículo y RSS.",
      type: IssueType.FEATURE,
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assignees: [carla, member],
      labels: ["Frontend", "Documentación"],
      dueDateOffset: 16,
      startDateOffset: 6,
    },

    // ── App móvil ───────────────────────────────────────────────────────────
    {
      project: app,
      title: "Configurar notificaciones push",
      body: "Permisos, registro del dispositivo y envío de prueba desde el panel.",
      type: IssueType.FEATURE,
      status: IssueStatus.DONE,
      priority: Priority.HIGH,
      assignees: [member],
      labels: ["Backend"],
      dueDateOffset: -8,
      startDateOffset: -16,
    },
    {
      project: app,
      title: "Pantalla de onboarding",
      estimateHours: 10,
      body: "Tres pasos con ilustraciones, opción de saltar y guardado del progreso.",
      type: IssueType.FEATURE,
      status: IssueStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assignees: [member, carla, diego],
      labels: ["Frontend", "Diseño"],
      dueDateOffset: 3,
      startDateOffset: -4,
    },
    {
      project: app,
      title: "Integrar la pasarela de pagos",
      estimateHours: 16,
      body: "Cobro con tarjeta, reintentos y recibo por correo.",
      type: IssueType.FEATURE,
      status: IssueStatus.TODO,
      priority: Priority.HIGH,
      assignees: [admin],
      labels: ["Backend", "Urgente"],
      dueDateOffset: 7,
      startDateOffset: 1,
    },
    {
      project: app,
      title: "Modo sin conexión",
      estimateHours: 14,
      body: "Cachear las últimas tareas y sincronizar al recuperar la red.",
      type: IssueType.FEATURE,
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assignees: [member],
      labels: ["Backend"],
      dueDateOffset: 14,
      startDateOffset: 8,
    },
    {
      project: app,
      title: "La sesión se cierra sola en Android",
      estimateHours: 5,
      body: "Pasadas unas horas la app pide iniciar sesión otra vez; revisar el refresco del token.",
      type: IssueType.BUG,
      status: IssueStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assignees: [diego],
      labels: ["Urgente", "QA"],
      dueDateOffset: 0, // vence hoy
      startDateOffset: -2,
    },
    {
      project: app,
      title: "Publicar en las tiendas",
      estimateHours: 8,
      body: "Fichas, capturas, política de privacidad y revisión de Apple.",
      type: IssueType.TASK,
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assignees: [admin, carla],
      labels: ["Documentación"],
      dueDateOffset: 22,
      startDateOffset: 15,
    },
    {
      project: app,
      title: "Pruebas de rendimiento",
      estimateHours: 6,
      body: "Medir arranque en frío y consumo de memoria en gama media.",
      type: IssueType.TASK,
      status: IssueStatus.TODO,
      priority: Priority.LOW,
      assignees: [diego],
      labels: ["QA"],
      dueDateOffset: 18,
    },

    // ── Operaciones ─────────────────────────────────────────────────────────
    {
      project: ops,
      title: "Atender la cola de soporte",
      estimateHours: 8,
      body: "Responder los tiquetes abiertos y escalar los que sean incidencias.",
      type: IssueType.TASK,
      status: IssueStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      assignees: [member],
      labels: ["Urgente"],
      dueDateOffset: 1,
      startDateOffset: -5,
    },
    {
      project: ops,
      title: "Copia de seguridad semanal",
      body: "Verificar que el volcado de la base de datos se guarda fuera del servidor.",
      type: IssueType.TASK,
      status: IssueStatus.DONE,
      priority: Priority.HIGH,
      assignees: [admin],
      labels: ["Backend"],
      dueDateOffset: -2,
      startDateOffset: -3,
    },
    {
      project: ops,
      title: "Documentar el proceso de alta de clientes",
      estimateHours: 4,
      body: "Guía paso a paso para que cualquiera del equipo pueda hacerlo.",
      type: IssueType.DOCS,
      status: IssueStatus.TODO,
      priority: Priority.LOW,
      assignees: [carla],
      labels: ["Documentación"],
      dueDateOffset: 9,
    },
    {
      project: ops,
      title: "Revisar las alertas del servidor",
      estimateHours: 3,
      body: "Ajustar umbrales: están saltando avisos de disco sin motivo.",
      type: IssueType.BUG,
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assignees: [diego],
      labels: ["Backend", "QA"],
      dueDateOffset: 4,
    },
  ];

  let number = 1;
  type CreatedTask = {
    id: string;
    number: number;
    title: string;
    projectId: string;
    projectColor: string | null;
    status: IssueStatus;
  };
  const tasks: CreatedTask[] = [];

  for (const t of taskDefs) {
    const issue = await prisma.issue.create({
      data: {
        workspaceId: workspace.id,
        projectId: t.project.id,
        number: number++,
        title: t.title,
        body: t.body,
        type: t.type,
        status: t.status,
        priority: t.priority,
        progressTimerPolicy: t.progressTimerPolicy ?? null,
        estimateMinutes:
          t.estimateHours != null ? Math.round(t.estimateHours * 60) : null,
        authorId: admin.id,
        assignees: { create: t.assignees.map((u) => ({ userId: u.id })) },
        labels: {
          create: t.labels.map((name) => ({ labelId: labels[name] })),
        },
        dueDate: t.dueDateOffset != null ? daysFromNow(t.dueDateOffset) : null,
        startDate:
          t.startDateOffset != null ? daysFromNow(t.startDateOffset) : null,
        completedAt: t.status === IssueStatus.DONE ? at(2, 17) : null,
      },
    });

    // Historial de estados coherente con la fase en la que está la tarea.
    const events: {
      fromStatus: IssueStatus | null;
      toStatus: IssueStatus;
      daysAgo: number;
      note?: string;
    }[] = [{ fromStatus: null, toStatus: IssueStatus.TODO, daysAgo: 18 }];
    if (t.status !== IssueStatus.TODO) {
      events.push({
        fromStatus: IssueStatus.TODO,
        toStatus: IssueStatus.IN_PROGRESS,
        daysAgo: Math.abs(t.startDateOffset ?? 5),
      });
    }
    if (t.status === IssueStatus.DONE) {
      events.push({
        fromStatus: IssueStatus.IN_PROGRESS,
        toStatus: IssueStatus.DONE,
        daysAgo: 2,
        note: "Entregado y revisado con el manager.",
      });
    }
    for (const ev of events) {
      await prisma.issueStatusEvent.create({
        data: {
          issueId: issue.id,
          fromStatus: ev.fromStatus,
          toStatus: ev.toStatus,
          actorId: ev.toStatus === IssueStatus.DONE ? member.id : admin.id,
          note: ev.note ?? "",
          createdAt: at(ev.daysAgo, 9, 30),
        },
      });
    }

    tasks.push({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      projectId: t.project.id,
      projectColor: t.project.color,
      status: t.status,
    });
  }

  const byTitle = (title: string) => {
    const found = tasks.find((t) => t.title === title);
    if (!found) throw new Error(`Tarea no encontrada en el seed: ${title}`);
    return found;
  };

  // ── Avances, comentarios, feedback y evidencia ────────────────────────────

  async function addNote(opts: {
    task: CreatedTask;
    author: { id: string; name: string | null };
    kind: IssueCommentKind;
    body: string;
    daysAgo: number;
    hour: number;
    evidence?: { title: string; subtitle: string; color: string };
    files?: { name: string; mimeType: string; title: string; color: string }[];
    reactions?: { user: { id: string }; emoji: string }[];
  }) {
    const image = opts.evidence
      ? evidenceImage(
          opts.evidence.title,
          opts.evidence.subtitle,
          opts.evidence.color,
        )
      : null;
    const comment = await prisma.issueComment.create({
      data: {
        issueId: opts.task.id,
        authorId: opts.author.id,
        kind: opts.kind,
        body: opts.body,
        attachmentUrl: image,
        createdAt: at(opts.daysAgo, opts.hour),
      },
    });
    if (image) {
      await prisma.issueAttachment.create({
        data: {
          issueId: opts.task.id,
          commentId: comment.id,
          url: image,
          name: `captura-${opts.task.number}-${opts.daysAgo}.svg`,
          mimeType: "image/svg+xml",
          size: image.length,
          uploadedById: opts.author.id,
          createdAt: at(opts.daysAgo, opts.hour),
        },
      });
    }
    for (const f of opts.files ?? []) {
      const url = evidenceImage(f.title, opts.task.title, f.color);
      await prisma.issueAttachment.create({
        data: {
          issueId: opts.task.id,
          commentId: comment.id,
          url,
          name: f.name,
          mimeType: f.mimeType,
          size: url.length,
          uploadedById: opts.author.id,
          createdAt: at(opts.daysAgo, opts.hour),
        },
      });
    }
    for (const r of opts.reactions ?? []) {
      await prisma.issueCommentReaction.create({
        data: { commentId: comment.id, userId: r.user.id, emoji: r.emoji },
      });
    }
    return comment;
  }

  const landing = byTitle("Rediseñar la landing page");
  const formulario = byTitle("Formulario de contacto con validación");
  const menuMovil = byTitle("Corregir el menú en móvil");
  const onboarding = byTitle("Pantalla de onboarding");
  const soporte = byTitle("Atender la cola de soporte");
  const sesionAndroid = byTitle("La sesión se cierra sola en Android");
  const push = byTitle("Configurar notificaciones push");

  await addNote({
    task: landing,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: "Primera versión de la nueva jerarquía. El bloque de precios queda debajo del testimonio, como habíamos hablado.",
    daysAgo: 9,
    hour: 11,
    evidence: {
      title: "Landing · versión 1",
      subtitle: "Nueva jerarquía visual",
      color: "#6d28d9",
    },
    reactions: [
      { user: admin, emoji: "👍" },
      { user: carla, emoji: "🎉" },
    ],
  });
  await addNote({
    task: landing,
    author: admin,
    kind: IssueCommentKind.REVIEW_FEEDBACK,
    body: `Muy bien ${mention(member)}. Ajusta el contraste del botón principal y súbelo un poco: en móvil queda fuera de pantalla.`,
    daysAgo: 8,
    hour: 16,
  });
  await addNote({
    task: landing,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: "Corregido el contraste y subido el botón. Referencia de la paleta: https://www.figma.com/file/qubi-marca",
    daysAgo: 7,
    hour: 10,
    evidence: {
      title: "Landing · versión final",
      subtitle: "Contraste corregido, CTA visible en móvil",
      color: "#6d28d9",
    },
    files: [
      {
        name: "medidas-accesibilidad.svg",
        mimeType: "image/svg+xml",
        title: "Contraste AA verificado",
        color: "#1D9E75",
      },
    ],
    reactions: [{ user: admin, emoji: "✅" }],
  });
  await addNote({
    task: landing,
    author: carla,
    kind: IssueCommentKind.COMMENT,
    body: "Dejé los textos definitivos en la base alfa, en «Textos de la landing.docx».",
    daysAgo: 7,
    hour: 12,
  });

  await addNote({
    task: formulario,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: "Validación en cliente lista (campos obligatorios, formato de correo y longitud del mensaje). Falta la parte del servidor.",
    daysAgo: 2,
    hour: 10,
    evidence: {
      title: "Formulario de contacto",
      subtitle: "Errores en línea y estados de carga",
      color: "#378ADD",
    },
  });
  await addNote({
    task: formulario,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: "Añadida la protección anti-spam. Documenté el flujo aquí: https://qubi.app/docs/contacto",
    daysAgo: 1,
    hour: 15,
    reactions: [{ user: admin, emoji: "👀" }],
  });
  await addNote({
    task: formulario,
    author: admin,
    kind: IssueCommentKind.REVIEW_FEEDBACK,
    body: "Buen ritmo. Antes de darlo por hecho, prueba con un correo con tilde y con un mensaje muy largo.",
    daysAgo: 1,
    hour: 17,
  });

  await addNote({
    task: menuMovil,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: "Reproducido en un iPhone SE: el menú no se cierra al pulsar un enlace del propio menú. Ya tengo la causa.",
    daysAgo: 1,
    hour: 9,
    evidence: {
      title: "Menú móvil",
      subtitle: "El panel queda abierto tras navegar",
      color: "#D85A30",
    },
  });

  await addNote({
    task: onboarding,
    author: carla,
    kind: IssueCommentKind.PROGRESS,
    body: "Ilustraciones de los tres pasos terminadas y exportadas en 2x y 3x.",
    daysAgo: 3,
    hour: 12,
    evidence: {
      title: "Onboarding · 3 pasos",
      subtitle: "Ilustraciones exportadas",
      color: "#1D9E75",
    },
    reactions: [{ user: member, emoji: "❤️" }],
  });
  await addNote({
    task: onboarding,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: `Pasos 1 y 2 montados. ${mention(diego)} ¿puedes probar el salto de paso en Android?`,
    daysAgo: 1,
    hour: 16,
  });

  await addNote({
    task: push,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: "Envío de prueba recibido en los dos sistemas. Queda documentado el permiso que hay que pedir en iOS.",
    daysAgo: 9,
    hour: 17,
    evidence: {
      title: "Notificación de prueba",
      subtitle: "Recibida en iOS y Android",
      color: "#1D9E75",
    },
  });

  await addNote({
    task: soporte,
    author: member,
    kind: IssueCommentKind.PROGRESS,
    body: "Cerrados 9 tiquetes; quedan 2 escalados a incidencia.",
    daysAgo: 0,
    hour: 11,
  });

  await addNote({
    task: sesionAndroid,
    author: diego,
    kind: IssueCommentKind.PROGRESS,
    body: "Pasa cuando la app estuvo más de 6 horas en segundo plano. Estoy revisando el refresco del token.",
    daysAgo: 1,
    hour: 14,
  });
  await addNote({
    task: sesionAndroid,
    author: admin,
    kind: IssueCommentKind.COMMENT,
    body: `${mention(diego)} si confirmas la causa, abre una tarea aparte para el refresco silencioso.`,
    daysAgo: 0,
    hour: 9,
  });

  // ── Sesiones de cronómetro (pestaña «Avances») ────────────────────────────
  // Incluye una sesión demasiado corta (por debajo del mínimo) para que se vea
  // el aviso de que ese tiempo no cuenta como horas trabajadas.

  async function addSession(opts: {
    user: { id: string };
    task: CreatedTask;
    daysAgo: number;
    startHour: number;
    minutes: number;
    discarded?: boolean;
    note?: { body: string; evidence?: { title: string; subtitle: string } };
  }) {
    const startedAt = at(opts.daysAgo, opts.startHour);
    const endedAt = new Date(startedAt.getTime() + opts.minutes * 60000);
    const session = await prisma.workSession.create({
      data: {
        userId: opts.user.id,
        projectId: opts.task.projectId,
        workspaceId: workspace.id,
        issueId: opts.task.id,
        startedAt,
        endedAt,
        minutes: opts.minutes,
        discarded: opts.discarded ?? false,
      },
    });
    if (opts.note) {
      await prisma.workSessionNote.create({
        data: {
          sessionId: session.id,
          body: opts.note.body,
          screenshotUrl: opts.note.evidence
            ? evidenceImage(
                opts.note.evidence.title,
                opts.note.evidence.subtitle,
                opts.task.projectColor ?? "#6d28d9",
              )
            : null,
          createdAt: endedAt,
        },
      });
    }
    return session;
  }

  await addSession({
    user: member,
    task: formulario,
    daysAgo: 0,
    startHour: 9,
    minutes: 95,
    note: {
      body: "Validaciones del formulario y mensajes de error.",
      evidence: {
        title: "Sesión de la mañana",
        subtitle: "Validaciones terminadas",
      },
    },
  });
  await addSession({
    user: member,
    task: menuMovil,
    daysAgo: 0,
    startHour: 11,
    minutes: 7,
    discarded: true, // por debajo del mínimo: no cuenta como horas
    note: { body: "Reproduje el fallo, pero me interrumpieron enseguida." },
  });
  await addSession({
    user: member,
    task: soporte,
    daysAgo: 1,
    startHour: 8,
    minutes: 140,
    note: { body: "Cola de soporte: 9 tiquetes cerrados." },
  });
  await addSession({
    user: member,
    task: onboarding,
    daysAgo: 1,
    startHour: 14,
    minutes: 115,
    note: {
      body: "Montaje de los pasos 1 y 2 del onboarding.",
      evidence: { title: "Onboarding", subtitle: "Pasos 1 y 2 montados" },
    },
  });
  await addSession({
    user: member,
    task: formulario,
    daysAgo: 2,
    startHour: 9,
    minutes: 180,
    note: { body: "Arranque del formulario: estructura y estados." },
  });
  await addSession({
    user: admin,
    task: byTitle("Copia de seguridad semanal"),
    daysAgo: 2,
    startHour: 16,
    minutes: 45,
    note: { body: "Verificada la copia fuera del servidor." },
  });
  await addSession({
    user: carla,
    task: onboarding,
    daysAgo: 3,
    startHour: 10,
    minutes: 210,
    note: { body: "Ilustraciones de los tres pasos." },
  });
  await addSession({
    user: diego,
    task: sesionAndroid,
    daysAgo: 1,
    startHour: 13,
    minutes: 130,
    note: { body: "Rastreo del cierre de sesión en Android." },
  });

  // ── Horas de las últimas 4 semanas ────────────────────────────────────────
  // Imputadas a una tarea concreta de cada proyecto, que es lo que alimenta las
  // «horas invertidas» del detalle de tarea y el panel de manager.

  const timeableByProject = [
    { project: web, tasks: tasks.filter((t) => t.projectId === web.id) },
    { project: app, tasks: tasks.filter((t) => t.projectId === app.id) },
    { project: ops, tasks: tasks.filter((t) => t.projectId === ops.id) },
  ];

  for (const person of [admin, member, carla, diego]) {
    for (let dayOffset = -27; dayOffset <= 0; dayOffset++) {
      const date = daysFromNow(dayOffset);
      if (isWeekend(date)) continue;
      // Cada quien reparte su día entre uno o dos proyectos.
      const howMany = rand() > 0.45 ? 2 : 1;
      for (let i = 0; i < howMany; i++) {
        const bucket = pick(timeableByProject);
        if (bucket.tasks.length === 0) continue;
        const task = pick(bucket.tasks);
        const minutes = 60 + Math.floor(rand() * 4) * 30; // 1 h – 2 h 30
        const existing = await prisma.timeEntry.findFirst({
          where: {
            projectId: bucket.project.id,
            userId: person.id,
            date,
            issueId: task.id,
          },
          select: { id: true, minutes: true },
        });
        if (existing) {
          await prisma.timeEntry.update({
            where: { id: existing.id },
            data: { minutes: existing.minutes + minutes },
          });
        } else {
          await prisma.timeEntry.create({
            data: {
              projectId: bucket.project.id,
              userId: person.id,
              issueId: task.id,
              date,
              minutes,
            },
          });
        }
      }
    }
  }

  // ── Chat: 1 a 1 y canales de proyecto ─────────────────────────────────────

  const dm = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      type: ConversationType.DIRECT,
      participants: {
        create: [
          { userId: admin.id, lastReadAt: at(0, 12) },
          { userId: member.id, lastReadAt: at(1, 18) },
        ],
      },
    },
  });

  const dmMessages: {
    sender: { id: string };
    body: string;
    daysAgo: number;
    hour: number;
    minute?: number;
    reactions?: { user: { id: string }; emoji: string }[];
  }[] = [
    {
      sender: admin,
      body: "¡Buenos días! ¿Cómo va el formulario de contacto?",
      daysAgo: 2,
      hour: 9,
    },
    {
      sender: member,
      body: "Bien, ya tengo la validación en cliente. Hoy le meto la del servidor.",
      daysAgo: 2,
      hour: 9,
      minute: 12,
      reactions: [{ user: admin, emoji: "👍" }],
    },
    {
      sender: admin,
      body: "Perfecto. Acuérdate de dejar el avance con captura antes de cerrar el cronómetro.",
      daysAgo: 2,
      hour: 9,
      minute: 15,
    },
    {
      sender: member,
      body: "Hecho, subí la captura de los mensajes de error.",
      daysAgo: 1,
      hour: 15,
      minute: 40,
      reactions: [
        { user: admin, emoji: "🎉" },
        { user: admin, emoji: "✅" },
      ],
    },
    {
      sender: admin,
      body: "Lo vi, gracias. Prueba también con tildes en el correo.",
      daysAgo: 1,
      hour: 17,
      minute: 5,
    },
    {
      sender: member,
      body: "Anotado. Mañana arranco con eso a primera hora.",
      daysAgo: 1,
      hour: 17,
      minute: 30,
    },
    {
      sender: admin,
      body: `Otra cosa: el menú en móvil está saltando en la demo. Lo dejé como urgente en #${menuMovil.number}.`,
      daysAgo: 0,
      hour: 8,
      minute: 45,
    },
    {
      sender: member,
      body: "Ya lo reproduje. Es al pulsar un enlace dentro del propio menú, lo tengo casi.",
      daysAgo: 0,
      hour: 11,
      minute: 20,
      reactions: [{ user: admin, emoji: "👀" }],
    },
  ];

  for (const m of dmMessages) {
    const created = await prisma.chatMessage.create({
      data: {
        conversationId: dm.id,
        senderId: m.sender.id,
        body: m.body,
        createdAt: at(m.daysAgo, m.hour, m.minute ?? 0),
      },
    });
    for (const r of m.reactions ?? []) {
      await prisma.chatMessageReaction.create({
        data: { messageId: created.id, userId: r.user.id, emoji: r.emoji },
      });
    }
  }

  // Canal de chat por proyecto (uno por proyecto, con todo el equipo dentro).
  const channelMessages: Record<
    string,
    {
      sender: { id: string; name: string | null };
      body: string;
      daysAgo: number;
      hour: number;
    }[]
  > = {
    [web.id]: [
      {
        sender: admin,
        body: "Equipo, esta semana cerramos landing y formulario. El blog pasa al siguiente sprint.",
        daysAgo: 3,
        hour: 9,
      },
      {
        sender: carla,
        body: "Textos definitivos subidos a la base alfa.",
        daysAgo: 2,
        hour: 11,
      },
      {
        sender: member,
        body: `${mention(admin)} el formulario queda listo hoy salvo sorpresa.`,
        daysAgo: 0,
        hour: 10,
      },
    ],
    [app.id]: [
      {
        sender: admin,
        body: "Recordatorio: en este proyecto el cronómetro sigue corriendo a la mitad mientras documentáis.",
        daysAgo: 5,
        hour: 8,
      },
      {
        sender: carla,
        body: "Ilustraciones del onboarding listas, exportadas en 2x y 3x.",
        daysAgo: 3,
        hour: 13,
      },
      {
        sender: diego,
        body: "Sigo con el cierre de sesión en Android; parece el refresco del token.",
        daysAgo: 1,
        hour: 14,
      },
    ],
  };

  for (const [projectId, messages] of Object.entries(channelMessages)) {
    const project = [web, app, ops].find((p) => p.id === projectId)!;
    const channel = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        type: ConversationType.GROUP,
        name: project.name,
        projectId: project.id,
        participants: {
          create: [admin, member, carla, diego].map((u) => ({ userId: u.id })),
        },
      },
    });
    for (const m of messages) {
      await prisma.chatMessage.create({
        data: {
          conversationId: channel.id,
          senderId: m.sender.id,
          body: m.body,
          createdAt: at(m.daysAgo, m.hour),
        },
      });
    }
  }

  // ── Notificaciones ────────────────────────────────────────────────────────

  const taskHref = (t: CreatedTask) => `/w/${workspace.id}/tasks/${t.number}`;

  await prisma.notification.createMany({
    data: [
      {
        userId: member.id,
        type: NotificationType.TASK_ASSIGNED,
        title: "Te asignaron una tarea",
        body: `#${menuMovil.number} ${menuMovil.title}`,
        href: taskHref(menuMovil),
        workspaceId: workspace.id,
        issueId: menuMovil.id,
        actorId: admin.id,
        createdAt: at(1, 8),
      },
      {
        userId: member.id,
        type: NotificationType.TASK_DUE_SOON,
        title: "Una tarea tuya vence pronto",
        body: `#${formulario.number} ${formulario.title}`,
        href: taskHref(formulario),
        workspaceId: workspace.id,
        issueId: formulario.id,
        createdAt: at(0, 7),
      },
      {
        userId: member.id,
        type: NotificationType.TASK_REVIEW_FEEDBACK,
        title: "Ana Ruiz comentó tus avances",
        body: `#${formulario.number} ${formulario.title}`,
        href: taskHref(formulario),
        workspaceId: workspace.id,
        issueId: formulario.id,
        actorId: admin.id,
        readAt: at(0, 12),
        createdAt: at(1, 17),
      },
      {
        userId: member.id,
        type: NotificationType.TASK_REOPENED,
        title: "Ana Ruiz devolvió una tarea a En curso",
        body: `#${landing.number} ${landing.title}`,
        href: taskHref(landing),
        workspaceId: workspace.id,
        issueId: landing.id,
        actorId: admin.id,
        readAt: at(6, 10),
        createdAt: at(8, 16),
      },
      {
        userId: admin.id,
        type: NotificationType.MENTIONED,
        title: "Beto Salas te mencionó",
        body: "Sitio web corporativo · el formulario queda listo hoy",
        href: `/w/${workspace.id}/chat/project/${web.id}`,
        workspaceId: workspace.id,
        actorId: member.id,
        createdAt: at(0, 10),
      },
      {
        userId: diego.id,
        type: NotificationType.MENTIONED,
        title: "Beto Salas te mencionó en una tarea",
        body: `#${onboarding.number} ${onboarding.title}`,
        href: taskHref(onboarding),
        workspaceId: workspace.id,
        issueId: onboarding.id,
        actorId: member.id,
        createdAt: at(1, 16),
      },
    ],
  });

  // ── Resumen ───────────────────────────────────────────────────────────────

  const [taskCount, entryCount, sessionCount, messageCount] = await Promise.all(
    [
      prisma.issue.count({ where: { workspaceId: workspace.id } }),
      prisma.timeEntry.count({
        where: { project: { workspaceId: workspace.id } },
      }),
      prisma.workSession.count({ where: { workspaceId: workspace.id } }),
      prisma.chatMessage.count({
        where: { conversation: { workspaceId: workspace.id } },
      }),
    ],
  );

  console.log(`Listo. Espacio "${workspace.name}" (/${workspace.slug}):`);
  console.log(
    `  ${taskCount} tareas · ${entryCount} registros de horas · ${sessionCount} sesiones de cronómetro · ${messageCount} mensajes de chat`,
  );
  console.log(`  Manager     -> ${GUEST_ADMIN_EMAIL} / ${GUEST_PASSWORD}`);
  console.log(`  Trabajador  -> ${GUEST_MEMBER_EMAIL} / ${GUEST_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
