import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Servidor de colaboración en tiempo real (Yjs sobre WebSocket).
// Cada documento se identifica por el id de la página y se persiste en Postgres
// (columna Page.yjsState). Arráncalo aparte del dev server: `npm run collab`.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const port = Number(process.env.COLLAB_PORT ?? 1234);

const server = new Server({
  port,
  extensions: [
    new Database({
      // Carga el estado Yjs guardado de la página (o null si es nueva).
      fetch: async ({ documentName }) => {
        const page = await prisma.page.findUnique({
          where: { id: documentName },
          select: { yjsState: true },
        });
        return page?.yjsState ? new Uint8Array(page.yjsState) : null;
      },
      // Guarda el estado Yjs (con debounce que gestiona Hocuspocus).
      store: async ({ documentName, state }) => {
        try {
          await prisma.page.update({
            where: { id: documentName },
            data: { yjsState: Uint8Array.from(state) },
          });
        } catch (err) {
          console.error(`[collab] no se pudo guardar ${documentName}:`, err);
        }
      },
    }),
  ],
});

server.listen().then(() => {
  console.log(`✓ Colaboración (Hocuspocus) en ws://localhost:${port}`);
});
