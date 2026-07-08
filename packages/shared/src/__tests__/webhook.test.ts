import { describe, expect, it } from "vitest";
import { calculateBackoffMs, signWebhookPayload, verifyWebhookSignature } from "../index.js";

describe("webhook signatures", () => {
  it("verifies a valid HMAC signature", () => {
    const body = JSON.stringify({ event: "invoice.paid" });
    const timestamp = 1_789_123_456;
    const signature = signWebhookPayload({
      secret: "endpoint-secret",
      timestamp,
      body,
    });

    expect(
      verifyWebhookSignature({
        secret: "endpoint-secret",
        timestamp,
        body,
        signature,
      }),
    ).toBe(true);
  });

  it("rejects a signature generated with a different secret", () => {
    const body = JSON.stringify({ event: "invoice.paid" });
    const timestamp = 1_789_123_456;
    const signature = signWebhookPayload({
      secret: "wrong-secret",
      timestamp,
      body,
    });

    expect(
      verifyWebhookSignature({
        secret: "endpoint-secret",
        timestamp,
        body,
        signature,
      }),
    ).toBe(false);
  });
});

describe("retry backoff", () => {
  it("increases delay as attempts increase", () => {
    const firstAttempt = calculateBackoffMs(1);
    const fourthAttempt = calculateBackoffMs(4);

    expect(fourthAttempt).toBeGreaterThan(firstAttempt);
  });
});
