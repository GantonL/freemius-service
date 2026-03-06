import { DanetApplication } from "@danet/core";
import { AppModule } from "./app.module.ts";
import { config } from "./config.ts";

async function bootstrap() {
  const app = new DanetApplication();
  await app.init(AppModule);

  const port = config.port;
  await app.listen(port);

  console.log(`🚀 Freemius Service running on http://localhost:${port}`);
  console.log(`   GET  /health`);
  console.log(`   GET  /licenses/validate?key=XXX`);
  console.log(`   POST /webhooks/freemius`);
}

bootstrap().catch((err) => {
  console.error("Failed to start application:", err);
  Deno.exit(1);
});
