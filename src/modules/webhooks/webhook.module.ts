import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { WebhookController } from "./webhook.controller.ts";

@Module({
  imports: [FreemiusModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
