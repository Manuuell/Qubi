import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, FolderOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTaskDetail } from "@/server/services/task";
import { getWorkspaceMembers } from "@/server/services/member";
import { listLabels } from "@/server/services/label";
import { listProjectDatabases } from "@/server/services/project-database";
import { getWorkspaceRole, isAdminRole } from "@/server/lib/permissions";
import {
  IssueCommentKind,
  IssueStatus,
  WorkspaceRole,
} from "@/generated/prisma/enums";
import { RoleBadge } from "@/features/workspace/components/role-badge";
import { UserPreview } from "@/features/workspace/components/user-preview";
import { TaskTitle } from "@/features/task/components/task-title";
import { TaskDescription } from "@/features/task/components/task-description";
import { TaskNoteForm } from "@/features/task/components/task-note-form";
import { TaskStatusSelect } from "@/features/task/components/task-status-select";
import { TaskTypeSelect } from "@/features/task/components/task-type-select";
import { TaskAssigneeSelect } from "@/features/task/components/task-assignee-select";
import { TaskLabelsEditor } from "@/features/task/components/task-labels-editor";
import { TaskLinkedPageSelect } from "@/features/task/components/task-linked-page-select";
import { TaskPrioritySelect } from "@/features/task/components/task-priority-select";
import { TaskStartDateInput } from "@/features/task/components/task-start-date-input";
import { TaskDueDateInput } from "@/features/task/components/task-due-date-input";
import { TaskAttachments } from "@/features/task/components/task-attachments";
import { StartTaskButton } from "@/features/task/components/start-task-button";
import { DeleteTaskButton } from "@/features/task/components/delete-task-button";
import {
  addTaskCommentAction,
  addTaskProgressAction,
  addTaskReviewFeedbackAction,
} from "@/server/actions/task";
import { hoursLabel } from "@/features/time/week";
import { STATUS_LABEL } from "@/features/task/labels";
import { Card } from "@/components/ui/card";
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTab,
  SegmentedControlPanel,
} from "@/components/ui/segmented-control";

function personName(p: { name: string | null; email: string } | null) {
  return p?.name?.trim() || p?.email || "alguien";
}

type CommentRow = {
  id: string;
  kind: IssueCommentKind;
  body: string;
  attachmentUrl: string | null;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

function NoteCard({
  comment,
  workspaceId,
  roleByUserId,
}: {
  comment: CommentRow;
  workspaceId: string;
  roleByUserId: Record<string, WorkspaceRole>;
}) {
  const isFeedback = comment.kind === IssueCommentKind.REVIEW_FEEDBACK;
  return (
    <Card
      variant="glass"
      className={`gap-1.5 p-3.5 ${isFeedback ? "ring-primary/40 ring-1" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        {comment.author ? (
          <UserPreview
            workspaceId={workspaceId}
            userId={comment.author.id}
            name={comment.author.name}
            email={comment.author.email}
            image={comment.author.image}
            role={roleByUserId[comment.author.id]}
          />
        ) : (
          <span className="text-muted-foreground text-xs">alguien</span>
        )}
        {isFeedback && (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
            Feedback del manager
          </span>
        )}
      </div>
      {comment.body && (
        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
      )}
      {comment.attachmentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={comment.attachmentUrl}
          alt="Captura adjunta"
          className="mt-1 max-h-64 w-auto rounded-xl border object-contain"
        />
      )}
    </Card>
  );
}

const dateTimeFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; number: string }>;
}) {
  const { workspaceId, number } = await params;
  const user = await getCurrentUser();

  const task = await getTaskDetail(workspaceId, Number(number), user.id);
  if (!task) notFound();

  const projectId = task.project?.id ?? "";

  const [members, workspaceLabels, role, linkableDatabases] = await Promise.all(
    [
      getWorkspaceMembers(workspaceId),
      listLabels(workspaceId, user.id),
      getWorkspaceRole(workspaceId, user.id),
      projectId
        ? listProjectDatabases(projectId, user.id)
        : Promise.resolve([]),
    ],
  );
  const isAdmin = isAdminRole(role);
  const memberOptions = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));
  // Mapa userId → rol para mostrar badges en comentarios y en el responsable.
  const roleByUserId = Object.fromEntries(
    members.map((m) => [m.user.id, m.role]),
  );

  const backHref = task.project
    ? `/w/${workspaceId}/projects/${task.project.id}`
    : `/w/${workspaceId}/agenda`;

  const comments = task.comments.filter(
    (c) => c.kind === IssueCommentKind.COMMENT,
  );
  const progressNotes = task.comments.filter(
    (c) =>
      c.kind === IssueCommentKind.PROGRESS ||
      c.kind === IssueCommentKind.REVIEW_FEEDBACK,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-10 sm:py-12">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground transition-ios inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          {task.project ? (
            <>
              <span
                className="size-2.5 rounded-full"
                style={{ background: task.project.color ?? "#888888" }}
              />
              {task.project.name}
            </>
          ) : (
            "Mi agenda"
          )}
        </Link>
        {isAdmin && (
          <DeleteTaskButton
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="min-w-0 flex-1">
          <TaskTitle
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            initialTitle={task.title}
          />
        </div>
        <span className="text-muted-foreground text-xl">#{task.number}</span>
      </div>

      {task.status === IssueStatus.TODO && (
        <div className="mt-4">
          <StartTaskButton
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        </div>
      )}

      <Card
        variant="glass"
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Estado">
          <TaskStatusSelect
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            status={task.status}
          />
        </Field>
        <Field label="Tipo">
          <TaskTypeSelect
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            type={task.type}
          />
        </Field>
        <Field label="Prioridad">
          <TaskPrioritySelect
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            priority={task.priority}
          />
        </Field>
        <Field label="Horas invertidas">
          <span className="flex items-center gap-1.5 text-sm">
            <Clock className="text-muted-foreground size-3.5" />
            {hoursLabel(task.totalMinutes)} h
          </span>
        </Field>
        <Field label="Responsables">
          <div className="flex flex-wrap items-center gap-1.5">
            <TaskAssigneeSelect
              taskId={task.id}
              workspaceId={workspaceId}
              projectId={projectId}
              assigneeIds={task.assignees.map((a) => a.id)}
              members={memberOptions}
            />
            {task.assignees.map(
              (a) =>
                roleByUserId[a.id] && (
                  <RoleBadge key={a.id} role={roleByUserId[a.id]} />
                ),
            )}
          </div>
        </Field>
        <Field label="Fecha de inicio">
          <TaskStartDateInput
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            startDate={task.startDate}
          />
        </Field>
        <Field label="Fecha límite">
          <TaskDueDateInput
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            dueDate={task.dueDate}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Etiquetas">
            <TaskLabelsEditor
              taskId={task.id}
              workspaceId={workspaceId}
              projectId={projectId}
              taskLabelIds={task.labels.map((l) => l.id)}
              workspaceLabels={workspaceLabels}
            />
          </Field>
        </div>
        {linkableDatabases.length > 0 && (
          <div className="sm:col-span-2">
            <Field label="Información vinculada">
              <TaskLinkedPageSelect
                taskId={task.id}
                workspaceId={workspaceId}
                projectId={projectId}
                linkedPageId={task.linkedPageId}
                options={linkableDatabases}
              />
            </Field>
          </div>
        )}
      </Card>

      <p className="text-muted-foreground mt-3 flex items-center gap-1.5 px-1 text-xs">
        Creada por {personName(task.author)}
        {task.linkedPage && (
          <>
            {" · "}
            <Link
              href={`/w/${workspaceId}/${task.linkedPage.id}`}
              className="hover:text-foreground inline-flex items-center gap-1 underline"
            >
              <FolderOpen className="size-3" />
              {task.linkedPage.title || "Ver información vinculada"}
            </Link>
          </>
        )}
      </p>

      <SegmentedControl defaultValue="resumen" className="mt-8">
        <SegmentedControlList>
          <SegmentedControlTab value="resumen">Resumen</SegmentedControlTab>
          <SegmentedControlTab value="avances">
            Avances ({progressNotes.length})
          </SegmentedControlTab>
          <SegmentedControlTab value="comentarios">
            Comentarios ({comments.length})
          </SegmentedControlTab>
          <SegmentedControlTab value="archivos">
            Archivos ({task.attachments.length})
          </SegmentedControlTab>
          <SegmentedControlTab value="historial">Historial</SegmentedControlTab>
        </SegmentedControlList>

        <SegmentedControlPanel value="resumen" className="mt-4">
          <TaskDescription
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            initialBody={task.body}
          />
        </SegmentedControlPanel>

        <SegmentedControlPanel value="avances" className="mt-4 space-y-3">
          <p className="text-muted-foreground text-xs">
            Documenta aquí el progreso mientras la tarea está en curso — es lo
            que se necesita para poder marcarla como Hecha. El manager puede
            comentar y dar feedback sobre estos avances.
          </p>
          {progressNotes.map((c) => (
            <NoteCard
              key={c.id}
              comment={c}
              workspaceId={workspaceId}
              roleByUserId={roleByUserId}
            />
          ))}
          <TaskNoteForm
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            action={addTaskProgressAction}
            placeholder="Ej: quedó listo el formulario y las validaciones…"
            submitLabel="Guardar avance"
            attachmentLabel="Adjuntar captura"
          />
          {isAdmin && (
            <TaskNoteForm
              taskId={task.id}
              workspaceId={workspaceId}
              projectId={projectId}
              action={addTaskReviewFeedbackAction}
              placeholder="Feedback sobre los avances (visible para los responsables)…"
              submitLabel="Enviar feedback"
              attachmentLabel="Adjuntar archivo"
            />
          )}
        </SegmentedControlPanel>

        <SegmentedControlPanel value="comentarios" className="mt-4 space-y-3">
          {comments.map((c) => (
            <NoteCard
              key={c.id}
              comment={c}
              workspaceId={workspaceId}
              roleByUserId={roleByUserId}
            />
          ))}
          <TaskNoteForm
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            action={addTaskCommentAction}
            placeholder="Escribe un comentario…"
            submitLabel="Comentar"
          />
        </SegmentedControlPanel>

        <SegmentedControlPanel value="archivos" className="mt-4">
          <TaskAttachments
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            attachments={task.attachments}
          />
        </SegmentedControlPanel>

        <SegmentedControlPanel value="historial" className="mt-4">
          {task.statusEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sin historial todavía.
            </p>
          ) : (
            <ol className="space-y-3">
              {task.statusEvents.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 text-sm">
                  <span className="bg-muted text-muted-foreground mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-medium">
                    {dateTimeFmt.format(new Date(ev.createdAt)).split(" ")[0]}
                  </span>
                  <span>
                    <span className="font-medium">{personName(ev.actor)}</span>{" "}
                    {ev.fromStatus ? (
                      <>
                        movió de <b>{STATUS_LABEL[ev.fromStatus]}</b> a{" "}
                        <b>{STATUS_LABEL[ev.toStatus]}</b>
                      </>
                    ) : (
                      <>
                        creó la tarea en <b>{STATUS_LABEL[ev.toStatus]}</b>
                      </>
                    )}
                    {ev.note && (
                      <span className="text-muted-foreground block">
                        “{ev.note}”
                      </span>
                    )}
                    <span className="text-muted-foreground block text-xs">
                      {dateTimeFmt.format(new Date(ev.createdAt))}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </SegmentedControlPanel>
      </SegmentedControl>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
