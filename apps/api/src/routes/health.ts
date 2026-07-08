import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@hookforge/db";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      service: "hookforge-api",
      timestamp: new Date().toISOString(),
    };
  });
};
