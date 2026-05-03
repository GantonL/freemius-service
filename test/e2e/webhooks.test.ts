import { assertEquals } from "@std/assert";
import { setupTestApp, teardownTestApp } from "./setup.ts";
import { api } from "./helpers/request.ts";
import { mockFreemius } from "./helpers/mock-freemius.ts";
import crypto from "node:crypto";

Deno.test("Webhooks Suite", async (t) => {
  await setupTestApp();
  mockFreemius.setup();

  const supportedEventTypes = [
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

  for (const eventType of supportedEventTypes) {
    await t.step(`should accept webhook for event type: ${eventType}`, async () => {
      // Arrange
      const payload = {
        type: eventType,
        plugin_id: 123,
        timestamp: Date.now(),
        objects: {
          user: { email: "test@example.com" }
        }
      };
      const rawBody = JSON.stringify(payload);
      const secret = "test_secret"; // Configured in setup.ts
      const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

      // Act
      const { status, body } = await api.webhooks.sendFreemius(payload, signature);

      // Assert
      assertEquals(status, 200);
      assertEquals(body.received, true);
    });
  }

  await t.step("should reject webhook with invalid signature", async () => {
    // Arrange
    const payload = { type: "subscription.activated" };
    
    // Act
    const { status } = await api.webhooks.sendFreemius(payload, "invalid_signature");

    // Assert
    assertEquals(status, 403); // Guard should block it
  });

  await t.step("should reject webhook with missing signature", async () => {
    // Arrange
    const payload = { type: "subscription.activated" };
    
    // Act
    const { status } = await api.webhooks.sendFreemius(payload); // No signature

    // Assert
    assertEquals(status, 403);
  });

  await t.step("should forward webhook to configured URL", async () => {
    // Arrange
    const payload = {
      type: "license.activated",
      plugin_id: 123,
      timestamp: Date.now()
    };
    const rawBody = JSON.stringify(payload);
    const secret = "test_secret";
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    let forwardedPayload: any = null;
    let forwardedSecretHeader: string | null = null;

    mockFreemius.clearMocks();
    mockFreemius.addMock(/test-forward/, async (req) => {
      forwardedPayload = await req.json();
      forwardedSecretHeader = req.headers.get("x-webhook-secret");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    // Act
    const { status } = await api.webhooks.sendFreemius(payload, signature);

    // Give it a tiny bit of time for the fire-and-forget forward to hit our mock
    await new Promise(resolve => setTimeout(resolve, 50));

    // Assert
    assertEquals(status, 200);
    assertEquals(forwardedPayload?.type, "license.activated");
    assertEquals(forwardedSecretHeader, "forward_secret");
  });

  mockFreemius.teardown();
  await teardownTestApp();
});
