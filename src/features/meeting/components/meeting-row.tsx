"use client";

import { useState, useTransition } from "react";
import { MapPin, X } from "lucide-react";
import { cancelMeetingAction } from "@/server/actions/meeting";
import type { AgendaMeeting } from "@/server/services/meeting";
import { initials } from "@/features/task/labels";
import { formatMeetingRange } from "@/features/meeting/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function MeetingRow({
  meeting,
  workspaceId,
}: {
  meeting: AgendaMeeting;
  workspaceId: string;
}) {
  return (
    <div className="hover:bg-accent/40 transition-ios flex items-center gap-3 px-4 py-2.5">
      <span className="text-muted-foreground w-28 shrink-0 text-xs">
        {formatMeetingRange(meeting.startAt, meeting.endAt)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{meeting.title}</p>
        {meeting.location && (
          <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            <MapPin className="size-3 shrink-0" />
            {meeting.location}
          </p>
        )}
      </div>

      <span className="flex -space-x-1.5">
        {meeting.attendees.map((a) => (
          <Avatar key={a.id} size="sm" className="ring-card ring-2">
            <AvatarImage src={a.image ?? undefined} alt="" />
            <AvatarFallback>{initials(a.name, a.email)}</AvatarFallback>
          </Avatar>
        ))}
      </span>

      {meeting.isOrganizer && (
        <CancelMeetingButton meetingId={meeting.id} workspaceId={workspaceId} />
      )}
    </div>
  );
}

function CancelMeetingButton({
  meetingId,
  workspaceId,
}: {
  meetingId: string;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Cancelar reunión"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-ios grid size-7 shrink-0 place-items-center rounded-full"
      >
        <X className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar esta reunión?</DialogTitle>
          <DialogDescription>
            Se quita de tu agenda y del Google Calendar de cada invitado
            conectado. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            disabled={pending}
            className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={() =>
              startTransition(async () => {
                await cancelMeetingAction({ meetingId, workspaceId });
                setOpen(false);
              })
            }
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
          >
            {pending ? "Cancelando…" : "Cancelar reunión"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
