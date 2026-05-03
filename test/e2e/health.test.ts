import { assertEquals } from "@std/assert";
import { createTestContext } from "./context.ts";

Deno.test("Health Suite", async (t) => {
  await using ctx = await createTestContext();

  await t.step("should return healthy status", async () => {
    const { status, body } = await ctx.api.health.check();

    assertEquals(status, 200);
    assertEquals(body.status, "ok");
    assertEquals(body.service, "freemius-service");
  });
});
