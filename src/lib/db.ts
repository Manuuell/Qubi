import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 usa el query compiler + driver adapter (sin motor Rust),
// por eso conectamos a Postgres a través de @prisma/adapter-pg.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

// Reutilizamos una sola instancia en desarrollo para no agotar conexiones
// con el hot-reload de Next.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    // El enlace concede acceso como Miembro: se oculta por defecto para que
    // ninguna consulta amplia lo entregue por accidente a quien no sea admin.
    omit: { workspace: { inviteLinkToken: true } },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
