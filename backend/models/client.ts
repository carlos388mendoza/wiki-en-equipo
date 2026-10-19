import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

/**
 * Producción: Turso (SQLite en la nube) con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
 * Desarrollo y pruebas: el archivo SQLite de DATABASE_URL, sin internet.
 */
export function tursoConfig() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  return url ? { url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined } : null;
}

const turso = tursoConfig();
const log: ("warn" | "error")[] = process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

export const prisma = turso ? new PrismaClient({ adapter: new PrismaLibSQL(turso), log }) : new PrismaClient({ log });
