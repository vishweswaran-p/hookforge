import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@hookforge/db";
import { requireProject } from "../auth.js";
import { deliveryQueue } from "../queues.js";

export const deliveryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/deliveries", async (request) => {
    const project = await requireProject(request);

    const deliveries = await prisma.deliveryAttempt.findMany({
      where: {
        event: {
          projectId: project.id,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        status: true,
        attemptNumber: true,
        responseCode: true,
        error: true,
        latencyMs: true,
        nextAttemptAt: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            type: true,
          },
        },
        endpoint: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    return { deliveries };
  });

  app.post("/deliveries/:id/replay", async (request, reply) => {
    const project = await requireProject(request);
    const { id } = request.params as { id: string };

    const delivery = await prisma.deliveryAttempt.findFirst({
      where: {
        id,
        event: {
          projectId: project.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!delivery) {
      throw app.httpErrors.notFound("Delivery not found");
    }

    await prisma.deliveryAttempt.update({
      where: {
        id: delivery.id,
      },
      data: {
        status: "PENDING",
        nextAttemptAt: new Date(),
        error: null,
      },
    });

    await deliveryQueue.add(
      "deliver-webhook",
      {
        deliveryAttemptId: delivery.id,
      },
      {
        jobId: `replay:${delivery.id}:${Date.now()}`,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
      },
    );

    return reply.code(202).send({
      deliveryId: delivery.id,
      status: "queued",
    });
  });
};
