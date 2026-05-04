import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { WebhookController } from "./webhook.controller.ts";
import { FreemiusWebhookGuard } from "./guards/freemius-webhook.guard.ts";
import { WebhookUserGuard } from "./guards/webhook-user.guard.ts";
import { DatabaseModule } from "../database/database.module.ts";

@Module({
  imports: [FreemiusModule, DatabaseModule],
  controllers: [WebhookController],
  injectables: [FreemiusWebhookGuard, WebhookUserGuard],
})
export class WebhookModule {}
