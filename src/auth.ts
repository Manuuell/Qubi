import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifySwitchToken } from "@/lib/switch-token";

const googleEnabled = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT es obligatorio al usar el provider de credenciales.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.hashedPassword) return null;

        const ok = await bcrypt.compare(password, user.hashedPassword);
        if (!ok) return null;

        // Bloquea el acceso hasta confirmar el correo (ver registro/verify).
        if (!user.emailVerified) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    // Cambio de cuenta sin contraseña: acepta un token firmado que prueba que
    // esa cuenta ya se autenticó en este navegador (ver lib/switch-token).
    Credentials({
      id: "switch",
      name: "switch",
      credentials: { token: { label: "Token", type: "text" } },
      authorize: async (credentials) => {
        const token = String(credentials?.token ?? "");
        const payload = verifySwitchToken(token);
        if (!payload) return null;

        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    // El provider de Google solo se activa si hay credenciales configuradas.
    //
    // allowDangerousEmailAccountLinking: sin esto, quien ya tenía cuenta con
    // contraseña y pulsa "Continuar con Google" choca contra
    // OAuthAccountNotLinked y se queda fuera. Con esto, si el correo coincide,
    // Google queda enlazado a esa misma cuenta y puede entrar por las dos vías.
    //
    // El nombre asusta pero aquí el riesgo no aumenta: Google verifica el
    // correo antes de devolverlo, así que para enlazar hay que controlar ese
    // buzón — y quien lo controla ya puede entrar hoy con "olvidé mi
    // contraseña". Sería peligroso con un proveedor que no verifique correos.
    ...(googleEnabled
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
  ],
  callbacks: {
    // Entrar con Google prueba que el correo es suyo, que es justo lo que
    // pedía el correo de confirmación. Si la cuenta venía sin verificar (se
    // registró con contraseña y nunca abrió el enlace), queda verificada aquí;
    // si no, el provider de credenciales le seguiría cerrando la puerta.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        await prisma.user.updateMany({
          where: { id: user.id, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
