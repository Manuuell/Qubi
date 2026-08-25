"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { createMeetingAction } from "@/server/actions/meeting";
import { initials } from "@/features/task/labels";
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
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

export type MemberOption = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

// Suma una hora en formato "HH:mm", envolviendo a las 24h.
function plusOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Modal para agendar una reunión: título, fecha/hora de inicio y fin, lugar,
// descripción e invitados (miembros del workspace). Quien tenga su Google
// Calendar conectado recibe el evento automáticamente al confirmar.
export function NewMeetingDialog({
  workspaceId,
  members,
  connectedUserIds,
}: {
  workspaceId: string;
  members: MemberOption[];
  connectedUserIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setAttendeeIds([]);
    setError(null);
  }

  function toggleAttendee(id: string) {
    setAttendeeIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function onStartDateChange(value: string) {
    setStartDate(value);
    if (value && !endDate) setEndDate(value);
  }

  function onStartTimeChange(value: string) {
    setStartTime(value);
    if (value && !endTime) setEndTime(plusOneHour(value));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime || !endDate || !endTime) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createMeetingAction({
          workspaceId,
          title,
          description,
          location,
          startAt: `${startDate}T${startTime}`,
          endAt: `${endDate}T${endTime}`,
          attendeeIds,
        });
        reset();
        setOpen(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo agendar la reunión.",
        );
      }
    });
  }

  const canSubmit =
    title.trim() && startDate && startTime && endDate && endTime;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger className="glass hover:bg-accent transition-ios flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
        <CalendarPlus className="size-4" />
        Agendar reunión
      </DialogTrigger>
      <DialogContent className="max-w-lg" showClose={!pending}>
        <DialogHeader>
          <DialogTitle>Agendar reunión</DialogTitle>
          <DialogDescription>
            Invita a quien necesites. Quien tenga su Google Calendar conectado
            recibe el evento automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la reunión"
            disabled={pending}
            className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border px-4 py-2.5 text-sm font-medium outline-none focus:ring-2"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                Inicio
              </p>
              <div className="flex gap-2">
                <DatePicker
                  value={startDate}
                  onChange={onStartDateChange}
                  ariaLabel="Fecha de inicio"
                  fullWidth
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  className="bg-background w-24 shrink-0 rounded-xl border px-2 py-1.5 text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                Fin
              </p>
              <div className="flex gap-2">
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  ariaLabel="Fecha de fin"
                  fullWidth
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-background w-24 shrink-0 rounded-xl border px-2 py-1.5 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Lugar (opcional)"
            disabled={pending}
            className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
          />

          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">
              Invitados
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const active = attendeeIds.includes(m.id);
                const connected = connectedUserIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleAttendee(m.id)}
                    className={cn(
                      "transition-ios flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent",
                    )}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={m.image ?? undefined} alt="" />
                      <AvatarFallback>
                        {initials(m.name, m.email)}
                      </AvatarFallback>
                    </Avatar>
                    {m.name?.trim() || m.email}
                    {connected && (
                      <CheckCircle2
                        className="text-primary size-3"
                        aria-label="Tiene Google Calendar conectado"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descripción (opcional)…"
            className="bg-background focus:ring-ring transition-ios w-full resize-none rounded-2xl border p-3 text-sm outline-none focus:ring-2"
          />

          {error && (
            <p className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !canSubmit}
              className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
            >
              {pending ? "Agendando…" : "Agendar reunión"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
