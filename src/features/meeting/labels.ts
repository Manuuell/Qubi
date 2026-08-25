// Date -> "HH:mm" en horario local (para <input type="time">).
export function toTimeInputValue(d: Date | string) {
  const dt = new Date(d);
  const h = String(dt.getHours()).padStart(2, "0");
  const m = String(dt.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// "09:00–10:00" para mostrar el rango horario de una reunión.
export function formatMeetingRange(start: Date | string, end: Date | string) {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fmt.format(new Date(start))}–${fmt.format(new Date(end))}`;
}
