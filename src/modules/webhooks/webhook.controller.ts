import { Context, Controller, Post, UseGuard } from "@danet/core";
import type { ExecutionContext } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";
import { FREEMIUS_EVENT_KEY, FreemiusWebhookGuard } from "./freemius-webhook.guard.ts";
import type { FreemiusWebhookEvent } from "../../types.ts";

@Controller("webhooks")
export class WebhookController {
  constructor(private readonly service: FreemiusService) {}

  @UseGuard(FreemiusWebhookGuard)
  @Post("freemius")
  async handleFreemiusWebhook(@Context() ctx: ExecutionContext) {
    const event = ctx.get(FREEMIUS_EVENT_KEY) as FreemiusWebhookEvent;

    // Process event types
    const { type, objects } = event;
    const { user, subscription, license, plan } = objects || {};

    if (type === "subscription.activated") {
      console.log(
        `[Webhook] ✅ Subscription activated — user: ${user?.email}, plan: ${plan?.name}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.cancelled") {
      console.log(
        `[Webhook] ❌ Subscription cancelled — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.expired") {
      console.log(
        `[Webhook] ⏰ Subscription expired — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.charged_successfully") {
      console.log(
        `[Webhook] 🔄 Subscription renewed — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.charged_failed") {
      console.warn(
        `[Webhook] ⚠️  Charge failed — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "license.activated") {
      console.log(
        `[Webhook] 🔑 License activated — user: ${user?.email}, key: ${license?.secret_key}`,
      );
    } else if (type === "license.deactivated") {
      console.log(
        `[Webhook] 🔒 License deactivated — user: ${user?.email}, key: ${license?.secret_key}`,
      );
    } else if (type === "license.expired") {
      console.log(
        `[Webhook] ⌛ License expired — user: ${user?.email}, key: ${license?.secret_key}`,
      );
    }

    // Forward to your app (fire-and-forget)
    this.service.forwardEvent(event as any);

    return { received: true };
  }
}
