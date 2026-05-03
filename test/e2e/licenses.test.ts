import { assertEquals } from "@std/assert";
import { setupTestApp, teardownTestApp } from "./setup.ts";
import { api } from "./helpers/request.ts";
import { mockFreemius } from "./helpers/mock-freemius.ts";

Deno.test("Licenses Suite", async (t) => {
  await setupTestApp();
  mockFreemius.setup();

  await t.step("should validate a valid license key", async () => {
    // Arrange
    const secretKey = "valid_key_123";
    mockFreemius.clearMocks();
    mockFreemius.addMock(/licenses\.json/, () => {
      return new Response(JSON.stringify({
        licenses: [
          {
            id: 1,
            secret_key: secretKey,
            is_cancelled: false,
            expiration: null,
            plan_id: 10,
            quota: 5,
            activated: 1
          }
        ]
      }), { status: 200 });
    });

    // Act
    const { status, body } = await api.licenses.validate(secretKey);

    // Assert
    assertEquals(status, 200);
    assertEquals(body.valid, true);
    assertEquals(body.plan, "10");
  });

  await t.step("should return invalid for non-existent license", async () => {
    // Arrange
    mockFreemius.clearMocks();
    mockFreemius.addMock(/licenses\.json/, () => {
      return new Response(JSON.stringify({
        licenses: []
      }), { status: 200 });
    });

    // Act
    const { status, body } = await api.licenses.validate("non_existent_key");

    // Assert
    assertEquals(status, 200);
    assertEquals(body.valid, false);
    assertEquals(body.message, "License not found.");
  });

  mockFreemius.teardown();
  await teardownTestApp();
});
