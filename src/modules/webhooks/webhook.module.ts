import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { WebhookController } from "./webhook.controller.ts";
import { FreemiusEventWebhookGuard } from "./guards/freemius-event-webhook.guard.ts";
import { DatabaseModule } from "../database/database.module.ts";

@Module({
  imports: [FreemiusModule, DatabaseModule],
  controllers: [WebhookController],
  injectables: [FreemiusEventWebhookGuard],
})
export class WebhookModule {}
