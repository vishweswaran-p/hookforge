import { Worker } from "bullmq";
import { deliverWebhook } from "./deliver.js";
import { config } from "./config.js";

type DeliveryJob = {
  deliveryAttemptId: string;
};

const worker = new Worker<DeliveryJob>(
  "webhook-delivery",
  async (job) => {
    await deliverWebhook(job.data.deliveryAttemptId);
  },
  {
    connection: {
      url: config.REDIS_URL,
    },
    concurrency: 10,
  },
);

worker.on("completed", (job) => {
  console.log({ jobId: job.id }, "Webhook delivery job completed");
});

worker.on("failed", (job, error) => {
  console.error({ jobId: job?.id, error }, "Webhook delivery job failed");
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
