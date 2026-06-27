"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, UserPlus, X } from "lucide-react";
import type { Inbox } from "@/server/services/notification";
import {
  acceptInviteAction,
  declineInviteAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification";

// "hace 5 min", "hace 2 h", "hace 3 d". Suficiente para una bandeja.
function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function NotificationBell({ inbox }: { inbox: Inbox }) {
  const { invites, notifications, unreadCount } = inbox;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isEmpty = invites.length === 0 && notifications.length === 0;

  function openNotification(n: Inbox["notifications"][number]) {
    setOpen(false);
    startTransition(async () => {
      if (!n.readAt) await markNotificationReadAction({ id: n.id });
      if (n.href) router.push(n.href);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        className="text-muted-foreground hover:bg-accent hover:text-foreground relative grid size-7 place-items-center rounded"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="bg-popover absolute bottom-full left-0 z-20 mb-1 max-h-[28rem] w-80 overflow-y-auto rounded-lg border shadow-lg">
            <div className="bg-popover sticky top-0 flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-medium">Notificaciones</p>
              {notifications.some((n) => !n.readAt) && (
                <button
                  onClick={() =>
                    startTransition(() => markAllNotificationsReadAction())
                  }
                  disabled={pending}
                  className="text-muted-foreground hover:text-foreground text-xs disabled:opacity-50"
                >
                  Marcar todo como leído
                </button>
              )}
            </div>

            {isEmpty ? (
              <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                No tienes notificaciones.
              </p>
            ) : (
              <ul className="divide-y">
                {/* Invitaciones a espacios: requieren aceptar o rechazar. */}
                {invites.map((inv) => (
                  <li key={inv.id} className="px-3 py-3">
                    <div className="flex gap-2">
                      <UserPlus className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          Te invitaron a{" "}
                          <span className="font-medium">
                            {inv.workspace.name}
                          </span>
                        </p>
                        {inv.invitedBy && (
                          <p className="text-muted-foreground truncate text-xs">
                            de {inv.invitedBy.name || inv.invitedBy.email}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              startTransition(() =>
                                acceptInviteAction({ inviteId: inv.id }),
                              )
                            }
                            disabled={pending}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            <Check className="size-3" />
                            Aceptar
                          </button>
                          <button
                            onClick={() =>
                              startTransition(() =>
                                declineInviteAction({ inviteId: inv.id }),
                              )
                            }
                            disabled={pending}
                            className="hover:bg-accent inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs disabled:opacity-50"
                          >
                            <X className="size-3" />
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}

                {/* Notificaciones normales: enlaces que se marcan al abrir. */}
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => openNotification(n)}
                      className="hover:bg-accent flex w-full gap-2 px-3 py-3 text-left"
                    >
                      {!n.readAt && (
                        <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                      )}
                      <div
                        className={
                          n.readAt ? "min-w-0 flex-1 pl-4" : "min-w-0 flex-1"
                        }
                      >
                        <p className="text-sm">{n.title}</p>
                        {n.body && (
                          <p className="text-muted-foreground truncate text-xs">
                            {n.body}
                          </p>
                        )}
                        <p className="text-muted-foreground mt-0.5 text-[11px]">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
