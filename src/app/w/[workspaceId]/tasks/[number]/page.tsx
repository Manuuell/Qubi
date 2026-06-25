import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTaskDetail } from "@/server/services/task";
import { getWorkspaceMembers } from "@/server/services/member";
import { TaskTitle } from "@/features/task/components/task-title";
import { TaskDescription } from "@/features/task/components/task-description";
import { TaskCommentForm } from "@/features/task/components/task-comment-form";
import { TaskStatusSelect } from "@/features/task/components/task-status-select";
import { TaskAssigneeSelect } from "@/features/task/components/task-assignee-select";
import { TaskPrioritySelect } from "@/features/task/components/task-priority-select";
import { TaskDueDateInput } from "@/features/task/components/task-due-date-input";

function personName(p: { name: string | null; email: string } | null) {
  return p?.name?.trim() || p?.email || "alguien";
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; number: string }>;
}) {
  const { workspaceId, number } = await params;
  const user = await getCurrentUser();

  const task = await getTaskDetail(workspaceId, Number(number), user.id);
  if (!task) notFound();

  const members = await getWorkspaceMembers(workspaceId);
  const memberOptions = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));
  const projectId = task.project?.id ?? "";

  const backHref = task.project
    ? `/w/${workspaceId}/projects/${task.project.id}`
    : `/w/${workspaceId}/agenda`;

  return (
    <div className="mx-auto max-w-3xl px-10 py-12">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
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

      <div className="flex items-baseline gap-2">
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

      <div className="bg-card mt-5 grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
        <Field label="Estado">
          <TaskStatusSelect
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            status={task.status}
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
        <Field label="Responsable">
          <TaskAssigneeSelect
            taskId={task.id}
            workspaceId={workspaceId}
            projectId={projectId}
            assigneeId={task.assignee?.id ?? null}
            members={memberOptions}
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
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        Creada por {personName(task.author)}
      </p>

      <div className="mt-6">
        <h2 className="text-muted-foreground mb-2 text-sm font-medium">
          Descripción
        </h2>
        <TaskDescription
          taskId={task.id}
          workspaceId={workspaceId}
          projectId={projectId}
          initialBody={task.body}
        />
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">
          Comentarios ({task.comments.length})
        </h2>
        {task.comments.map((c) => (
          <div key={c.id} className="bg-card rounded-md border p-3">
            <p className="text-muted-foreground mb-1 text-xs">
              {personName(c.author)}
            </p>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        <TaskCommentForm
          taskId={task.id}
          workspaceId={workspaceId}
          projectId={projectId}
        />
      </div>
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
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      {children}
    </div>
  );
}
