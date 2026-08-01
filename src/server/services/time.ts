import { prisma } from "@/lib/db";
import {
  IssueCommentKind,
  IssueStatus,
  Priority,
  ProgressTimerPolicy,
  ProjectStatus,
} from "@/generated/prisma/enums";
import {
  billableMinutes,
  creditedProgressMinutes,
  effectiveProgressPolicy,
} from "@/features/time/timer-rules";
import { addTaskComment, startTask } from "@/server/services/task";
import {
  addDaysToKey,
  dateToLocalKey,
  dbDateToKey,
  keyToDbDate,
  keyToLocalDate,
  mondayKeyOf,
  monthRangeKeys,
} from "@/features/time/week";
import {
  assertWorkspaceAdmin,
  assertWorkspaceMember,
  getWorkspaceRole,
  isTrustedTimeEditor,
} from "@/server/lib/permissions";

export { getWorkspaceRole };

export type TimesheetRow = {
  projectId: string;
  name: string;
  color: string | null;
  minutes: number[]; // 7 días (lun..dom)
  total: number;
};

export type Timesheet = {
  weekStartKey: string;
  dayKeys: string[]; // 7
  rows: TimesheetRow[];
  dayTotals: number[]; // 7
  grandTotal: number;
};

// Hoja semanal de horas del usuario (filas = proyectos activos, columnas = días).
export async function getWeekTimesheet(
  workspaceId: string,
  userId: string,
  anchorKey?: string,
): Promise<Timesheet> {
  await assertWorkspaceMember(workspaceId, userId);

  const weekStartKey = mondayKeyOf(
    anchorKey ? keyToLocalDate(anchorKey) : new Date(),
  );
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToKey(weekStartKey, i),
  );

  const projects = await prisma.project.findMany({
    where: { workspaceId, status: ProjectStatus.ACTIVE },
    select: { id: true, name: true, color: true },
    orderBy: { createdAt: "asc" },
  });

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      project: { workspaceId },
      date: {
        gte: keyToDbDate(weekStartKey),
        lt: keyToDbDate(addDaysToKey(weekStartKey, 7)),
      },
    },
    select: { projectId: true, date: true, minutes: true },
  });

  // Suma de minutos por `${projectId}|${dateKey}`.
  const map = new Map<string, number>();
  for (const e of entries) {
    const k = `${e.projectId}|${dbDateToKey(new Date(e.date))}`;
    map.set(k, (map.get(k) ?? 0) + e.minutes);
  }

  const dayTotals = new Array(7).fill(0) as number[];
  const rows: TimesheetRow[] = projects.map((p) => {
    const minutes = dayKeys.map((dk, i) => {
      const m = map.get(`${p.id}|${dk}`) ?? 0;
      dayTotals[i] += m;
      return m;
    });
    return {
      projectId: p.id,
      name: p.name,
      color: p.color,
      minutes,
      total: minutes.reduce((a, b) => a + b, 0),
    };
  });

  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  return { weekStartKey, dayKeys, rows, dayTotals, grandTotal };
}

// Fija las horas (en minutos) de un proyecto+día para el usuario.
// Un único registro por (proyecto, usuario, día); minutos<=0 lo elimina.
// Edición MANUAL: solo los correos de confianza pueden hacerlo (ver
// TRUSTED_TIME_EDITOR_EMAILS). El resto solo acumula horas con el cronómetro
// (ver addTimeEntryMinutes/stopTimer, que no pasan por esta función).
export async function setTimesheetHours(
  workspaceId: string,
  userId: string,
  userEmail: string | null | undefined,
  projectId: string,
  date: Date,
  minutes: number,
) {
  await assertWorkspaceMember(workspaceId, userId);
  if (!isTrustedTimeEditor(userEmail)) {
    throw new Error(
      "Solo un administrador de confianza puede editar horas manualmente",
    );
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no encontrado");

  const existing = await prisma.timeEntry.findMany({
    where: { projectId, userId, date },
    select: { id: true },
  });

  if (minutes <= 0) {
    if (existing.length) {
      await prisma.timeEntry.deleteMany({ where: { projectId, userId, date } });
    }
    return;
  }

  if (existing.length === 0) {
    await prisma.timeEntry.create({
      data: { projectId, userId, date, minutes },
    });
    return;
  }

  await prisma.timeEntry.update({
    where: { id: existing[0].id },
    data: { minutes },
  });
  if (existing.length > 1) {
    await prisma.timeEntry.deleteMany({
      where: { id: { in: existing.slice(1).map((e) => e.id) } },
    });
  }
}

// ── Vista de equipo (solo OWNER/ADMIN) ──────────────────────────────────────

export type TeamMemberWeek = {
  userId: string;
  name: string | null;
  email: string;
  minutes: number[]; // 7 días
  total: number;
};

export type TeamWeek = {
  weekStartKey: string;
  dayKeys: string[];
  members: TeamMemberWeek[];
  dayTotals: number[];
  grandTotal: number;
  projectTotals: {
    projectId: string;
    name: string;
    color: string | null;
    total: number;
  }[];
};

// Horas de toda la gente del espacio en una semana: filas = miembros,
// columnas = días, más un desglose por proyecto.
export async function getTeamWeek(
  workspaceId: string,
  userId: string,
  anchorKey?: string,
): Promise<TeamWeek> {
  await assertWorkspaceAdmin(workspaceId, userId);

  const weekStartKey = mondayKeyOf(
    anchorKey ? keyToLocalDate(anchorKey) : new Date(),
  );
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToKey(weekStartKey, i),
  );

  const [members, entries] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        project: { workspaceId },
        date: {
          gte: keyToDbDate(weekStartKey),
          lt: keyToDbDate(addDaysToKey(weekStartKey, 7)),
        },
      },
      select: {
        userId: true,
        projectId: true,
        date: true,
        minutes: true,
        project: { select: { name: true, color: true } },
      },
    }),
  ]);

  const userDay = new Map<string, number>(); // `${userId}|${dayKey}` -> min
  const projTotals = new Map<
    string,
    { name: string; color: string | null; total: number }
  >();
  for (const e of entries) {
    const dk = dbDateToKey(new Date(e.date));
    const uk = `${e.userId}|${dk}`;
    userDay.set(uk, (userDay.get(uk) ?? 0) + e.minutes);
    const pt = projTotals.get(e.projectId) ?? {
      name: e.project.name,
      color: e.project.color,
      total: 0,
    };
    pt.total += e.minutes;
    projTotals.set(e.projectId, pt);
  }

  const dayTotals = new Array(7).fill(0) as number[];
  const memberRows: TeamMemberWeek[] = members.map((m) => {
    const minutes = dayKeys.map((dk, i) => {
      const v = userDay.get(`${m.user.id}|${dk}`) ?? 0;
      dayTotals[i] += v;
      return v;
    });
    return {
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      minutes,
      total: minutes.reduce((a, b) => a + b, 0),
    };
  });

  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  const projectTotals = [...projTotals.entries()]
    .map(([projectId, v]) => ({ projectId, ...v }))
    .sort((a, b) => b.total - a.total);

  return {
    weekStartKey,
    dayKeys,
    members: memberRows,
    dayTotals,
    grandTotal,
    projectTotals,
  };
}

// ── Resumen mensual (solo OWNER/ADMIN) ──────────────────────────────────────

export type MonthlySummary = {
  monthKey: string;
  projects: { id: string; name: string; color: string | null; total: number }[];
  members: { id: string; name: string | null; email: string; total: number }[];
  matrix: Record<string, number>; // `${projectId}|${userId}` -> minutos
  grandTotal: number;
};

// Matriz proyecto × miembro de un mes (solo filas/columnas con horas).
export async function getMonthlySummary(
  workspaceId: string,
  userId: string,
  monthKey: string,
): Promise<MonthlySummary> {
  await assertWorkspaceAdmin(workspaceId, userId);
  const { startKey, endKey } = monthRangeKeys(monthKey);

  const [projects, members, entries] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        project: { workspaceId },
        date: { gte: keyToDbDate(startKey), lt: keyToDbDate(endKey) },
      },
      select: { projectId: true, userId: true, minutes: true },
    }),
  ]);

  const matrix: Record<string, number> = {};
  const projTotal = new Map<string, number>();
  const memberTotal = new Map<string, number>();
  for (const e of entries) {
    const k = `${e.projectId}|${e.userId}`;
    matrix[k] = (matrix[k] ?? 0) + e.minutes;
    projTotal.set(e.projectId, (projTotal.get(e.projectId) ?? 0) + e.minutes);
    memberTotal.set(e.userId, (memberTotal.get(e.userId) ?? 0) + e.minutes);
  }

  const projectRows = projects
    .filter((p) => (projTotal.get(p.id) ?? 0) > 0)
    .map((p) => ({ ...p, total: projTotal.get(p.id)! }));
  const memberCols = members
    .filter((m) => (memberTotal.get(m.user.id) ?? 0) > 0)
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      total: memberTotal.get(m.user.id)!,
    }));
  const grandTotal = entries.reduce((a, e) => a + e.minutes, 0);

  return {
    monthKey,
    projects: projectRows,
    members: memberCols,
    matrix,
    grandTotal,
  };
}

// Entradas detalladas del mes para exportar a CSV (una fila por registro).
export async function getMonthEntriesForExport(
  workspaceId: string,
  userId: string,
  monthKey: string,
) {
  await assertWorkspaceAdmin(workspaceId, userId);
  const { startKey, endKey } = monthRangeKeys(monthKey);

  const entries = await prisma.timeEntry.findMany({
    where: {
      project: { workspaceId },
      date: { gte: keyToDbDate(startKey), lt: keyToDbDate(endKey) },
    },
    select: {
      date: true,
      minutes: true,
      note: true,
      user: { select: { name: true, email: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { project: { name: "asc" } }],
  });

  return entries.map((e) => ({
    dateKey: dbDateToKey(new Date(e.date)),
    memberName: e.user.name ?? "",
    memberEmail: e.user.email,
    projectName: e.project.name,
    minutes: e.minutes,
    note: e.note,
  }));
}

// ── Temporizador (cronómetro) ───────────────────────────────────────────────

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
  const elapsed = Math.round((Date.now() - timer.startedAt.getTime()) / 60000);
  await prisma.runningTimer.update({
    where: { userId },
    data: {
      accumulatedMinutes: timer.accumulatedMinutes + Math.max(0, elapsed),
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

  const runningMinutes = timer.pausedAt
    ? 0
    : Math.max(0, Math.round((Date.now() - timer.startedAt.getTime()) / 60000));
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
  const elapsed = Math.round(
    (Date.now() - timer.progressStartedAt.getTime()) / 60000,
  );
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
      Math.round((Date.now() - timer.progressStartedAt.getTime()) / 60000),
      policy,
    );
  }

  const runningMinutes =
    timer.pausedAt || timer.progressStartedAt
      ? 0
      : Math.max(
          0,
          Math.round((Date.now() - timer.startedAt.getTime()) / 60000),
        );
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

// ── Avances (historial de sesiones + notas, agrupado por día) ──────────────

export type WorkSessionSummary = {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  issueNumber: number | null;
  issueTitle: string | null;
  startedAt: Date;
  endedAt: Date | null;
  minutes: number;
  discarded: boolean; // sesión corta: no se imputó a las horas
  notes: {
    id: string;
    body: string;
    screenshotUrl: string | null;
    createdAt: Date;
  }[];
};

export type DayProgress = {
  dateKey: string;
  minutes: number;
  sessions: WorkSessionSummary[];
};

// Sesiones de cronómetro de una semana, agrupadas por día. targetUserId
// permite a un admin ver el avance de otro miembro (accessUserId es quien
// mira la pantalla).
export async function getWorkProgress(
  workspaceId: string,
  accessUserId: string,
  targetUserId: string,
  anchorKey?: string,
): Promise<{ weekStartKey: string; dayKeys: string[]; days: DayProgress[] }> {
  if (targetUserId === accessUserId) {
    await assertWorkspaceMember(workspaceId, accessUserId);
  } else {
    await assertWorkspaceAdmin(workspaceId, accessUserId);
  }

  const weekStartKey = mondayKeyOf(
    anchorKey ? keyToLocalDate(anchorKey) : new Date(),
  );
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToKey(weekStartKey, i),
  );
  const weekStart = keyToLocalDate(weekStartKey);
  const weekEnd = keyToLocalDate(addDaysToKey(weekStartKey, 7));

  const sessions = await prisma.workSession.findMany({
    where: {
      workspaceId,
      userId: targetUserId,
      startedAt: { gte: weekStart, lt: weekEnd },
    },
    include: {
      project: { select: { name: true, color: true } },
      issue: { select: { number: true, title: true } },
      notes: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { startedAt: "desc" },
  });

  const byDay = new Map<string, DayProgress>(
    dayKeys.map((dk) => [dk, { dateKey: dk, minutes: 0, sessions: [] }]),
  );
  for (const s of sessions) {
    const dk = dateToLocalKey(s.startedAt);
    const bucket = byDay.get(dk);
    if (!bucket) continue;
    // Las sesiones descartadas (demasiado cortas) no suman al total del día,
    // pero se listan igual para que se vea que existieron.
    if (!s.discarded) bucket.minutes += s.minutes;
    bucket.sessions.push({
      id: s.id,
      projectId: s.projectId,
      projectName: s.project.name,
      projectColor: s.project.color,
      issueNumber: s.issue?.number ?? null,
      issueTitle: s.issue?.title ?? null,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      minutes: s.minutes,
      discarded: s.discarded,
      notes: s.notes,
    });
  }

  return { weekStartKey, dayKeys, days: [...byDay.values()].reverse() };
}
