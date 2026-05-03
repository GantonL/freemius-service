import { assertEquals } from "@std/assert";
import { setupTestApp, teardownTestApp } from "./setup.ts";
import { api } from "./helpers/request.ts";

Deno.test("Health Suite", async (t) => {
  await setupTestApp();

  await t.step("should return healthy status", async () => {
    // Act
    const { status, body } = await api.health.check();

    // Assert
    assertEquals(status, 200);
    assertEquals(body.status, "ok");
    assertEquals(body.service, "freemius-service");
  });

  await teardownTestApp();
});
