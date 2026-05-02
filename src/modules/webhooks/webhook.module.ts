import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { WebhookController } from "./webhook.controller.ts";
import { FreemiusWebhookGuard } from "./freemius-webhook.guard.ts";

@Module({
  imports: [FreemiusModule],
  controllers: [WebhookController],
  injectables: [FreemiusWebhookGuard],
})
export class WebhookModule {}
