import { createHash, randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "@hookforge/db";
import { config } from "./config.js";

export function generateApiKey() {
  return `hf_${randomBytes(24).toString("hex")}`;
}

export function hashApiKey(apiKey: string) {
  return createHash("sha256").update(`${apiKey}.${config.API_KEY_PEPPER}`).digest("hex");
}

export async function requireProject(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  const apiKey = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;

  if (!apiKey) {
    throw request.server.httpErrors.unauthorized("Missing bearer token");
  }

  const project = await prisma.project.findUnique({
    where: {
      apiKeyHash: hashApiKey(apiKey),
    },
  });

  if (!project) {
    throw request.server.httpErrors.unauthorized("Invalid API key");
  }

  return project;
}
