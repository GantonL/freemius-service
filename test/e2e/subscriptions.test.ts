import { assertEquals } from "@std/assert";
import { setupTestApp, teardownTestApp } from "./setup.ts";
import { api } from "./helpers/request.ts";
import { mockFreemius } from "./helpers/mock-freemius.ts";

Deno.test("Subscriptions Suite", async (t) => {
  await setupTestApp();
  mockFreemius.setup();

  await t.step("should list subscriptions for a user", async () => {
    // Arrange
    mockFreemius.clearMocks();
    mockFreemius.addMock(/subscriptions\.json/, () => {
      return new Response(JSON.stringify({
        subscriptions: [
          {
            id: 100,
            plan_id: 1,
            license_id: 200,
            billing_cycle: 1, // monthly
            amount_per_cycle: 9.99,
            currency: "usd",
            is_cancelled: false,
            next_payment: new Date(Date.now() + 86400000).toISOString() // tomorrow
          }
        ]
      }), { status: 200 });
    });
    mockFreemius.addMock(/plans\.json/, () => {
      return new Response(JSON.stringify({
        plans: [{ id: 1, name: "Pro Plan" }]
      }), { status: 200 });
    });

    // Act
    const { status, body } = await api.subscriptions.list({ user_id: "user123" });

    // Assert
    assertEquals(status, 200);
    assertEquals(body.total, 1);
    assertEquals(body.subscriptions[0].id, 100);
    assertEquals(body.subscriptions[0].plan_name, "Pro Plan");
    assertEquals(body.subscriptions[0].status, "active");
  });

  mockFreemius.teardown();
  await teardownTestApp();
});
