import { config } from "./config.js";
import { buildApp } from "./app.js";

const app = buildApp();

await app.listen({
  port: config.API_PORT,
  host: "0.0.0.0",
});
