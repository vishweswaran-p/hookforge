import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@hookforge/db";
import { z } from "zod";
import { generateApiKey, hashApiKey } from "../auth.js";

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
});

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.post("/projects", async (request, reply) => {
    const input = createProjectSchema.parse(request.body);
    const apiKey = generateApiKey();

    const project = await prisma.project.create({
      data: {
        name: input.name,
        apiKeyHash: hashApiKey(apiKey),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    return reply.code(201).send({
      project,
      apiKey,
    });
  });
};
