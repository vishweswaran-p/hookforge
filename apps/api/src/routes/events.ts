import type { FastifyPluginAsync } from "fastify";
import { Prisma, prisma } from "@hookforge/db";
import { publishEventSchema } from "@hookforge/shared";
import { requireProject } from "../auth.js";
import { deliveryQueue } from "../queues.js";

export const eventRoutes: FastifyPluginAsync = async (app) => {
  app.post("/events", async (request, reply) => {
    const project = await requireProject(request);
    const input = publishEventSchema.parse(request.body);

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        projectId: project.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const { event, deliveries } = await prisma.$transaction(async (tx) => {
      const event = await tx.webhookEvent.create({
        data: {
          projectId: project.id,
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
        },
      });

      await tx.deliveryAttempt.createMany({
        data: endpoints.map((endpoint) => ({
          eventId: event.id,
          endpointId: endpoint.id,
        })),
      });

      const deliveries = await tx.deliveryAttempt.findMany({
        where: {
          eventId: event.id,
        },
        select: {
          id: true,
        },
      });

      return {
        event,
        deliveries,
      };
    });

    await deliveryQueue.addBulk(
      deliveries.map((delivery) => ({
        name: "deliver-webhook",
        data: {
          deliveryAttemptId: delivery.id,
        },
        opts: {
          jobId: delivery.id,
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 1_000,
          },
        },
      })),
    );

    return reply.code(202).send({
      eventId: event.id,
      queuedDeliveries: deliveries.length,
    });
  });
};
