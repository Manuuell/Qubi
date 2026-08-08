import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Cubre lógica pura (permisos, rate-limit, menciones, formateo) y, donde
// vale la pena, servicios con Prisma mockeado (ver src/server/services/
// time.test.ts para la máquina de estados del cronómetro). Pruebas de
// integración contra una base real siguen fuera de alcance por ahora.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // permissions.ts importa @/lib/db (Prisma) solo por sus funciones que
      // sí consultan la base; las puras que probamos aquí no llegan a
      // ejecutar ninguna query, pero el módulo exige la variable al cargar.
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
