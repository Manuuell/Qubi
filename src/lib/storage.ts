import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET ?? "qubi-uploads";

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

// Sube un archivo y devuelve su URL pública.
export async function uploadFile(file: File) {
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

  return `${endpoint}/${bucket}/${key}`;
}
