import { z } from "zod";

const envSchema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:6380"),
  WEBHOOK_SIGNATURE_HEADER: z.string().default("x-hookforge-signature"),
});

export const config = envSchema.parse(process.env);
