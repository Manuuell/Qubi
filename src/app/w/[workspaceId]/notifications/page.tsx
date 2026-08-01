import { notFound } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { getNotificationHistory } from "@/server/services/notification";
import { NotificationHistoryList } from "@/features/notification/components/notification-history-list";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const first = await getNotificationHistory(user.id, {});

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-12 sm:py-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-full">
          <Bell className="size-5.5" />
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Notificaciones
        </h1>
      </div>
      <NotificationHistoryList
        initialNotifications={first.notifications}
        initialCursor={first.nextCursor}
      />
    </div>
  );
}
