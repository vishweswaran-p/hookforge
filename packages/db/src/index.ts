import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://hookforge:hookforge@localhost:5432/hookforge?schema=public";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});

export * from "./generated/prisma/client.js";
