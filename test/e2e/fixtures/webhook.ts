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
    objects: {
      user: { email: "test@example.com", id: 1, first: "Test", last: "User", is_verified: true },
      license: {
        id: 1, plugin_id: 123, user_id: 1, plan_id: 10, quota: 5,
        activated: 1, activated_local: 0, expiration: null,
        is_cancelled: false, is_whitelabeled: false, secret_key: "sk_test",
      },
    },
    ...overrides,
  };
}

export function signPayload(
  payload: Record<string, unknown>,
  secret = TEST_WEBHOOK_SECRET,
): string {
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}
