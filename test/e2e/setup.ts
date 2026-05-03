import { DanetApplication } from "@danet/core";
import { AppModule } from "../../src/app.module.ts";

// Set required env vars for testing before config loads
Deno.env.set("FREEMIUS_STORE_ID", "test_store");
Deno.env.set("FREEMIUS_PRODUCT_ID", "test_product");
Deno.env.set("FREEMIUS_API_TOKEN", "test_token");
Deno.env.set("FREEMIUS_PRODUCT_SECRET", "test_secret");
Deno.env.set("WEBHOOK_FORWARD_URL", "https://api.freemius.com/test-forward");
Deno.env.set("WEBHOOK_FORWARD_SECRET", "forward_secret");

let app: DanetApplication;
let port: number;

export async function setupTestApp() {
  port = 8000 + Math.floor(Math.random() * 1000); 
  Deno.env.set("PORT", port.toString());
  
  app = new DanetApplication();

  // Suppress Danet startup logs
  const originalLog = console.log;
  console.log = () => {};

  try {
    await app.init(AppModule);
    await app.listen(port);
  } finally {
    console.log = originalLog;
  }

  return { app, port, baseUrl: `http://localhost:${port}` };
}

export async function teardownTestApp() {
  if (app) {
    // Suppress Danet shutdown logs
    const originalLog = console.log;
    console.log = () => {};
    try {
      await app.close();
    } finally {
      console.log = originalLog;
    }
  }
}

export function getBaseUrl() {
  return `http://localhost:${port}`;
}
