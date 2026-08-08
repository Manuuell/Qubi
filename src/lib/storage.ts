import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// Límite general de subida; los llamadores pueden pedir uno más estricto
// (p.ej. avatares) pasando `maxBytes`, pero nunca uno más permisivo.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Extensiones que nunca deben aceptarse, sea cual sea el Content-Type que
// reporte el navegador: ejecutables/instalables y formatos que el propio
// navegador puede interpretar y ejecutar si se abren directamente desde la
// URL pública del bucket (que sirve desde el mismo dominio de la app en
// producción → HTML/SVG/JS ahí serían XSS almacenado).
const BLOCKED_EXTENSIONS = new Set([
  // Ejecutables / instalables
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "sh",
  "ps1",
  "app",
  "apk",
  "dmg",
  "jar",
  "msc",
  "cpl",
  "scf",
  "lnk",
  "reg",
  "hta",
  // Documentos/markup que el navegador ejecuta o interpreta como HTML/script
  "html",
  "htm",
  "xhtml",
  "shtml",
  "svg",
  "xml",
  "js",
  "mjs",
  "jse",
  "vbs",
  "vbe",
  "wsf",
  "wsh",
]);

// Content-Types que igual hay que rechazar aunque la extensión del archivo
// parezca inocua (alguien puede subir "foto.png" con un cuerpo HTML real).
const BLOCKED_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
]);

export function assertUploadAllowed(file: File, maxBytes = MAX_UPLOAD_BYTES) {
  if (file.size > maxBytes) {
    throw new Error(
      `"${file.name}" supera el máximo permitido (${Math.round(maxBytes / (1024 * 1024))} MB).`,
    );
  }
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error(`"${file.name}": ese tipo de archivo no está permitido.`);
  }
  if (file.type && BLOCKED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error(`"${file.name}": ese tipo de archivo no está permitido.`);
  }
}

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET ?? "qubi-uploads";
// URL pública (de cara al navegador) para servir los archivos. En producción
// suele ser un dominio detrás del reverse proxy; en local, el propio endpoint.
const publicBase = process.env.S3_PUBLIC_URL ?? endpoint;

// Cliente S3 apuntando a MinIO (path-style obligatorio para MinIO).
export const s3 = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "qubi",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "qubi_dev_password",
  },
});

let bucketReady = false;

// Crea el bucket si no existe y le aplica una política de lectura pública
// (para poder servir las imágenes por URL directa). Se ejecuta una vez por proceso.
async function ensureBucket() {
  if (bucketReady) return;

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }

  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      }),
    }),
  );

  bucketReady = true;
}

// Sube un archivo y devuelve su URL pública. Valida tamaño y tipo antes de
// subir (ver assertUploadAllowed) para que ningún llamador pueda saltarse
// el chequeo por accidente.
export async function uploadFile(file: File, maxBytes = MAX_UPLOAD_BYTES) {
  assertUploadAllowed(file, maxBytes);
  await ensureBucket();

  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const key = `uploads/${crypto.randomUUID()}${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return `${publicBase}/${bucket}/${key}`;
}
