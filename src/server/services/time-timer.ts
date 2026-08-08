import { prisma } from "@/lib/db";
import {
  IssueCommentKind,
  IssueStatus,
  Priority,
  ProgressTimerPolicy,
} from "@/generated/prisma/enums";
import {
  billableMinutes,
  creditedProgressMinutes,
  effectiveProgressPolicy,
} from "@/features/time/timer-rules";
import { addTaskComment, startTask } from "@/server/services/task";
import { dateToLocalKey, keyToDbDate } from "@/features/time/week";
import { assertWorkspaceMember } from "@/server/lib/permissions";

// ── Temporizador (cronómetro) ───────────────────────────────────────────────

// Minutos enteros transcurridos desde `date` hasta ahora (nunca negativo).
function minutesSince(date: Date) {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

// SUMA minutos a las horas de un proyecto+día (a diferencia de setTimesheetHours
// que las fija). Lo usa el temporizador al detenerse. Los minutos quedan
// imputados a la tarea concreta que se cronometró, que es lo que alimenta las
// "horas invertidas" del detalle de tarea.
async function addTimeEntryMinutes(
  projectId: string,
  userId: string,
  date: Date,
  minutesToAdd: number,
  issueId: string | null,
) {
  if (minutesToAdd <= 0) return;
  const existing = await prisma.timeEntry.findFirst({
    where: { projectId, userId, date, issueId },
    select: { id: true, minutes: true },
  });
  if (existing) {
    await prisma.timeEntry.update({
      where: { id: existing.id },
      data: { minutes: existing.minutes + minutesToAdd },
    });
  } else {
    await prisma.timeEntry.create({
      data: { projectId, userId, date, minutes: minutesToAdd, issueId },
    });
  }
}

export type RunningTimerInfo = {
  sessionId: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  issueId: string;
  issueNumber: number;
  issueTitle: string;
  progressPolicy: ProgressTimerPolicy; // qué hace el reloj al documentar
  progressStartedAt: Date | null; // documentando desde (null = trabajando)
  startedAt: Date; // desde cuándo corre el tramo actual (cambia al reanudar)
  accumulatedMinutes: number; // ya acumulado antes del tramo actual
  pausedAt: Date | null;
};

// Un temporizador que lleva corriendo sin cerrarse más de este umbral se
// considera huérfano (típicamente: se cerró el navegador sin pulsar
// "detener"). getRunningTimer lo cierra solo la próxima vez que se consulta
// —cualquier carga de página o poll del widget dispara la limpieza, sin
// necesitar un cron aparte— y limita lo imputado a ese máximo para no
// facturar días enteros de reloj por un olvido.
const ORPHAN_TIMER_HOURS = 12;
const ORPHAN_TIMER_MINUTES = ORPHAN_TIMER_HOURS * 60;

async function reconcileIfOrphaned(timer: {
  userId: string;
  sessionId: string;
  projectId: string;
  issueId: string;
  startedAt: Date;
  accumulatedMinutes: number;
  pausedAt: Date | null;
  progressStartedAt: Date | null;
  sessionStartedAt: Date;
}): Promise<boolean> {
  if (minutesSince(timer.sessionStartedAt) < ORPHAN_TIMER_MINUTES) return false;

  let progressCredit = 0;
  if (timer.progressStartedAt) {
    const policy = await policyOfRunningTimer(timer);
    progressCredit = creditedProgressMinutes(
      minutesSince(timer.progressStartedAt),
      policy,
    );
  }
  const runningMinutes =
    timer.pausedAt || timer.progressStartedAt
      ? 0
      : minutesSince(timer.startedAt);
  const totalMinutes = Math.min(
    timer.accumulatedMinutes + runningMinutes + progressCredit,
    ORPHAN_TIMER_MINUTES,
  );
  const counted = billableMinutes(totalMinutes);
  const date = keyToDbDate(dateToLocalKey(timer.sessionStartedAt));

  await addTimeEntryMinutes(
    timer.projectId,
    timer.userId,
    date,
    counted,
    timer.issueId,
  );
  await prisma.workSession.update({
    where: { id: timer.sessionId },
    data: {
      endedAt: new Date(),
      minutes: totalMinutes,
      discarded: counted === 0,
    },
  });
  await prisma.runningTimer.delete({ where: { userId: timer.userId } });
  return true;
}

// Temporizador activo del usuario (global, uno por persona). Incluye el espacio
// del proyecto para que la UI sepa si pertenece al espacio que se está viendo,
// y la tarea a la que está ligado (siempre hay una).
export async function getRunningTimer(
  userId: string,
): Promise<RunningTimerInfo | null> {
  const timer = await prisma.runningTimer.findUnique({
    where: { userId },
    select: {
      sessionId: true,
      startedAt: true,
      accumulatedMinutes: true,
      pausedAt: true,
      progressStartedAt: true,
      session: { select: { startedAt: true } },
      project: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
          progressTimerPolicy: true,
        },
      },
      issue: {
        select: {
          id: true,
          number: true,
          title: true,
          progressTimerPolicy: true,
        },
      },
    },
  });
  if (!timer) return null;

  const orphaned = await reconcileIfOrphaned({
    userId,
    sessionId: timer.sessionId,
    projectId: timer.project.id,
    issueId: timer.issue.id,
    startedAt: timer.startedAt,
    accumulatedMinutes: timer.accumulatedMinutes,
    pausedAt: timer.pausedAt,
    progressStartedAt: timer.progressStartedAt,
    sessionStartedAt: timer.session.startedAt,
  });
  if (orphaned) return null;

  return {
    sessionId: timer.sessionId,
    projectId: timer.project.id,
    projectName: timer.project.name,
    workspaceId: timer.project.workspaceId,
    issueId: timer.issue.id,
    issueNumber: timer.issue.number,
    issueTitle: timer.issue.title,
    progressPolicy: effectiveProgressPolicy(
      timer.project.progressTimerPolicy,
      timer.issue.progressTimerPolicy,
    ),
    progressStartedAt: timer.progressStartedAt,
    startedAt: timer.startedAt,
    accumulatedMinutes: timer.accumulatedMinutes,
    pausedAt: timer.pausedAt,
  };
}

export type TimeableTask = {
  id: string;
  number: number;
  title: string;
  status: IssueStatus;
  priority: Priority;
  dueDate: Date | null;
};

// Tareas que se pueden cronometrar en un proyecto: pendientes o ya en marcha
// (las terminadas no). Se ordenan poniendo primero las que ya están en curso.
export async function listTimeableTasks(
  workspaceId: string,
  userId: string,
  projectId: string,
): Promise<TimeableTask[]> {
  await assertWorkspaceMember(workspaceId, userId);
  const tasks = await prisma.issue.findMany({
    where: {
      workspaceId,
      projectId,
      status: { in: [IssueStatus.IN_PROGRESS, IssueStatus.TODO] },
    },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { number: "asc" }],
  });
  // IssueStatus.TODO ordena antes que IN_PROGRESS alfabéticamente, así que se
  // reordena aquí para que lo que ya está en marcha quede arriba.
  return [
    ...tasks.filter((t) => t.status === IssueStatus.IN_PROGRESS),
    ...tasks.filter((t) => t.status !== IssueStatus.IN_PROGRESS),
  ];
}

// Inicia un temporizador sobre una TAREA concreta de un proyecto (siempre hay
// que decir en qué se va a trabajar). Falla si ya hay uno activo. Crea además
// una WorkSession: es el registro histórico de la sesión.
// Si la tarea estaba "Por hacer" pasa a "En curso", igual que si se hubiera
// pulsado "Empezar a hacer" (queda su evento en el historial de estados).
export async function startTimer(
  workspaceId: string,
  userId: string,
  projectId: string,
  issueId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no encontrado");

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId, workspaceId },
    select: { id: true, status: true },
  });
  if (!issue) {
    throw new Error("Elige una tarea de este proyecto para cronometrar");
  }
  if (issue.status === IssueStatus.DONE) {
    throw new Error(
      "Esa tarea ya está terminada: elige una pendiente o en marcha",
    );
  }

  const existing = await prisma.runningTimer.findUnique({ where: { userId } });
  if (existing) throw new Error("Ya tienes un temporizador en marcha");

  if (issue.status === IssueStatus.TODO) {
    await startTask(issue.id, userId);
  }

  const session = await prisma.workSession.create({
    data: { userId, projectId, workspaceId, issueId: issue.id },
  });
  await prisma.runningTimer.create({
    data: { userId, projectId, issueId: issue.id, sessionId: session.id },
  });
  return session.id;
}

// Pausa: congela lo corrido del tramo actual en accumulatedMinutes.
export async function pauseTimer(userId: string) {
  const timer = await prisma.runningTimer.findUnique({ where: { userId } });
  if (!timer || timer.pausedAt) return;
  await prisma.runningTimer.update({
    where: { userId },
    data: {
      accumulatedMinutes:
        timer.accumulatedMinutes + minutesSince(timer.startedAt),
      pausedAt: new Date(),
    },
  });
}

// Reanuda: arranca un nuevo tramo desde ahora, conservando lo acumulado.
export async function resumeTimer(userId: string) {
  const timer = await prisma.runningTimer.findUnique({ where: { userId } });
  if (!timer || !timer.pausedAt) return;
  await prisma.runningTimer.update({
    where: { userId },
    data: { startedAt: new Date(), pausedAt: null },
  });
}

// ── Documentar un avance sin perder (o perdiendo a medias) el tiempo ────────

// Política efectiva del cronómetro en marcha (la de la tarea manda sobre la
// del proyecto).
async function policyOfRunningTimer(timer: {
  projectId: string;
  issueId: string;
}) {
  const [project, issue] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: timer.projectId },
      select: { progressTimerPolicy: true },
    }),
    prisma.issue.findUniqueOrThrow({
      where: { id: timer.issueId },
      select: { progressTimerPolicy: true },
    }),
  ]);
  return effectiveProgressPolicy(
    project.progressTimerPolicy,
    issue.progressTimerPolicy,
  );
}

// La persona empieza a escribir su avance: se congela lo corrido hasta ahora y
// se marca el inicio del modo "documentando". Con PAUSE ese rato no cuenta;
// con HALF contará la mitad al terminar.
export async function beginTimerProgress(userId: string) {
  const timer = await prisma.runningTimer.findUnique({ where: { userId } });
  if (!timer || timer.progressStartedAt) return;

  const runningMinutes = timer.pausedAt ? 0 : minutesSince(timer.startedAt);
  await prisma.runningTimer.update({
    where: { userId },
    data: {
      accumulatedMinutes: timer.accumulatedMinutes + runningMinutes,
      progressStartedAt: new Date(),
      pausedAt: timer.pausedAt ?? new Date(),
    },
  });
  return policyOfRunningTimer(timer);
}

// Termina de documentar: acredita lo que corresponda según la política y
// vuelve a poner el reloj en marcha (salvo que estuviera pausado a mano).
export async function endTimerProgress(userId: string, wasPaused = false) {
  const timer = await prisma.runningTimer.findUnique({ where: { userId } });
  if (!timer || !timer.progressStartedAt) return;

  const policy = await policyOfRunningTimer(timer);
  const elapsed = minutesSince(timer.progressStartedAt);
  const credited = creditedProgressMinutes(elapsed, policy);

  await prisma.runningTimer.update({
    where: { userId },
    data: {
      accumulatedMinutes: timer.accumulatedMinutes + credited,
      progressStartedAt: null,
      startedAt: new Date(),
      pausedAt: wasPaused ? new Date() : null,
    },
  });
  return { policy, credited };
}

// Detiene el temporizador, suma el tiempo total (acumulado + tramo en curso)
// a las horas del día en que empezó la sesión, y cierra la WorkSession.
// Las sesiones por debajo de MIN_BILLABLE_MINUTES no se imputan a las horas:
// se guardan marcadas como descartadas (los avances documentados sí quedan).
export async function stopTimer(userId: string) {
  const timer = await prisma.runningTimer.findUnique({
    where: { userId },
    include: { session: { select: { startedAt: true } } },
  });
  if (!timer) return null;

  // Si estaba documentando un avance, primero se cierra ese tramo.
  let progressCredit = 0;
  if (timer.progressStartedAt) {
    const policy = await policyOfRunningTimer(timer);
    progressCredit = creditedProgressMinutes(
      minutesSince(timer.progressStartedAt),
      policy,
    );
  }

  const runningMinutes =
    timer.pausedAt || timer.progressStartedAt
      ? 0
      : minutesSince(timer.startedAt);
  const totalMinutes =
    timer.accumulatedMinutes + runningMinutes + progressCredit;
  const counted = billableMinutes(totalMinutes);
  const date = keyToDbDate(dateToLocalKey(timer.session.startedAt));

  await addTimeEntryMinutes(
    timer.projectId,
    userId,
    date,
    counted,
    timer.issueId,
  );
  await prisma.workSession.update({
    where: { id: timer.sessionId },
    data: {
      endedAt: new Date(),
      minutes: totalMinutes,
      discarded: counted === 0,
    },
  });
  await prisma.runningTimer.delete({ where: { userId } });
  return {
    sessionId: timer.sessionId,
    minutes: totalMinutes,
    countedMinutes: counted,
    discarded: counted === 0,
  };
}

// Cancela el temporizador sin registrar el tiempo: borra la WorkSession
// entera (arrastra al RunningTimer y a cualquier nota por la cascada del FK).
export async function cancelTimer(userId: string) {
  const timer = await prisma.runningTimer.findUnique({ where: { userId } });
  if (!timer) return;
  await prisma.workSession.delete({ where: { id: timer.sessionId } });
}

export type ProgressUpload = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

// Avance documentado durante una sesión de cronómetro. La evidencia es de la
// TAREA: se guarda como comentario de tipo PROGRESS con sus archivos adjuntos
// (eso es lo que ve el manager y lo que habilita marcar la tarea como Hecha) y
// se deja una nota enlazada en la sesión para la pestaña "Avances".
export async function addSessionProgress(
  sessionId: string,
  userId: string,
  body: string,
  files: ProgressUpload[] = [],
) {
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, issueId: true },
  });
  if (!session || session.userId !== userId) {
    throw new Error("Sesión no encontrada");
  }
  const trimmed = body.trim();
  if (!trimmed && files.length === 0) {
    throw new Error("Escribe tu avance o adjunta un archivo");
  }

  // La primera imagen se muestra en línea dentro del avance; el resto de
  // archivos quedan como adjuntos de la tarea.
  const firstImage = files.find((f) => f.mimeType.startsWith("image/")) ?? null;

  let comment: { id: string } | null = null;
  if (session.issueId) {
    comment = await addTaskComment(
      session.issueId,
      userId,
      trimmed,
      firstImage?.url ?? null,
      IssueCommentKind.PROGRESS,
    );
    if (files.length > 0) {
      await prisma.issueAttachment.createMany({
        data: files.map((f) => ({
          issueId: session.issueId!,
          commentId: comment!.id,
          url: f.url,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          uploadedById: userId,
        })),
      });
    }
  }

  return prisma.workSessionNote.create({
    data: {
      sessionId,
      body: trimmed,
      screenshotUrl: firstImage?.url ?? null,
      issueCommentId: comment?.id ?? null,
    },
  });
}
