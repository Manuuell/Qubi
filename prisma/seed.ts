import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  IssueStatus,
  Priority,
  WorkspaceRole,
} from "../src/generated/prisma/enums";
import {
  GUEST_ADMIN_EMAIL,
  GUEST_MEMBER_EMAIL,
  GUEST_PASSWORD,
} from "../src/lib/guest-accounts";

// Crea (o refresca) un workspace de demostración con dos cuentas de invitado
// y datos de ejemplo, para que cualquiera pueda ver la app sin pedir acceso.
// Uso: npm run db:seed

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta la variable DATABASE_URL");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const WORKSPACE_SLUG = "qubi-demo";

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Sembrando datos de demo…");
  const hashedPassword = await bcrypt.hash(GUEST_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: GUEST_ADMIN_EMAIL },
    update: { hashedPassword, emailVerified: new Date() },
    create: {
      email: GUEST_ADMIN_EMAIL,
      name: "Invitado Admin",
      hashedPassword,
      emailVerified: new Date(),
    },
  });

  const member = await prisma.user.upsert({
    where: { email: GUEST_MEMBER_EMAIL },
    update: { hashedPassword, emailVerified: new Date() },
    create: {
      email: GUEST_MEMBER_EMAIL,
      name: "Invitado Miembro",
      hashedPassword,
      emailVerified: new Date(),
    },
  });

  // Borra el workspace demo anterior (si existe) para partir de datos
  // limpios cada vez que se corre el seed; las cascadas del schema se
  // encargan de limpiar proyectos, páginas, tareas, horas, etc.
  const existing = await prisma.workspace.findUnique({
    where: { slug: WORKSPACE_SLUG },
  });
  if (existing) await prisma.workspace.delete({ where: { id: existing.id } });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Qubi Demo",
      slug: WORKSPACE_SLUG,
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: WorkspaceRole.OWNER },
          { userId: member.id, role: WorkspaceRole.MEMBER },
        ],
      },
    },
  });

  const [siteProject, appProject] = await Promise.all([
    prisma.project.create({
      data: { workspaceId: workspace.id, name: "Sitio web", color: "#6d28d9" },
    }),
    prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: "App móvil",
        color: "#a87b1f",
      },
    }),
  ]);

  // ── Tareas ─────────────────────────────────────────────────────────────
  const taskDefs: {
    project: { id: string };
    title: string;
    status: IssueStatus;
    priority: Priority;
    assigneeId: string;
    dueDateOffset?: number;
    startDateOffset?: number;
  }[] = [
    {
      project: siteProject,
      title: "Rediseñar la landing page",
      status: IssueStatus.DONE,
      priority: Priority.HIGH,
      assigneeId: member.id,
      dueDateOffset: -3,
    },
    {
      project: siteProject,
      title: "Optimizar imágenes del hero",
      status: IssueStatus.DONE,
      priority: Priority.MEDIUM,
      assigneeId: member.id,
      dueDateOffset: -5,
    },
    {
      project: siteProject,
      title: "Formulario de contacto",
      status: IssueStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assigneeId: member.id,
      dueDateOffset: 1,
      startDateOffset: -2,
    },
    {
      project: siteProject,
      title: "Revisar SEO técnico",
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assigneeId: admin.id,
      dueDateOffset: 4,
    },
    {
      project: siteProject,
      title: "Migrar a HTTPS estricto",
      status: IssueStatus.TODO,
      priority: Priority.LOW,
      assigneeId: admin.id,
      dueDateOffset: 9,
    },
    {
      project: siteProject,
      title: "Pulir animaciones de scroll",
      status: IssueStatus.TODO,
      priority: Priority.LOW,
      assigneeId: member.id,
      dueDateOffset: -1,
    },
    {
      project: appProject,
      title: "Configurar notificaciones push",
      status: IssueStatus.DONE,
      priority: Priority.HIGH,
      assigneeId: member.id,
      dueDateOffset: -7,
    },
    {
      project: appProject,
      title: "Pantalla de onboarding",
      status: IssueStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assigneeId: member.id,
      dueDateOffset: 2,
      startDateOffset: -3,
    },
    {
      project: appProject,
      title: "Integrar pagos",
      status: IssueStatus.TODO,
      priority: Priority.HIGH,
      assigneeId: admin.id,
      dueDateOffset: 6,
    },
    {
      project: appProject,
      title: "Modo offline",
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assigneeId: member.id,
      dueDateOffset: 12,
    },
    {
      project: appProject,
      title: "Publicar en la store",
      status: IssueStatus.TODO,
      priority: Priority.MEDIUM,
      assigneeId: admin.id,
      dueDateOffset: 20,
    },
    {
      project: appProject,
      title: "Pruebas de rendimiento",
      status: IssueStatus.TODO,
      priority: Priority.LOW,
      assigneeId: member.id,
      dueDateOffset: 15,
    },
  ];

  let number = 1;
  const createdTasks: { id: string; number: number; title: string }[] = [];
  for (const t of taskDefs) {
    const issue = await prisma.issue.create({
      data: {
        workspaceId: workspace.id,
        projectId: t.project.id,
        number: number++,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        authorId: admin.id,
        dueDate: t.dueDateOffset != null ? daysFromNow(t.dueDateOffset) : null,
        startDate:
          t.startDateOffset != null ? daysFromNow(t.startDateOffset) : null,
        completedAt: t.status === IssueStatus.DONE ? daysFromNow(-1) : null,
      },
    });
    createdTasks.push(issue);
  }

  // Evidencia en un par de tareas ya completadas.
  const doneTasks = createdTasks.filter(
    (_, i) => taskDefs[i].status === IssueStatus.DONE,
  );
  for (const t of doneTasks.slice(0, 2)) {
    await prisma.issueComment.create({
      data: {
        issueId: t.id,
        authorId: member.id,
        body: "Listo, quedó revisado y probado en móvil y escritorio.",
      },
    });
  }

  // ── Horas de las últimas 2 semanas (ambos proyectos, ambos usuarios) ────
  const users = [admin.id, member.id];
  for (let dayOffset = -13; dayOffset <= 0; dayOffset++) {
    const date = daysFromNow(dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // sin fines de semana
    for (const userId of users) {
      const minutes = 60 * (3 + Math.floor(Math.random() * 4)); // 3–6 h
      const project = Math.random() > 0.5 ? siteProject : appProject;
      await prisma.timeEntry.create({
        data: { projectId: project.id, userId, date, minutes },
      });
    }
  }

  // ── Un par de sesiones de cronómetro con avances (pestaña "Avances") ────
  for (const [userId, project] of [
    [member.id, siteProject],
    [admin.id, appProject],
  ] as const) {
    const startedAt = new Date();
    startedAt.setHours(startedAt.getHours() - 2);
    const endedAt = new Date();
    endedAt.setHours(endedAt.getHours() - 1);
    const session = await prisma.workSession.create({
      data: {
        userId,
        projectId: project.id,
        workspaceId: workspace.id,
        startedAt,
        endedAt,
        minutes: 60,
      },
    });
    await prisma.workSessionNote.create({
      data: {
        sessionId: session.id,
        body: "Avancé con las tareas pendientes del sprint de esta semana.",
      },
    });
  }

  console.log("Listo. Workspace:", workspace.slug);
  console.log(`Admin  -> ${GUEST_ADMIN_EMAIL} / ${GUEST_PASSWORD}`);
  console.log(`Miembro -> ${GUEST_MEMBER_EMAIL} / ${GUEST_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
