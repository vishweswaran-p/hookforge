import Fastify from "fastify";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import { deliveryRoutes } from "./routes/deliveries.js";
import { endpointRoutes } from "./routes/endpoints.js";
import { eventRoutes } from "./routes/events.js";
import { healthRoutes } from "./routes/health.js";
import { projectRoutes } from "./routes/projects.js";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  app.register(sensible);
  app.register(swagger, {
    openapi: {
      info: {
        title: "HookForge API",
        description: "Webhook delivery platform API",
        version: "0.1.0",
      },
    },
  });
  app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "ValidationError",
        details: error.flatten(),
      });
    }

    request.log.error(error);
    return reply.send(error);
  });

  app.register(healthRoutes);
  app.register(projectRoutes);
  app.register(endpointRoutes);
  app.register(eventRoutes);
  app.register(deliveryRoutes);

  return app;
}
