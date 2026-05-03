import { assertEquals } from "@std/assert";
import { createTestContext } from "./context.ts";

Deno.test("Licenses Suite", async (t) => {
  await using ctx = await createTestContext();

  await t.step("should validate a valid license key", async () => {
    const secretKey = "valid_key_123";
    ctx.mock.clearMocks();
    ctx.mock.addMock(/licenses\.json/, () =>
      new Response(JSON.stringify({
        licenses: [{
          id: 1,
          secret_key: secretKey,
          is_cancelled: false,
          expiration: null,
          plan_id: 10,
          quota: 5,
          activated: 1,
        }],
      }), { status: 200 }));

    const { status, body } = await ctx.api.licenses.validate(secretKey);

    assertEquals(status, 200);
    assertEquals(body.valid, true);
    assertEquals(body.plan, "10");
  });

  await t.step("should return invalid for non-existent license", async () => {
    ctx.mock.clearMocks();
    ctx.mock.addMock(/licenses\.json/, () =>
      new Response(JSON.stringify({ licenses: [] }), { status: 200 }));

    const { status, body } = await ctx.api.licenses.validate("non_existent_key");

    assertEquals(status, 200);
    assertEquals(body.valid, false);
    assertEquals(body.message, "License not found.");
  });
});
