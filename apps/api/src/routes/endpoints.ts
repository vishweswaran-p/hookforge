import type { FastifyPluginAsync } from "fastify";
import { randomBytes } from "node:crypto";
import { prisma } from "@hookforge/db";
import { createEndpointSchema } from "@hookforge/shared";
import { requireProject } from "../auth.js";

export const endpointRoutes: FastifyPluginAsync = async (app) => {
  app.post("/endpoints", async (request, reply) => {
    const project = await requireProject(request);
    const input = createEndpointSchema.parse(request.body);

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        projectId: project.id,
        url: input.url,
        description: input.description,
        secret: randomBytes(32).toString("hex"),
      },
      select: {
        id: true,
        url: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    return reply.code(201).send({ endpoint });
  });

  app.get("/endpoints", async (request) => {
    const project = await requireProject(request);

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        url: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { endpoints };
  });
};
