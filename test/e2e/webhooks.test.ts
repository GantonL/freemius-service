import { assertEquals } from "@std/assert";
import { createTestContext, TEST_FORWARD_SECRET } from "./context.ts";
import { makeWebhookPayload, signPayload } from "./fixtures/webhook.ts";

const SUPPORTED_EVENT_TYPES = [
  "install.installed",
  "install.updated",
  "install.activated",
  "install.deactivated",
  "install.uninstalled",
  "subscription.created",
  "subscription.activated",
  "subscription.cancelled",
  "subscription.expired",
  "subscription.charged_successfully",
  "subscription.charged_failed",
  "license.activated",
  "license.deactivated",
  "license.expired",
  "user.updated",
];

Deno.test("Webhooks Suite", async (t) => {
  await using ctx = await createTestContext();

  for (const eventType of SUPPORTED_EVENT_TYPES) {
    await t.step(`should accept webhook for event type: ${eventType}`, async () => {
      const payload = makeWebhookPayload(eventType);
      const { status, body } = await ctx.api.webhooks.sendFreemius(payload, signPayload(payload));
      assertEquals(status, 200);
      assertEquals(body.received, true);
    });
  }

  await t.step("should reject webhook with invalid signature", async () => {
    const { status } = await ctx.api.webhooks.sendFreemius(
      makeWebhookPayload("subscription.activated"),
      "invalid_signature",
    );
    assertEquals(status, 403);
  });

  await t.step("should reject webhook with missing signature", async () => {
    const { status } = await ctx.api.webhooks.sendFreemius(makeWebhookPayload("subscription.activated"));
    assertEquals(status, 403);
  });

  await t.step("should forward webhook to configured URL", async () => {
    const payload = makeWebhookPayload("license.activated");

    let resolveForward!: (data: { payload: unknown; secret: string | null }) => void;
    const forwarded = new Promise<{ payload: unknown; secret: string | null }>((r) => resolveForward = r);

    ctx.mock.clearMocks();
    ctx.mock.addMock(/test-forward/, async (req) => {
      resolveForward({ payload: await req.json(), secret: req.headers.get("x-webhook-secret") });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    const { status } = await ctx.api.webhooks.sendFreemius(payload, signPayload(payload));
    const { payload: forwardedPayload, secret } = await forwarded;

    assertEquals(status, 200);
    assertEquals((forwardedPayload as Record<string, unknown>).type, "license.activated");
    assertEquals(secret, TEST_FORWARD_SECRET);
  });
});
