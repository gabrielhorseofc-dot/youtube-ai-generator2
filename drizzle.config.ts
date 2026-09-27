import "./scripts/load-env";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL es obligatoria. Configúrala en el entorno del servidor o en .env.local antes de ejecutar Drizzle. No existe una conexión por defecto.",
  );
}

let validPostgresUrl = false;
try {
  const url = new URL(databaseUrl);
  validPostgresUrl = ["postgresql:", "postgres:"].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;
} catch {
  // Do not include the invalid value in the error: it may contain credentials.
}

if (!validPostgresUrl) {
  throw new Error("DATABASE_URL debe contener una URL PostgreSQL válida con el nombre de la base de datos. Copia la cadena completa desde Neon.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  strict: true,
});
