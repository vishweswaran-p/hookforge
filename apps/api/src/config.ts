import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3000),
  API_KEY_PEPPER: z.string().min(16),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

export const config = envSchema.parse(process.env);
