import { Module } from "@danet/core";
import { HealthModule } from "../../../src/modules/health/health.module.ts";
import { LicenseModule } from "../../../src/modules/licenses/license.module.ts";
import { SubscriptionModule } from "../../../src/modules/subscriptions/subscription.module.ts";
import { InvoiceModule } from "../../../src/modules/invoices/invoice.module.ts";
import { EventsModule } from "../../../src/modules/events/events.module.ts";
import { FreemiusModule } from "../../../src/modules/freemius/freemius.module.ts";
import { WebhookController } from "../../../src/modules/webhooks/webhook.controller.ts";
import { FreemiusEventWebhookGuard } from "../../../src/modules/webhooks/guards/freemius-event-webhook.guard.ts";
import { MockDatabaseModule } from "./mock-database.module.ts";

@Module({
  imports: [FreemiusModule, MockDatabaseModule],
  controllers: [WebhookController],
  injectables: [FreemiusEventWebhookGuard],
})
class TestWebhookModule {}

@Module({
  imports: [
    HealthModule,
    TestWebhookModule,
    LicenseModule,
    SubscriptionModule,
    InvoiceModule,
    EventsModule,
  ],
})
export class TestAppModule {}
