import { DanetApplication } from "@danet/core";
import { AppModule } from "../../src/app.module.ts";
import { createApi } from "./helpers/request.ts";
import { createMockFreemius } from "./helpers/mock-freemius.ts";

export const TEST_WEBHOOK_SECRET = "test_secret";
export const TEST_FORWARD_SECRET = "forward_secret";

Deno.env.set("FREEMIUS_STORE_ID", "test_store");
Deno.env.set("FREEMIUS_PRODUCT_ID", "test_product");
Deno.env.set("FREEMIUS_API_TOKEN", "test_token");
Deno.env.set("FREEMIUS_PRODUCT_SECRET", TEST_WEBHOOK_SECRET);
Deno.env.set("WEBHOOK_FORWARD_URL", "https://api.freemius.com/test-forward");
Deno.env.set("WEBHOOK_FORWARD_SECRET", TEST_FORWARD_SECRET);

export async function createTestContext() {
  const port = 8000 + Math.floor(Math.random() * 1000);
  Deno.env.set("PORT", port.toString());

  const app = new DanetApplication();
  const mock = createMockFreemius();

  const originalLog = console.log;
  console.log = () => {};
  try {
    await app.init(AppModule);
    await app.listen(port);
  } finally {
    console.log = originalLog;
  }

  mock.setup();
  mock.addMock(/test-forward/, () => new Response("{}", { status: 200 }));

  return {
    api: createApi(`http://localhost:${port}`),
    mock,
    async [Symbol.asyncDispose]() {
      mock.teardown();
      const log = console.log;
      console.log = () => {};
      try {
        await app.close();
      } finally {
        console.log = log;
      }
    },
  };
}
