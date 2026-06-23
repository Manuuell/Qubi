import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleCheck, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getIssueByNumber } from "@/server/services/issue";
import { IssueStatusButton } from "@/features/issue/components/issue-status-button";
import { IssueCommentForm } from "@/features/issue/components/issue-comment-form";

function authorName(a: { name: string | null; email: string } | null) {
  return a?.name ?? a?.email ?? "alguien";
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; number: string }>;
}) {
  const { workspaceId, number } = await params;
  const user = await getCurrentUser();

  const issue = await getIssueByNumber(workspaceId, Number(number), user.id);
  if (!issue) notFound();

  const isOpen = issue.status === "OPEN";

  return (
    <div className="mx-auto max-w-3xl px-12 py-12">
      <Link
        href={`/w/${workspaceId}/issues`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Issues
      </Link>

      <h1 className="font-display text-3xl font-bold tracking-tight">
        {issue.title}{" "}
        <span className="text-muted-foreground font-normal">
          #{issue.number}
        </span>
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm text-white",
            isOpen ? "bg-green-600" : "bg-primary",
          )}
        >
          {isOpen ? (
            <CircleDot className="size-4" />
          ) : (
            <CircleCheck className="size-4" />
          )}
          {isOpen ? "Abierto" : "Cerrado"}
        </span>
        <span className="text-muted-foreground text-sm">
          abierto por {authorName(issue.author)}
          {issue.assignee && ` · responsable: ${authorName(issue.assignee)}`}
        </span>
        <div className="ml-auto">
          <IssueStatusButton
            issueId={issue.id}
            workspaceId={workspaceId}
            number={issue.number}
            status={issue.status}
          />
        </div>
      </div>

      {issue.body && (
        <div className="bg-card mt-6 rounded-md border p-4 text-sm whitespace-pre-wrap">
          {issue.body}
        </div>
      )}

      <div className="mt-8 space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">
          Comentarios ({issue.comments.length})
        </h2>
        {issue.comments.map((c) => (
          <div key={c.id} className="bg-card rounded-md border p-3">
            <p className="text-muted-foreground mb-1 text-xs">
              {authorName(c.author)}
            </p>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        <IssueCommentForm
          issueId={issue.id}
          workspaceId={workspaceId}
          number={issue.number}
        />
      </div>
    </div>
  );
}
