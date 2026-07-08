import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const webhookPayloadSchema = z.record(z.string(), z.unknown());

export const publishEventSchema = z.object({
  type: z.string().min(3).max(120),
  payload: webhookPayloadSchema,
});

export const createEndpointSchema = z.object({
  url: z.string().url(),
  description: z.string().max(240).optional(),
});

export type PublishEventInput = z.infer<typeof publishEventSchema>;
export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;

export function signWebhookPayload(params: {
  secret: string;
  timestamp: number;
  body: string;
}) {
  const signedPayload = `${params.timestamp}.${params.body}`;
  return createHmac("sha256", params.secret).update(signedPayload).digest("hex");
}

export function verifyWebhookSignature(params: {
  secret: string;
  timestamp: number;
  body: string;
  signature: string;
}) {
  const expected = signWebhookPayload(params);
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(params.signature, "hex");

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function calculateBackoffMs(attempt: number) {
  const baseDelayMs = 1_000;
  const maxDelayMs = 60_000;
  const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 500);

  return delay + jitter;
}
