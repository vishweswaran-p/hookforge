import { prisma } from "@hookforge/db";
import { calculateBackoffMs, signWebhookPayload } from "@hookforge/shared";
import { config } from "./config.js";

const maxAttempts = 5;

export async function deliverWebhook(deliveryAttemptId: string) {
  const delivery = await prisma.deliveryAttempt.findUnique({
    where: {
      id: deliveryAttemptId,
    },
    include: {
      endpoint: true,
      event: true,
    },
  });

  if (!delivery || delivery.status === "DELIVERED" || delivery.status === "DEAD_LETTERED") {
    return;
  }

  const body = JSON.stringify({
    id: delivery.event.id,
    type: delivery.event.type,
    createdAt: delivery.event.createdAt,
    payload: delivery.event.payload,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload({
    secret: delivery.endpoint.secret,
    timestamp,
    body,
  });
  const startedAt = Date.now();
  const attemptNumber = delivery.attemptNumber + 1;

  try {
    const response = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [config.WEBHOOK_SIGNATURE_HEADER]: signature,
        "x-hookforge-timestamp": String(timestamp),
        "x-hookforge-event-id": delivery.event.id,
      },
      body,
    });

    const responseBody = await response.text();
    const latencyMs = Date.now() - startedAt;

    if (response.ok) {
      await prisma.deliveryAttempt.update({
        where: {
          id: delivery.id,
        },
        data: {
          status: "DELIVERED",
          attemptNumber,
          responseCode: response.status,
          responseBody: responseBody.slice(0, 2_000),
          error: null,
          latencyMs,
        },
      });
      return;
    }

    await markFailed({
      deliveryAttemptId: delivery.id,
      attemptNumber,
      responseCode: response.status,
      responseBody,
      error: `Endpoint returned ${response.status}`,
      latencyMs,
    });
  } catch (error) {
    await markFailed({
      deliveryAttemptId: delivery.id,
      attemptNumber,
      error: error instanceof Error ? error.message : "Unknown delivery error",
      latencyMs: Date.now() - startedAt,
    });
  }
}

async function markFailed(params: {
  deliveryAttemptId: string;
  attemptNumber: number;
  responseCode?: number;
  responseBody?: string;
  error: string;
  latencyMs: number;
}) {
  const shouldDeadLetter = params.attemptNumber >= maxAttempts;
  const nextAttemptAt = new Date(Date.now() + calculateBackoffMs(params.attemptNumber));

  await prisma.deliveryAttempt.update({
    where: {
      id: params.deliveryAttemptId,
    },
    data: {
      status: shouldDeadLetter ? "DEAD_LETTERED" : "FAILED",
      attemptNumber: params.attemptNumber,
      responseCode: params.responseCode,
      responseBody: params.responseBody?.slice(0, 2_000),
      error: params.error,
      latencyMs: params.latencyMs,
      nextAttemptAt,
    },
  });

  if (!shouldDeadLetter) {
    throw new Error(params.error);
  }
}
