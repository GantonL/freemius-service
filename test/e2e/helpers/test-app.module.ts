import { Module } from "@danet/core";
import { HealthModule } from "../../../src/modules/health/health.module.ts";
import { LicenseModule } from "../../../src/modules/licenses/license.module.ts";
import { SubscriptionModule } from "../../../src/modules/subscriptions/subscription.module.ts";
import { InvoiceModule } from "../../../src/modules/invoices/invoice.module.ts";
import { FreemiusModule } from "../../../src/modules/freemius/freemius.module.ts";
import { WebhookController } from "../../../src/modules/webhooks/webhook.controller.ts";
import { FreemiusWebhookGuard } from "../../../src/modules/webhooks/guards/freemius-webhook.guard.ts";
import { WebhookUserGuard } from "../../../src/modules/webhooks/guards/webhook-user.guard.ts";
import { MockDatabaseModule } from "./mock-database.module.ts";

@Module({
  imports: [FreemiusModule, MockDatabaseModule],
  controllers: [WebhookController],
  injectables: [FreemiusWebhookGuard, WebhookUserGuard],
})
class TestWebhookModule {}

@Module({
  imports: [
    HealthModule,
    TestWebhookModule,
    LicenseModule,
    SubscriptionModule,
    InvoiceModule,
  ],
})
export class TestAppModule {}
