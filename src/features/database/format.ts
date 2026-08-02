import type { Property } from "./components/database-table";

// Convierte el valor de una propiedad a texto legible para las vistas de solo lectura.
export function formatPropertyValue(prop: Property, value: unknown): string {
  if (value == null || value === "") return "";
  if (prop.type === "CHECKBOX") return value ? "Sí" : "";
  if (prop.type === "FILE") {
    if (typeof value === "object" && value !== null && "name" in value) {
      return String((value as { name?: unknown }).name ?? "");
    }
    return "";
  }
  return String(value);
}
