// Generador mínimo de archivos .xlsx (OOXML) sin dependencias externas: arma el
// ZIP a mano con node:zlib y escribe solo las partes que necesitamos (libro,
// estilos y hojas con cadenas en línea). Suficiente para exportar tablas con
// encabezados, fechas, números de horas y una fila de totales.
import { deflateRawSync } from "node:zlib";

// ── ZIP ─────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Uint8Array<ArrayBuffer> (y no ArrayBufferLike) para poder pasarlo a Response.
function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ZIP simple (deflate, sin zip64): un .xlsx es exactamente esto.
function zip(
  files: { name: string; data: Uint8Array }[],
): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const compressed = new Uint8Array(deflateRawSync(file.data));
    const crc = crc32(file.data);

    const header = new Uint8Array(30 + name.length);
    const h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); // firma
    h.setUint16(4, 20, true); // versión necesaria
    h.setUint16(6, 0, true); // banderas
    h.setUint16(8, 8, true); // método: deflate
    h.setUint16(10, 0, true); // hora (fija: 1980-01-01)
    h.setUint16(12, 0x21, true); // fecha
    h.setUint32(14, crc, true);
    h.setUint32(18, compressed.length, true);
    h.setUint32(22, file.data.length, true);
    h.setUint16(26, name.length, true);
    header.set(name, 30);
    locals.push(header, compressed);

    const entry = new Uint8Array(46 + name.length);
    const e = new DataView(entry.buffer);
    e.setUint32(0, 0x02014b50, true); // firma
    e.setUint16(4, 20, true); // versión creadora
    e.setUint16(6, 20, true); // versión necesaria
    e.setUint16(10, 8, true); // método: deflate
    e.setUint16(14, 0x21, true); // fecha
    e.setUint32(16, crc, true);
    e.setUint32(20, compressed.length, true);
    e.setUint32(24, file.data.length, true);
    e.setUint16(28, name.length, true);
    e.setUint32(42, offset, true); // desplazamiento del encabezado local
    entry.set(name, 46);
    central.push(entry);

    offset += header.length + compressed.length;
  }

  const directory = concat(central);
  const end = new Uint8Array(22);
  const v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true); // firma
  v.setUint16(8, files.length, true);
  v.setUint16(10, files.length, true);
  v.setUint32(12, directory.length, true);
  v.setUint32(16, offset, true);

  return concat([...locals, directory, end]);
}

// ── Hojas ───────────────────────────────────────────────────────────────────

export type CellStyle =
  | "title"
  | "subtitle"
  | "header"
  | "headerCenter"
  | "text"
  | "hours"
  | "date"
  | "totalText"
  | "totalHours";

type CellValue = string | number | Date | null;

export type Cell = CellValue | { value: CellValue; style?: CellStyle };

export type SheetSpec = {
  name: string;
  columns: number[]; // ancho de cada columna (en caracteres)
  rows: Cell[][];
  freeze?: { rows?: number; columns?: number };
  merges?: string[]; // p. ej. "A1:F1"
  autoFilter?: string; // p. ej. "A4:F120"
};

// Índice de cada estilo dentro de <cellXfs> (0 = predeterminado).
const STYLE_INDEX: Record<CellStyle, number> = {
  title: 1,
  subtitle: 2,
  header: 3,
  headerCenter: 4,
  text: 5,
  hours: 6,
  date: 7,
  totalText: 8,
  totalHours: 9,
};

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// Excel rechaza los caracteres de control dentro del XML.
const CONTROL_CHARS = new RegExp(
  "[\u0000-\u0008\u000B\u000C\u000E-\u001F]",
  "g",
);

function esc(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 1 -> "A", 27 -> "AA" (columnas de Excel).
export function columnName(index: number): string {
  let n = index;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

// Fecha -> número de serie de Excel (días desde 1899-12-30).
function excelSerial(d: Date): number {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round(utc / 86400000) + 25569;
}

function normalize(cell: Cell): { value: CellValue; style?: CellStyle } {
  if (cell !== null && typeof cell === "object" && !(cell instanceof Date)) {
    return cell;
  }
  return { value: cell };
}

function cellXml(ref: string, cell: Cell): string {
  const { value, style } = normalize(cell);
  const s = style ? ` s="${STYLE_INDEX[style]}"` : "";
  if (value === null || value === "") {
    // La celda vacía se escribe igual para conservar el estilo (fondos, bordes).
    return s ? `<c r="${ref}"${s}/>` : "";
  }
  if (value instanceof Date) {
    return `<c r="${ref}"${s}><v>${excelSerial(value)}</v></c>`;
  }
  if (typeof value === "number") {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(
    value,
  )}</t></is></c>`;
}

// Cuántas líneas ocupa un texto ajustado al ancho de su columna (el ancho de
// Excel se mide en caracteres, así que basta con partir por palabras).
function wrappedLines(text: string, width: number): number {
  // -2 caracteres de margen: la letra es proporcional y el ancho de Excel se
  // mide en dígitos, así que conviene quedarse corto antes que pasarse.
  const max = Math.max(Math.floor(width) - 2, 1);
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (used === 0) used = word.length;
    else if (used + 1 + word.length <= max) used += 1 + word.length;
    else {
      lines++;
      used = word.length;
    }
    // Palabra más larga que la columna: se corta en varias líneas.
    while (used > max) {
      lines++;
      used -= max;
    }
  }
  return lines;
}

// Altura de fila: los encabezados crecen para que quepan los nombres largos.
function rowHeight(row: Cell[], columns: number[]): string {
  const styles = row.map((c) => normalize(c).style);
  if (styles.includes("title")) return ' ht="22" customHeight="1"';
  if (!styles.some((s) => s === "header" || s === "headerCenter")) return "";

  let lines = 1;
  row.forEach((cell, i) => {
    const { value, style } = normalize(cell);
    // Solo "headerCenter" ajusta el texto (wrapText); el resto va en una línea.
    if (style !== "headerCenter" || typeof value !== "string") return;
    lines = Math.max(lines, wrappedLines(value, columns[i] ?? 10));
  });
  return ` ht="${Math.min(lines, 4) * 15 + 5}" customHeight="1"`;
}

function sheetXml(sheet: SheetSpec): string {
  const lastCol = columnName(Math.max(sheet.columns.length, 1));
  const lastRow = Math.max(sheet.rows.length, 1);

  const freezeRows = sheet.freeze?.rows ?? 0;
  const freezeCols = sheet.freeze?.columns ?? 0;
  let pane = "";
  if (freezeRows || freezeCols) {
    const topLeft = `${columnName(freezeCols + 1)}${freezeRows + 1}`;
    const active = freezeCols ? "bottomRight" : "bottomLeft";
    pane =
      `<pane${freezeCols ? ` xSplit="${freezeCols}"` : ""}` +
      `${freezeRows ? ` ySplit="${freezeRows}"` : ""}` +
      ` topLeftCell="${topLeft}" activePane="${active}" state="frozen"/>`;
  }

  const cols = sheet.columns
    .map(
      (width, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");

  const rows = sheet.rows
    .map((row, i) => {
      const cells = row
        .map((cell, j) => cellXml(`${columnName(j + 1)}${i + 1}`, cell))
        .join("");
      return `<row r="${i + 1}"${rowHeight(row, sheet.columns)}>${cells}</row>`;
    })
    .join("");

  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
        .map((ref) => `<mergeCell ref="${ref}"/>`)
        .join("")}</mergeCells>`
    : "";
  const filter = sheet.autoFilter
    ? `<autoFilter ref="${sheet.autoFilter}"/>`
    : "";

  // El orden de los elementos es obligatorio en el esquema de la hoja.
  return (
    `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastCol}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    (cols ? `<cols>${cols}</cols>` : "") +
    `<sheetData>${rows}</sheetData>` +
    filter +
    merges +
    `<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>` +
    `</worksheet>`
  );
}

const STYLES_XML =
  `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="2">` +
  `<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>` +
  `<numFmt numFmtId="165" formatCode="0.00"/>` +
  `</numFmts>` +
  `<fonts count="5">` +
  `<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="14"/><color theme="1"/><name val="Calibri"/></font>` +
  `<font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="4">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF6D28D9"/><bgColor indexed="64"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFEFE9F9"/><bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="2">` +
  `<border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border><left/><right/><top style="thin"><color rgb="FFB9A6E4"/></top><bottom/><diagonal/></border>` +
  `</borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="10">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

// Excel limita el nombre de hoja a 31 caracteres y prohíbe : \ / ? * [ ]
function sheetName(name: string): string {
  return esc(name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31)) || "Hoja";
}

// Arma el .xlsx completo con una hoja por elemento de `sheets`.
export function buildXlsx(sheets: SheetSpec[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const text = (data: string) => encoder.encode(data);

  const sheetTags = sheets
    .map(
      (s, i) =>
        `<sheet name="${sheetName(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join("");
  const sheetRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("");
  const sheetTypes = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  const files = [
    {
      name: "[Content_Types].xml",
      data: text(
        `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `${sheetTypes}</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: text(
        `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: text(
        `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
          `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets>${sheetTags}</sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: text(
        `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `${sheetRels}` +
          `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`,
      ),
    },
    { name: "xl/styles.xml", data: text(STYLES_XML) },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: text(sheetXml(s)),
    })),
  ];

  return zip(files);
}
