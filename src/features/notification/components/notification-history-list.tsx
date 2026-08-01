"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  loadNotificationHistoryAction,
} from "@/server/actions/notification";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const fmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function NotificationHistoryList({
  initialNotifications,
  initialCursor,
}: {
  initialNotifications: NotificationRow[];
  initialCursor: string | null;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState(initialNotifications);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const shown = filter === "unread" ? items.filter((n) => !n.readAt) : items;

  function switchFilter(next: "all" | "unread") {
    setFilter(next);
    startTransition(async () => {
      const page = await loadNotificationHistoryAction({
        onlyUnread: next === "unread",
      });
      setItems(page.notifications);
      setCursor(page.nextCursor);
    });
  }

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const page = await loadNotificationHistoryAction({
        cursor,
        onlyUnread: filter === "unread",
      });
      setItems((prev) => [...prev, ...page.notifications]);
      setCursor(page.nextCursor);
    });
  }

  function open(n: NotificationRow) {
    startTransition(async () => {
      if (!n.readAt) {
        await markNotificationReadAction({ id: n.id });
        setItems((prev) =>
          prev.map((it) =>
            it.id === n.id ? { ...it, readAt: new Date() } : it,
          ),
        );
      }
      if (n.href) router.push(n.href);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="bg-muted inline-flex items-center gap-0.5 rounded-full p-1 text-sm">
          {(
            [
              { key: "all", label: "Todas" },
              { key: "unread", label: "No leídas" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => switchFilter(t.key)}
              className={
                filter === t.key
                  ? "bg-card text-foreground transition-ios rounded-full px-4 py-1.5 font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground transition-ios rounded-full px-4 py-1.5"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {items.some((n) => !n.readAt) && (
          <button
            onClick={() =>
              startTransition(async () => {
                await markAllNotificationsReadAction();
                setItems((prev) =>
                  prev.map((it) => ({
                    ...it,
                    readAt: it.readAt ?? new Date(),
                  })),
                );
              })
            }
            disabled={pending}
            className="text-muted-foreground hover:text-foreground transition-ios flex items-center gap-1 text-xs disabled:opacity-50"
          >
            <Check className="size-3.5" />
            Marcar todo como leído
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <Card variant="glass" className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            {filter === "unread"
              ? "No tienes notificaciones sin leer."
              : "Todavía no tienes notificaciones."}
          </p>
        </Card>
      ) : (
        <Card variant="glass" className="divide-border/60 gap-0 divide-y p-0">
          {shown.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              disabled={pending}
              className="hover:bg-accent transition-ios flex w-full items-start gap-2 px-4 py-3 text-left disabled:opacity-70"
            >
              {!n.readAt && (
                <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
              )}
              <div
                className={n.readAt ? "min-w-0 flex-1 pl-4" : "min-w-0 flex-1"}
              >
                <p className="text-sm">{n.title}</p>
                {n.body && (
                  <p className="text-muted-foreground truncate text-xs">
                    {n.body}
                  </p>
                )}
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {fmt.format(new Date(n.createdAt))}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}

      {cursor && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={pending}
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios rounded-full px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {pending ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}
    </div>
  );
}
