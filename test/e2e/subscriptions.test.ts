import { assertEquals } from "@std/assert";
import { createTestContext } from "./context.ts";

Deno.test("Subscriptions Suite", async (t) => {
  await using ctx = await createTestContext();

  await t.step("should list subscriptions for a user", async () => {
    ctx.mock.clearMocks();
    ctx.mock.addMock(/subscriptions\.json/, () =>
      new Response(JSON.stringify({
        subscriptions: [{
          id: 100,
          plan_id: 1,
          license_id: 200,
          billing_cycle: 1,
          amount_per_cycle: 9.99,
          currency: "usd",
          is_cancelled: false,
          next_payment: new Date(Date.now() + 86400000).toISOString(),
        }],
      }), { status: 200 }));
    ctx.mock.addMock(/plans\.json/, () =>
      new Response(JSON.stringify({
        plans: [{ id: 1, name: "Pro Plan" }],
      }), { status: 200 }));

    const { status, body } = await ctx.api.subscriptions.list({ user_id: "user123" });

    assertEquals(status, 200);
    assertEquals(body.total, 1);
    assertEquals(body.subscriptions[0].id, 100);
    assertEquals(body.subscriptions[0].plan_name, "Pro Plan");
    assertEquals(body.subscriptions[0].status, "active");
  });
});
