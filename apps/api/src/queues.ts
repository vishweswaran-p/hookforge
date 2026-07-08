import { Queue } from "bullmq";
import { config } from "./config.js";

export type DeliveryJob = {
  deliveryAttemptId: string;
};

export const deliveryQueue = new Queue<DeliveryJob>("webhook-delivery", {
  connection: {
    url: config.REDIS_URL,
  },
});
