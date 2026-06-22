import type { Property } from "./components/database-table";

// Convierte el valor de una propiedad a texto legible para las vistas de solo lectura.
export function formatPropertyValue(prop: Property, value: unknown): string {
  if (value == null || value === "") return "";
  if (prop.type === "CHECKBOX") return value ? "Sí" : "";
  return String(value);
}
