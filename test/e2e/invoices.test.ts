import { assertEquals } from "@std/assert";
import { createTestContext } from "./context.ts";

Deno.test("Invoices Suite", async (t) => {
  await using ctx = await createTestContext();

  await t.step("should fetch invoices list", async () => {
    ctx.mock.clearMocks();
    ctx.mock.addMock(/payments\.json/, () =>
      new Response(JSON.stringify({
        payments: [{ id: 1, amount: 10, currency: "usd" }],
      }), { status: 200 }));

    const { status, body } = await ctx.api.invoices.list({ user_id: "user1" });

    assertEquals(status, 200);
    assertEquals(body.payments.length, 1);
  });

  await t.step("should fetch invoice pdf", async () => {
    ctx.mock.clearMocks();
    ctx.mock.addMock(/invoice\.pdf/, () =>
      new Response(new Uint8Array([1, 2, 3, 4]).buffer, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }));

    const { status, body, headers } = await ctx.api.invoices.getPdf("1");

    assertEquals(status, 200);
    assertEquals(headers?.get("content-type"), "application/pdf");
    assertEquals(body instanceof ArrayBuffer, true);
  });
});
