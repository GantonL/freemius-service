import { assertEquals } from "@std/assert";
import { setupTestApp, teardownTestApp } from "./setup.ts";
import { api } from "./helpers/request.ts";
import { mockFreemius } from "./helpers/mock-freemius.ts";

Deno.test("Invoices Suite", async (t) => {
  await setupTestApp();
  mockFreemius.setup();

  await t.step("should fetch invoices list", async () => {
    mockFreemius.clearMocks();
    mockFreemius.addMock(/payments\.json/, () => {
      return new Response(JSON.stringify({
        payments: [
          { id: 1, amount: 10, currency: "usd" }
        ]
      }), { status: 200 });
    });

    const { status, body } = await api.invoices.list({ user_id: "user1" });
    
    assertEquals(status, 200);
    assertEquals(body.total, 1);
  });

  await t.step("should fetch invoice pdf", async () => {
    mockFreemius.clearMocks();
    mockFreemius.addMock(/invoice\.pdf/, () => {
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      return new Response(buffer, {
        status: 200,
        headers: { "Content-Type": "application/pdf" }
      });
    });

    const { status, body, headers } = await api.invoices.getPdf("1");
    
    assertEquals(status, 200);
    assertEquals(headers?.get("content-type"), "application/pdf");
    assertEquals(body instanceof ArrayBuffer, true);
  });

  mockFreemius.teardown();
  await teardownTestApp();
});
