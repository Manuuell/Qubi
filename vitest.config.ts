import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Solo cubre lógica pura (sin base de datos): permisos, rate-limit,
// menciones, formateo. Los servicios que hablan con Prisma necesitarían una
// base de datos de pruebas — fuera de alcance por ahora.
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
