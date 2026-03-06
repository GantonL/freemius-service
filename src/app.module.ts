import { Module } from "@danet/core";
import { HealthModule } from "./modules/health/health.module.ts";
import { WebhookModule } from "./modules/webhooks/webhook.module.ts";
import { LicenseModule } from "./modules/licenses/license.module.ts";
import { SubscriptionModule } from "./modules/subscriptions/subscription.module.ts";

@Module({
  imports: [HealthModule, WebhookModule, LicenseModule, SubscriptionModule],
})
export class AppModule {}
