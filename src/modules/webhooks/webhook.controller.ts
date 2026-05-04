import {
  Context,
  Controller,
  Post,
  UseGuard,
  type ExecutionContext,
} from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";
import {
  FREEMIUS_EVENT_KEY,
  FreemiusWebhookGuard,
} from "./guards/freemius-webhook.guard.ts";
import { WebhookUserGuard, WEBHOOK_USER_ID_KEY } from "./guards/webhook-user.guard.ts";
import { EntitlementsService } from "../database/services/entitlements.service.ts";
import type { FreemiusWebhookEvent, FreemiusUser, FreemiusLicense, FreemiusSubscription, FreemiusPlan } from "../../types.ts";

@Controller("webhooks")
export class WebhookController {
  constructor(
    private readonly service: FreemiusService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  @UseGuard(FreemiusWebhookGuard)
  @UseGuard(WebhookUserGuard)
  @Post("freemius")
  async handleFreemiusWebhook(@Context() ctx: ExecutionContext) {
    const event = ctx.get(FREEMIUS_EVENT_KEY) as FreemiusWebhookEvent;
    const userId = ctx.get(WEBHOOK_USER_ID_KEY) as number;

    const { type, objects } = event;
    const { user, subscription, license, plan } = objects || {};

    switch (type) {
      case "license.created":
      case "license.activated":
        logEvent("✅ License", { type, user: user!, license, subscription, plan });
        await this.entitlementsService.createEntitlement(userId, license!);
        break;

      case "license.updated":
      case "license.deactivated":
      case "license.expired":
        logEvent("🔄 License", { type, user: user!, license, subscription, plan });
        await this.entitlementsService.updateEntitlement(userId, license!);
        break;

      case "subscription.activated":
      case "subscription.charged_successfully":
        logEvent("✅ Subscription", { type, user: user!, license, subscription, plan });
        await this.entitlementsService.updateEntitlement(userId, license!);
        break;

      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.charged_failed":
        logEvent("⚠️ Subscription", { type, user: user!, license, subscription, plan });
        await this.entitlementsService.updateEntitlement(userId, license!);
        break;

      default:
        logEvent("ℹ️ Event", { type, user: user!, license, subscription, plan });
    }

    this.service.forwardEvent(event);

    return { received: true };
  }
}

function logEvent(prefix: string, params: {type: string, user: FreemiusUser, license?: FreemiusLicense, subscription?: FreemiusSubscription, plan?: FreemiusPlan}) {
  console.log(`[Webhook] ${prefix} ${params.type} — user: ${params.user?.email}`);
}

