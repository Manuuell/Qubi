import { getBaseUrl, sendMail } from "@/lib/mail";
import { issueToken } from "@/server/services/auth-token";

// Maquetación HTML mínima con estilos en línea (lo más compatible entre clientes
// de correo).
function emailLayout(opts: {
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
  footer: string;
}) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <div style="font-size:22px;font-weight:700;margin-bottom:16px">Qubi</div>
    <h1 style="font-size:18px;margin:0 0 8px">${opts.heading}</h1>
    <p style="font-size:14px;line-height:1.5;color:#444;margin:0 0 20px">${opts.intro}</p>
    <a href="${opts.ctaHref}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${opts.ctaLabel}</a>
    <p style="font-size:12px;line-height:1.5;color:#888;margin:24px 0 0">${opts.footer}</p>
    <p style="font-size:12px;color:#aaa;margin:8px 0 0;word-break:break-all">${opts.ctaHref}</p>
  </div>`;
}

export async function sendVerificationEmail(email: string) {
  const token = await issueToken("verify", email);
  const link = `${await getBaseUrl()}/verify-email?token=${token}`;
  await sendMail({
    to: email,
    subject: "Confirma tu correo en Qubi",
    text:
      `Confirma tu correo para activar tu cuenta de Qubi:\n${link}\n\n` +
      `El enlace caduca en 24 horas. Si no creaste esta cuenta, ignora este mensaje.`,
    html: emailLayout({
      heading: "Confirma tu correo",
      intro:
        "Gracias por registrarte en Qubi. Para activar tu cuenta, confirma que este correo es tuyo.",
      ctaLabel: "Confirmar correo",
      ctaHref: link,
      footer:
        "El enlace caduca en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.",
    }),
  });
}

export async function sendPasswordResetEmail(email: string) {
  const token = await issueToken("reset", email);
  const link = `${await getBaseUrl()}/reset-password?token=${token}`;
  await sendMail({
    to: email,
    subject: "Restablece tu contraseña de Qubi",
    text:
      `Abre este enlace para elegir una nueva contraseña (caduca en 1 hora):\n${link}\n\n` +
      `Si no lo solicitaste, ignora este mensaje; tu contraseña no cambiará.`,
    html: emailLayout({
      heading: "Restablece tu contraseña",
      intro:
        "Recibimos una solicitud para restablecer tu contraseña. Elige una nueva con el siguiente botón.",
      ctaLabel: "Elegir nueva contraseña",
      ctaHref: link,
      footer:
        "El enlace caduca en 1 hora. Si no lo solicitaste, ignora este mensaje; tu contraseña no cambiará.",
    }),
  });
}
