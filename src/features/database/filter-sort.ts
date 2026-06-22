import type { Property, Row } from "./components/database-table";

type PropType = Property["type"];

export const TITLE_FIELD = "__title__";

export type Filter = {
  id: string;
  field: string; // TITLE_FIELD o propertyId
  op: string;
  value: string;
};

export type Sort = {
  field: string;
  dir: "asc" | "desc";
};

export type FieldOption = { value: string; label: string; type: PropType };

// Operadores disponibles por tipo de campo.
export const OPERATORS: Record<PropType, { value: string; label: string }[]> = {
  TEXT: [
    { value: "contains", label: "contiene" },
    { value: "equals", label: "es" },
  ],
  SELECT: [{ value: "equals", label: "es" }],
  NUMBER: [
    { value: "eq", label: "=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
  ],
  DATE: [
    { value: "eq", label: "es" },
    { value: "before", label: "antes de" },
    { value: "after", label: "después de" },
  ],
  CHECKBOX: [{ value: "is", label: "es" }],
};

export function fieldsFromProperties(properties: Property[]): FieldOption[] {
  return [
    { value: TITLE_FIELD, label: "Nombre", type: "TEXT" },
    ...properties.map((p) => ({ value: p.id, label: p.name, type: p.type })),
  ];
}

function fieldType(field: string, properties: Property[]): PropType {
  if (field === TITLE_FIELD) return "TEXT";
  return properties.find((p) => p.id === field)?.type ?? "TEXT";
}

function rawValue(row: Row, field: string): unknown {
  return field === TITLE_FIELD ? row.title : row.values[field];
}

function matchesFilter(row: Row, properties: Property[], f: Filter): boolean {
  const type = fieldType(f.field, properties);
  const raw = rawValue(row, f.field);

  switch (type) {
    case "CHECKBOX":
      return Boolean(raw) === (f.value === "true");
    case "NUMBER": {
      if (f.value === "") return true;
      const fv = Number(f.value);
      const n = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(fv)) return true;
      if (Number.isNaN(n)) return false;
      if (f.op === "gt") return n > fv;
      if (f.op === "lt") return n < fv;
      return n === fv;
    }
    case "DATE": {
      if (!f.value) return true;
      const s = typeof raw === "string" ? raw.slice(0, 10) : "";
      if (f.op === "before") return s !== "" && s < f.value;
      if (f.op === "after") return s !== "" && s > f.value;
      return s === f.value;
    }
    default: {
      // TEXT y SELECT
      if (!f.value) return true;
      const s = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
      if (f.op === "equals") return s === f.value;
      return s.toLowerCase().includes(f.value.toLowerCase());
    }
  }
}

function compareRows(
  a: Row,
  b: Row,
  properties: Property[],
  sort: Sort,
): number {
  const type = fieldType(sort.field, properties);
  const av = rawValue(a, sort.field);
  const bv = rawValue(b, sort.field);

  let cmp = 0;
  if (type === "NUMBER") {
    cmp = (Number(av) || 0) - (Number(bv) || 0);
  } else if (type === "CHECKBOX") {
    cmp = (av ? 1 : 0) - (bv ? 1 : 0);
  } else {
    // TEXT, SELECT y DATE (YYYY-MM-DD ordena lexicográficamente)
    cmp = String(av ?? "").localeCompare(String(bv ?? ""));
  }
  return sort.dir === "asc" ? cmp : -cmp;
}

export function applyFiltersSort(
  rows: Row[],
  properties: Property[],
  filters: Filter[],
  sort: Sort | null,
): Row[] {
  let result = rows.filter((row) =>
    filters.every((f) => matchesFilter(row, properties, f)),
  );
  if (sort) {
    result = [...result].sort((a, b) => compareRows(a, b, properties, sort));
  }
  return result;
}
