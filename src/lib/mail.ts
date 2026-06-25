import nodemailer from "nodemailer";
import { headers } from "next/headers";

// Envío de correo por SMTP. Si no hay SMTP configurado (típico en desarrollo),
// imprime el mensaje en consola para poder probar los flujos sin enviar nada.

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM ?? "Qubi <no-reply@localhost>";

const smtpConfigured = Boolean(host && user && pass);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL; 587/25 = STARTTLS
      auth: { user: user!, pass: pass! },
    })
  : null;

export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!transporter) {
    console.log(
      `\n──────── [correo: SMTP no configurado] ────────\n` +
        `Para:    ${message.to}\n` +
        `Asunto:  ${message.subject}\n\n` +
        `${message.text}\n` +
        `───────────────────────────────────────────────\n`,
    );
    return;
  }
  await transporter.sendMail({ from, ...message });
}

// URL base absoluta a partir de la petición actual (respeta el reverse proxy
// en producción y el puerto real en desarrollo). Útil para enlaces de correo.
export async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
