import { notFound } from "next/navigation";
import Link from "next/link";
import { CircleCheck, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { countIssuesByStatus, listIssues } from "@/server/services/issue";
import { NewIssueForm } from "@/features/issue/components/new-issue-form";

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { workspaceId } = await params;
  const { status } = await searchParams;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const filter =
    status === "closed" ? "CLOSED" : status === "all" ? undefined : "OPEN";

  const [issues, counts] = await Promise.all([
    listIssues(workspaceId, filter),
    countIssuesByStatus(workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      <h1 className="font-display mb-6 text-3xl font-bold tracking-tight">
        Issues
      </h1>

      <div className="mb-5">
        <NewIssueForm workspaceId={workspaceId} />
      </div>

      <div className="mb-2 flex gap-4 border-b pb-2 text-sm">
        <FilterTab
          workspaceId={workspaceId}
          value="open"
          active={filter === "OPEN"}
          label={`Abiertos (${counts.open})`}
        />
        <FilterTab
          workspaceId={workspaceId}
          value="closed"
          active={filter === "CLOSED"}
          label={`Cerrados (${counts.closed})`}
        />
        <FilterTab
          workspaceId={workspaceId}
          value="all"
          active={filter === undefined}
          label="Todos"
        />
      </div>

      {issues.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          No hay issues aquí.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {issues.map((i) => (
            <li key={i.id}>
              <Link
                href={`/w/${workspaceId}/issues/${i.number}`}
                className="hover:bg-accent flex items-start gap-3 px-3 py-3"
              >
                {i.status === "OPEN" ? (
                  <CircleDot className="mt-0.5 size-4 shrink-0 text-green-600" />
                ) : (
                  <CircleCheck className="text-primary mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-muted-foreground text-xs">
                    #{i.number} · por{" "}
                    {i.author?.name ?? i.author?.email ?? "alguien"}
                    {i._count.comments > 0
                      ? ` · ${i._count.comments} comentario(s)`
                      : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  workspaceId,
  value,
  active,
  label,
}: {
  workspaceId: string;
  value: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={`/w/${workspaceId}/issues?status=${value}`}
      className={cn(
        "-mb-2 border-b-2 pb-2 transition-colors",
        active
          ? "border-foreground text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
    </Link>
  );
}
