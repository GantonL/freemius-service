import crypto from "node:crypto";
import { TEST_WEBHOOK_SECRET } from "../context.ts";

export function makeWebhookPayload(
  eventType: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: eventType,
    plugin_id: 123,
    timestamp: Date.now(),
    objects: { user: { email: "test@example.com" } },
    ...overrides,
  };
}

export function signPayload(
  payload: Record<string, unknown>,
  secret = TEST_WEBHOOK_SECRET,
): string {
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}
