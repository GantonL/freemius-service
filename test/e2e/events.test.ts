import { assertEquals } from "@std/assert";
import { createTestContext } from "./context.ts";

Deno.test("Events Suite", async (t) => {
  await using ctx = await createTestContext();

  await t.step("should fetch an event by id", async () => {
    ctx.mock.clearMocks();
    ctx.mock.addMock(/\/events\/123\.json/, () =>
      new Response(JSON.stringify({
        id: 123,
        type: "license.activated",
        created: "2023-01-01T00:00:00Z",
      }), { status: 200 }));

    const { status, body } = await ctx.api.events.get("123");

    assertEquals(status, 200);
    assertEquals(body.id, 123);
    assertEquals(body.type, "license.activated");
  });

  await t.step("should return 404 for non-existent event", async () => {
    ctx.mock.clearMocks();
    ctx.mock.addMock(/\/events\/999\.json/, () =>
      new Response("null", { status: 200 }));

    const { status, body } = await ctx.api.events.get("999");

    // The mock returns null, so result is null, which throws NotFoundException (status 404)
    assertEquals(status, 404);
    assertEquals(body.message, "Event 999 not found.");
  });
});
