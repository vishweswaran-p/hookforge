import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3000),
  API_KEY_PEPPER: z.string().min(16).default("local-development-pepper-change-me"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://hookforge:hookforge@localhost:5433/hookforge?schema=public"),
  REDIS_URL: z.string().url().default("redis://localhost:6380"),
});

export const config = envSchema.parse(process.env);
